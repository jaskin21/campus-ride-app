import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
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
    const result = await client.send(
      new GetCommand( {
        TableName: TABLE_NAME,
        Key: Keys.userQueueState( userId ),
      } )
    )

    if ( !result.Item ) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify( { isInQueue: false } ),
      }
    }

    const { stopId, destination, joinedAt, queueSK } = result.Item

    // Get all queue entries at this stop sorted by join time
    const queueResult = await client.send(
      new QueryCommand( {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `STOP#${stopId}`,
          ':sk': 'QUEUE#',
        },
      } )
    )

    // Find actual position by sorting items
    const items = ( queueResult.Items ?? [] ).sort( ( a, b ) =>
      a.SK.localeCompare( b.SK )
    )
    const position = items.findIndex( item => item.SK === queueSK ) + 1

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( {
        isInQueue: true,
        stopId,
        destination,
        joinedAt,
        queueSK,
        position: position > 0 ? position : 1,
      } ),
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