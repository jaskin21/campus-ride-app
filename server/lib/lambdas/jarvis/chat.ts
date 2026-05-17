import Groq from 'groq-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { TABLE_NAME } from '../shared/tableKeys'

const dynamo = DynamoDBDocumentClient.from( new DynamoDBClient( {} ) )
const ssm = new SSMClient( { region: 'ap-southeast-1' } )

let groqClient: Groq | null = null

async function getGroqClient(): Promise<Groq> {
  if ( groqClient ) return groqClient
  const result = await ssm.send(
    new GetParameterCommand( {
      Name: '/campusride/dev/GROQ_API_KEY',
      WithDecryption: true,
    } )
  )
  const apiKey = result.Parameter?.Value ?? ''
  groqClient = new Groq( { apiKey } )
  return groqClient
}

async function getVanContext() {
  try {
    const result = await dynamo.send(
      new GetCommand( {
        TableName: TABLE_NAME,
        Key: { PK: 'VAN#van-1', SK: 'POSITION' },
      } )
    )
    return result.Item ?? null
  } catch {
    return null
  }
}

async function getUserQueue( userId: string ) {
  try {
    const result = await dynamo.send(
      new GetCommand( {
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'QUEUE#ACTIVE' },
      } )
    )
    return result.Item ?? null
  } catch {
    return null
  }
}

async function getStopQueueCount( stopId: string ): Promise<number> {
  try {
    const result = await dynamo.send(
      new QueryCommand( {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `STOP#${stopId}`,
          ':sk': 'QUEUE#',
        },
      } )
    )
    return result.Count ?? 0
  } catch {
    return 0
  }
}

async function getAllStopQueues(): Promise<Record<string, number>> {
  const STOPS = ['MA', 'PF', 'DPT', 'GET', 'MG', 'BE', 'FEA']
  try {
    const counts = await Promise.all(
      STOPS.map( async ( stopId ) => {
        const result = await dynamo.send(
          new QueryCommand( {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
              ':pk': `STOP#${stopId}`,
              ':sk': 'QUEUE#',
            },
          } )
        )
        return { stopId, count: result.Count ?? 0 }
      } )
    )
    return Object.fromEntries( counts.map( c => [c.stopId, c.count] ) )
  } catch {
    return {}
  }
}

const ROUTE_ORDER = [
  { id: 'MA', name: 'MAA Gate' },
  { id: 'PF', name: 'PF' },
  { id: 'DPT', name: 'DPT' },
  { id: 'GET', name: 'GET Building' },
  { id: 'MG', name: 'Main Gate' },
  { id: 'BE', name: 'BE Building' },
  { id: 'FEA', name: 'FEA Building' },
]

function getStopsAheadOfVan( currentStopId: string ): string[] {
  const currentIndex = ROUTE_ORDER.findIndex( s => s.id === currentStopId )
  if ( currentIndex === -1 ) return ROUTE_ORDER.map( s => s.name )
  const ahead = []
  for ( let i = 1; i <= ROUTE_ORDER.length; i++ ) {
    ahead.push( ROUTE_ORDER[( currentIndex + i ) % ROUTE_ORDER.length].name )
  }
  return ahead
}

function getStopsUntil( currentStopId: string, targetStopId: string ): number {
  const currentIndex = ROUTE_ORDER.findIndex( s => s.id === currentStopId )
  const targetIndex = ROUTE_ORDER.findIndex( s => s.id === targetStopId )
  if ( currentIndex === -1 || targetIndex === -1 ) return -1
  if ( targetIndex >= currentIndex ) return targetIndex - currentIndex
  return ROUTE_ORDER.length - currentIndex + targetIndex
}

export const handler: APIGatewayProxyHandler = async ( event ) => {
  const userId = event.requestContext.authorizer?.claims?.sub
  const email = event.requestContext.authorizer?.claims?.email

  if ( !userId ) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Unauthorized' } ),
    }
  }

  const body = JSON.parse( event.body ?? '{}' )
  const { message, history = [] } = body

  if ( !message ) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'message is required' } ),
    }
  }

  try {
    const groq = await getGroqClient()
    const [van, userQueue, allQueues] = await Promise.all( [
      getVanContext(),
      getUserQueue( userId ),
      getAllStopQueues(),
    ] )

    let queueCount = 0
    if ( userQueue?.stopId ) {
      queueCount = await getStopQueueCount( userQueue.stopId )
    }

    const currentStopId = van?.currentStopId as string ?? ''
    const stopsAhead = getStopsAheadOfVan( currentStopId )

    // Calculate stops until student's stop
    let stopsUntilStudent = -1
    if ( userQueue?.stopId && currentStopId ) {
      stopsUntilStudent = getStopsUntil( currentStopId, userQueue.stopId )
    }

    // ETA estimate — 15 seconds travel + 10 seconds boarding per stop
    const etaSeconds = stopsUntilStudent > 0 ? stopsUntilStudent * 25 : 0
    const etaMinutes = Math.ceil( etaSeconds / 60 )

    // All stop queue summary
    const queueSummary = ROUTE_ORDER.map( s =>
      `${s.name}: ${allQueues[s.id] ?? 0} waiting`
    ).join( ', ' )

    const systemPrompt = `You are Jarvis, a friendly and conversational AI campus shuttle assistant for CampusRide at the University of Mindanao. You speak naturally like a helpful friend, not a robot.

PERSONALITY:
- Warm, friendly, and proactive — like Baymax or Iron Man's Jarvis
- Ask follow-up questions naturally to understand the student's situation
- Remember everything said in this conversation
- Suggest alternatives when the van is delayed or unavailable
- Keep responses short — 1-3 sentences max unless giving directions

LIVE VAN DATA:
- Van online: ${van ? ( van.isOnline ? 'Yes' : 'No' ) : 'Unknown'}
- Van current stop: ${van?.currentStopName ?? 'Unknown'}
- Van next stop: ${van?.nextStop ?? 'Unknown'}
- Van status: ${van?.status ?? 'Unknown'} (moving = traveling between stops, boarding = stopped at a stop)
- Van passengers: ${van?.currentPassengers ?? 0}/${van?.capacity ?? 10}
- Stops ahead of van in order: ${stopsAhead.join( ' → ' )}

STUDENT DATA:
- Student email: ${email}
- Student queue: ${userQueue ? `Waiting at ${userQueue.stopId} (position #${userQueue.position ?? '?'}), going to ${userQueue.destination}` : 'Not in any queue'}
- Students waiting at student stop: ${queueCount}
- Estimated van arrival at student stop: ${stopsUntilStudent > 0 ? `~${etaMinutes} minute${etaMinutes > 1 ? 's' : ''} (${stopsUntilStudent} stop${stopsUntilStudent > 1 ? 's' : ''} away)` : stopsUntilStudent === 0 ? 'Van is here now!' : 'Unknown'}

ALL STOP QUEUE COUNTS:
${queueSummary}

CAMPUS ROUTE (loops continuously):
MAA Gate → PF → DPT → GET Building → Main Gate → BE Building → FEA Building → back to MAA Gate

ROUTE KNOWLEDGE:
- Travel time between stops: ~15 seconds (simulation speed)
- Boarding time at each stop: ~10 seconds
- Total loop time: ~175 seconds (~3 minutes)
- Walking between adjacent stops: 3-5 minutes
- The van always follows this exact route in order, never skips stops

HOW TO BEHAVE:
- If student greets you → greet back warmly and ask how you can help
- If student asks about van → give live data + ETA + suggest action
- If van is offline → say so clearly and suggest walking
- If student mentions a building → identify which stop it is and give ETA
- If student seems in a hurry → be direct and decisive
- If ETA is long → suggest walking as alternative
- Ask ONE follow-up question at a time
- Never say "I don't know" — use live data or make a helpful suggestion
- Never repeat yourself — vary responses naturally

BUILDING TO STOP MAPPING:
- Main Gate = main entrance of the university
- MAA Gate = secondary entrance  
- BE Building = College of Engineering building
- FEA Building = College of Architecture building
- DPT = Department building area
- GET Building = College of Technology building
- PF = Open area / covered court

EXAMPLE CONVERSATIONS:
Student: "hi jarvis"
Jarvis: "Hey! I'm Jarvis, your CampusRide assistant 👋 Need a ride or want to check on the van?"

Student: "is the van coming?"
Jarvis: "The van is at ${van?.currentStopName ?? 'Unknown'} heading to ${van?.nextStop ?? 'Unknown'} — it's about ${etaMinutes > 0 ? etaMinutes + ' minute(s) away from your stop' : 'already at your stop!'}. Are you in the queue yet?"

Student: "I'm at MAA Gate going to BE Building"
Jarvis: "Got it! MAA Gate is the van's first stop so you're in a great spot. The van will reach BE Building in about 5 stops. Want me to check the queue count there?"

Student: "how many stops until the van reaches me?"
Jarvis: "The van is ${stopsUntilStudent > 0 ? stopsUntilStudent + ' stop(s) away from you' : 'at your stop right now'}! ${stopsUntilStudent > 2 ? 'You have some time — make sure you\'re in the queue.' : 'Get ready to board!'}"

Remember: be conversational, helpful, and proactive. Always move the conversation forward.`

    const messages = [
      ...history.map( ( h: { role: string; content: string } ) => ( {
        role: h.role as 'user' | 'assistant',
        content: h.content,
      } ) ),
      { role: 'user' as const, content: message },
    ]

    const completion = await groq.chat.completions.create( {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 300,
      temperature: 0.7,
    } )

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't process that."

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { reply } ),
    }
  } catch ( err ) {
    console.error( err )
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Jarvis is unavailable right now' } ),
    }
  }
}