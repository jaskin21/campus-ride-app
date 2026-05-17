import Groq from 'groq-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
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
    const [van, userQueue] = await Promise.all( [
      getVanContext(),
      getUserQueue( userId ),
    ] )

    let queueCount = 0
    if ( userQueue?.stopId ) {
      queueCount = await getStopQueueCount( userQueue.stopId )
    }

    const systemPrompt = `You are Jarvis, a friendly and conversational AI campus shuttle assistant for CampusRide at the University of Mindanao. You speak naturally like a helpful friend, not a robot.

PERSONALITY:
- Warm, friendly, and proactive — like Baymax or Iron Man's Jarvis
- Ask follow-up questions naturally to understand the student's situation
- Remember everything said in this conversation
- Suggest alternatives when the van is delayed or unavailable
- Keep responses short — 1-3 sentences max unless giving directions

LIVE DATA YOU KNOW:
- Van status: ${van ? ( van.isOnline ? 'Online' : 'Offline' ) : 'Unknown'}
- Van current stop: ${van?.currentStopName ?? 'Unknown'}
- Van next stop: ${van?.nextStop ?? 'Unknown'}
- Van passengers: ${van?.currentPassengers ?? 0}/${van?.capacity ?? 10}
- Van status detail: ${van?.status ?? 'Unknown'}
- Student queue: ${userQueue ? `Waiting at ${userQueue.stopId}, going to ${userQueue.destination}` : 'Not in any queue'}
- Students at their stop: ${queueCount}

HOW TO BEHAVE:
- If student greets you → greet back warmly and ask how you can help
- If student asks about van → give live data + suggest action
- If van is far or offline → suggest walking or waiting, ask about their class schedule
- If student mentions a building or destination → give ETA and walking advice
- If student seems in a hurry → be direct and decisive
- Ask ONE follow-up question at a time — don't bombard
- Never say "I don't know" — use live data or make a helpful suggestion
- Never repeat yourself — vary your responses naturally

CAMPUS KNOWLEDGE:
- Main Gate (MG) → MAA Gate (MA) → BE Building → FEA Building → DPT → GET Building → PF → loops back
- Walking between stops takes about 3-5 minutes
- Van capacity is ${van?.capacity ?? 10} passengers
- Van stops for about 10 seconds at each stop

EXAMPLE CONVERSATIONS:
Student: "hi jarvis"
Jarvis: "Hey! I'm Jarvis, your CampusRide assistant 👋 Need a ride or want to check on the van?"

Student: "is the van coming?"
Jarvis: "The van is currently at ${van?.currentStopName ?? 'unknown'} heading to ${van?.nextStop ?? 'unknown'}. Where are you headed?"

Student: "I'm at MAA Gate going to PF"
Jarvis: "Got it! The van should reach MAA Gate in about 2 stops. Want me to add you to the queue, or are you already in line?"

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