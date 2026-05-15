import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { TABLE_NAME } from "../shared/tableKeys";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ROUTE_ORDER = ["MA", "PF", "DPT", "GET", "MG", "BE", "FEA"];

async function getStopsFromDB() {
  const result = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk AND begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
        ":pk": "STOP#",
      },
    }),
  );

  return (result.Items ?? [])
    .filter((item) => item.active)
    .map((item) => ({
      id: item.stopId,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
    }))
    .sort((a, b) => ROUTE_ORDER.indexOf(a.id) - ROUTE_ORDER.indexOf(b.id));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body ?? "{}");
  const action = body.action as string;

  try {
    if (action === "start") {
      const stops = await getStopsFromDB();
      if (stops.length === 0) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            message: "No active stops found — seed stops first",
          }),
        };
      }

      const firstStop = stops[0];
      const secondStop = stops[1];

      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: "VAN#van-1",
            SK: "POSITION",
            vanId: "van-1",
            lat: firstStop.lat,
            lng: firstStop.lng,
            isOnline: true,
            currentStopIndex: 0,
            nextStop: secondStop?.name ?? "",
            currentStopId: firstStop.id,
            currentStopName: firstStop.name,
            currentPassengers: 0,
            capacity: 10,
            driverName: "Demo Driver",
            status: "boarding",
            progress: 0,
            updatedAt: new Date().toISOString(),
          },
        }),
      );

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "Simulation started",
          startStop: firstStop.name,
        }),
      };
    }

    if (action === "stop") {
      // Stop van
      const vanResult = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "PK = :pk AND SK = :sk",
          ExpressionAttributeValues: {
            ":pk": "VAN#van-1",
            ":sk": "POSITION",
          },
        }),
      );

      if (vanResult.Items?.[0]) {
        await client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...vanResult.Items[0],
              isOnline: false,
              updatedAt: new Date().toISOString(),
            },
          }),
        );
      }

      // Clear all queue entries
      const queueResult = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":sk": "QUEUE#",
          },
        }),
      );

      if (queueResult.Items && queueResult.Items.length > 0) {
        await Promise.all(
          queueResult.Items.map((item) =>
            client.send(
              new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK },
              }),
            ),
          ),
        );
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "Simulation stopped and queues cleared",
        }),
      };
    }

    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Invalid action" }),
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
