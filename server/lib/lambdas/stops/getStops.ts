import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :sk AND begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
          ':pk': 'STOP#',
        },
      })
    )

    const stops = (result.Items ?? []).map((item) => ({
      id: item.stopId,
      name: item.name,
      shortName: item.shortName,
      lat: item.lat,
      lng: item.lng,
      active: item.active,
      updatedAt: item.updatedAt,
    }))

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ stops }),
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