import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLE_NAME } from "../shared/tableKeys";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  active: boolean;
}

async function getStopsFromDB(): Promise<Stop[]> {
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
      active: item.active,
    }))
    .sort((a, b) => {
      // maintain route order
      const order = ["MA", "PF", "DPT", "GET", "MG", "BE", "FEA"];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
}

function interpolate(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export const handler = async () => {
  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: "VAN#van-1", SK: "POSITION" },
      }),
    );

    if (!result.Item || !result.Item.isOnline) return;

    const van = result.Item;
    const stops = await getStopsFromDB();

    if (stops.length === 0) return;

    const currentIndex = (van.currentStopIndex as number) % stops.length;
    const nextIndex = (currentIndex + 1) % stops.length;
    const current = stops[currentIndex];
    const next = stops[nextIndex];

    const progress = (van.progress as number ?? 0) + 0.5

    if (progress >= 1) {
      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...van,
            lat: next.lat,
            lng: next.lng,
            currentStopIndex: nextIndex,
            nextStop: stops[(nextIndex + 1) % stops.length].name,
            progress: 0,
            status: "boarding",
            currentStopId: next.id,
            currentStopName: next.name,
            updatedAt: new Date().toISOString(),
          },
        }),
      );
    } else {
      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...van,
            lat: interpolate(current.lat, next.lat, progress),
            lng: interpolate(current.lng, next.lng, progress),
            progress,
            status: "moving",
            updatedAt: new Date().toISOString(),
          },
        }),
      );
    }
  } catch (err) {
    console.error(err);
  }
};
