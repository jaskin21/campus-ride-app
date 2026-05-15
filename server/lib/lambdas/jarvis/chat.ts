import Groq from "groq-sdk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { TABLE_NAME } from "../shared/tableKeys";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getVanContext() {
  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: "VAN#van-1", SK: "POSITION" },
      }),
    );
    return result.Item ?? null;
  } catch {
    return null;
  }
}

async function getUserQueue(userId: string) {
  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "QUEUE#ACTIVE" },
      }),
    );
    return result.Item ?? null;
  } catch {
    return null;
  }
}

async function getStopQueueCount(stopId: string): Promise<number> {
  try {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `STOP#${stopId}`,
          ":sk": "QUEUE#",
        },
      }),
    );
    return result.Count ?? 0;
  } catch {
    return 0;
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const email = event.requestContext.authorizer?.claims?.email;

  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const body = JSON.parse(event.body ?? "{}");
  const { message, history = [] } = body;

  if (!message) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "message is required" }),
    };
  }

  try {
    // Gather live context
    const [van, userQueue] = await Promise.all([
      getVanContext(),
      getUserQueue(userId),
    ]);

    let queueCount = 0;
    if (userQueue?.stopId) {
      queueCount = await getStopQueueCount(userQueue.stopId);
    }

    // Build system context
    const systemPrompt = `You are Jarvis, a smart and friendly AI assistant for CampusRide — a university shuttle tracking and queue system at the University of Mindanao.

You help students with:
- Van arrival times and ETAs
- Queue positions and counts
- Campus directions and building locations
- Destination changes while riding

Current live data:
- Student email: ${email}
- Van status: ${van ? (van.isOnline ? "Online and moving" : "Offline") : "Unknown"}
- Van next stop: ${van?.nextStop ?? "Unknown"}
- Van current stop: ${van?.currentStopName ?? "Unknown"}
- Van passengers: ${van?.currentPassengers ?? 0}/${van?.capacity ?? 10}
- Student queue: ${userQueue ? `In queue at ${userQueue.stopId}, going to ${userQueue.destination}, joined at ${userQueue.joinedAt}` : "Not in any queue"}
- Students waiting at their stop: ${queueCount}

Rules:
- Be concise and friendly
- Use live data when answering questions
- Suggest walking if van ETA is too long
- Warn once about class conflicts if mentioned
- Never make up data not provided above
- Keep responses under 3 sentences unless directions are needed`;

    // Build message history
    const messages = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "Sorry, I couldn't process that.";

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Jarvis is unavailable right now" }),
    };
  }
};
