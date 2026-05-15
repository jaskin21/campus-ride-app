import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'VAN#van-1', SK: 'POSITION' },
      })
    )

    if (!result.Item) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          vanId: 'van-1',
          lat: 7.0609,
          lng: 125.5989,
          isOnline: false,
          nextStop: 'Main Gate',
          currentPassengers: 0,
          capacity: 10,
          driverName: 'Demo Driver',
        }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result.Item),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}