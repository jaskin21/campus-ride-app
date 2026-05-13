import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { Keys, TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub
  const email = event.requestContext.authorizer?.claims?.email

  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Unauthorized' }),
    }
  }

  const body = JSON.parse(event.body ?? '{}')
  const { stopId, destination } = body

  if (!stopId || !destination) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'stopId and destination are required' }),
    }
  }

  try {
    // Check if user is already in a queue
    const existing = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: Keys.userQueueState(userId),
      })
    )

    // If already in a queue at a different stop — remove old entry
    if (existing.Item) {
      const oldStopId = existing.Item.stopId
      const oldSK = existing.Item.queueSK

      if (oldStopId !== stopId) {
        await client.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `STOP#${oldStopId}`, SK: oldSK },
          })
        )
      } else {
        return {
          statusCode: 409,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'Already in queue at this stop' }),
        }
      }
    }

    const timestamp = new Date().toISOString()
    const queueSK = `QUEUE#${timestamp}#${userId}`

    // Add to stop queue
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.stopQueue(stopId, timestamp, userId),
          userId,
          email,
          destination,
          joinedAt: timestamp,
          status: 'waiting',
        },
      })
    )

    // Save user queue state
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.userQueueState(userId),
          stopId,
          destination,
          queueSK,
          joinedAt: timestamp,
        },
      })
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'Joined queue',
        stopId,
        destination,
        joinedAt: timestamp,
      }),
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