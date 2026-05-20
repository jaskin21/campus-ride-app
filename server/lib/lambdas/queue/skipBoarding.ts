import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { Keys, TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from( new DynamoDBClient( {} ) )

export const handler: APIGatewayProxyHandler = async ( event ) => {
  const userId = event.requestContext.authorizer?.claims?.sub

  if ( !userId ) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Unauthorized' } ),
    }
  }

  try {
    const userQueue = await client.send(
      new GetCommand( {
        TableName: TABLE_NAME,
        Key: Keys.userQueueState( userId ),
      } )
    )

    if ( !userQueue.Item ) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify( { message: 'Not in queue' } ),
      }
    }

    const { stopId, destination, queueSK } = userQueue.Item

    // Delete ALL existing queue entries for this user at this stop
    // to prevent duplicates
    const existing = await client.send(
      new QueryCommand( {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `STOP#${stopId}`,
          ':sk': 'QUEUE#',
        },
        FilterExpression: 'userId = :userId',
        ExpressionAttributeNames: undefined,
      } )
    )

    // Delete all existing entries for this user
    await Promise.all(
      ( existing.Items ?? [] ).map( item =>
        client.send(
          new DeleteCommand( {
            TableName: TABLE_NAME,
            Key: { PK: item.PK, SK: item.SK },
          } )
        )
      )
    )

    // Also delete the old queueSK just in case
    await client.send(
      new DeleteCommand( {
        TableName: TABLE_NAME,
        Key: { PK: `STOP#${stopId}`, SK: queueSK },
      } )
    ).catch( () => null )

    // Re-add to front of next van queue with early timestamp
    // Using '0000' prefix to sort to front
    const timestamp = new Date().toISOString()
    const newQueueSK = `QUEUE#0000-${timestamp}#${userId}`

    await client.send(
      new PutCommand( {
        TableName: TABLE_NAME,
        Item: {
          PK: `STOP#${stopId}`,
          SK: newQueueSK,
          userId,
          destination,
          joinedAt: timestamp,
          status: 'skipped',
          isSkipped: true,
        },
      } )
    )

    // Update user queue state
    await client.send(
      new PutCommand( {
        TableName: TABLE_NAME,
        Item: {
          ...Keys.userQueueState( userId ),
          stopId,
          destination,
          queueSK: newQueueSK,
          joinedAt: timestamp,
          status: 'skipped',
        },
      } )
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Skipped — moved to front of next van' } ),
    }
  } catch ( err ) {
    console.error( err )
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Internal server error' } ),
    }
  }
}