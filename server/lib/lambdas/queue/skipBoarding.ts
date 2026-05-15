import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
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
    const userQueue = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: Keys.userQueueState(userId),
      })
    )

    if (!userQueue.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Not in queue' }),
      }
    }

    const { stopId, destination, queueSK } = userQueue.Item

    // Remove old queue entry
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `STOP#${stopId}`, SK: queueSK },
      })
    )

    // Re-add to front of next van queue with new timestamp
    const timestamp = new Date().toISOString()
    const newQueueSK = `QUEUE#SKIP#${timestamp}#${userId}`

    await client.send(
      new PutCommand({
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
      })
    )

    // Update user queue state
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.userQueueState(userId),
          stopId,
          destination,
          queueSK: newQueueSK,
          joinedAt: timestamp,
          status: 'skipped',
        },
      })
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Skipped — moved to front of next van' }),
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