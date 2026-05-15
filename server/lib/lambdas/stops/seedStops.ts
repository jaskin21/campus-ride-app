import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { TABLE_NAME } from "../shared/tableKeys";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const STOPS = [
  { id: "MG", name: "Main Gate", shortName: "MG", lat: 7.0609, lng: 125.5989 },
  { id: "MA", name: "MAA Gate", shortName: "MA", lat: 7.0625, lng: 125.5975 },
  { id: "BE", name: "BE Building", shortName: "BE", lat: 7.064, lng: 125.596 },
  {
    id: "FEA",
    name: "FEA Building",
    shortName: "FEA",
    lat: 7.0652,
    lng: 125.5948,
  },
  { id: "DPT", name: "DPT", shortName: "DPT", lat: 7.0638, lng: 125.5935 },
  {
    id: "GET",
    name: "GET Building",
    shortName: "GET",
    lat: 7.062,
    lng: 125.5922,
  },
  { id: "PF", name: "PF", shortName: "PF", lat: 7.0605, lng: 125.594 },
];

export const handler: APIGatewayProxyHandler = async () => {
  try {
    await Promise.all(
      STOPS.map((stop) =>
        client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `STOP#${stop.id}`,
              SK: "METADATA",
              stopId: stop.id,
              name: stop.name,
              shortName: stop.shortName,
              lat: stop.lat,
              lng: stop.lng,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        ),
      ),
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Stops seeded successfully",
        count: STOPS.length,
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
