import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { TABLE_NAME } from "../shared/tableKeys";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  const stopId = event.pathParameters?.stopId;
  if (!stopId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "stopId is required" }),
    };
  }

  const body = JSON.parse(event.body ?? "{}");
  const { lat, lng, name, active } = body;

  try {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (lat !== undefined) {
      updateExpressions.push("#lat = :lat");
      expressionAttributeValues[":lat"] = lat;
      expressionAttributeNames["#lat"] = "lat";
    }
    if (lng !== undefined) {
      updateExpressions.push("#lng = :lng");
      expressionAttributeValues[":lng"] = lng;
      expressionAttributeNames["#lng"] = "lng";
    }
    if (name !== undefined) {
      updateExpressions.push("#name = :name");
      expressionAttributeValues[":name"] = name;
      expressionAttributeNames["#name"] = "name";
    }
    if (active !== undefined) {
      updateExpressions.push("#active = :active");
      expressionAttributeValues[":active"] = active;
      expressionAttributeNames["#active"] = "active";
    }

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();
    expressionAttributeNames["#updatedAt"] = "updatedAt";

    await client.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `STOP#${stopId}`, SK: "METADATA" },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      }),
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Stop updated", stopId }),
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
