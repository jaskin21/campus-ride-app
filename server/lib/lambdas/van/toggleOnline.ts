import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { TABLE_NAME } from "../shared/tableKeys";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body ?? "{}");
  const { isOnline } = body;

  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: "VAN#van-1", SK: "POSITION" },
      }),
    );

    const existing = result.Item ?? {
      PK: "VAN#van-1",
      SK: "POSITION",
      vanId: "van-1",
      lat: 7.0625,
      lng: 125.5975,
      currentPassengers: 0,
      capacity: 10,
      driverName: "Demo Driver",
      nextStop: "",
      progress: 0,
      currentStopIndex: 0,
    };

    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...existing,
          isOnline,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: isOnline ? "Driver is online" : "Driver is offline",
        isOnline,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
