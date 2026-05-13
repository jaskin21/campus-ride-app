import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { Keys, TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub

  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Unauthorized' }),
    }
  }

  try {
    // Get user's current queue state
    const existing = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: Keys.userQueueState(userId),
      })
    )

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Not in any queue' }),
      }
    }

    const { stopId, queueSK } = existing.Item

    // Remove from stop queue
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `STOP#${stopId}`, SK: queueSK },
      })
    )

    // Remove user queue state
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: Keys.userQueueState(userId),
      })
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Left queue', stopId }),
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