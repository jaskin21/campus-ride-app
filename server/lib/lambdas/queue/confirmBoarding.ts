import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
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

    const { stopId, queueSK } = userQueue.Item

    // Remove from stop queue
    await client.send(
      new DeleteCommand( {
        TableName: TABLE_NAME,
        Key: { PK: `STOP#${stopId}`, SK: queueSK },
      } )
    )

    // Update user state to boarded
    await client.send(
      new UpdateCommand( {
        TableName: TABLE_NAME,
        Key: Keys.userQueueState( userId ),
        UpdateExpression: 'SET #status = :status, #boardedAt = :boardedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#boardedAt': 'boardedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'boarded',
          ':boardedAt': new Date().toISOString(),
        },
      } )
    )

    // Increment van passenger count
    await client.send(
      new UpdateCommand( {
        TableName: TABLE_NAME,
        Key: { PK: 'VAN#van-1', SK: 'POSITION' },
        UpdateExpression: 'SET currentPassengers = if_not_exists(currentPassengers, :zero) + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':zero': 0,
        },
      } )
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Boarded successfully' } ),
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