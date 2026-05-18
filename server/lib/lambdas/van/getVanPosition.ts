import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from( new DynamoDBClient( {} ) )

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const [vanResult, boardedResult] = await Promise.all( [
      client.send(
        new GetCommand( {
          TableName: TABLE_NAME,
          Key: { PK: 'VAN#van-1', SK: 'POSITION' },
        } )
      ),
      client.send(
        new ScanCommand( {
          TableName: TABLE_NAME,
          FilterExpression: 'SK = :sk AND #status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':sk': 'QUEUE#ACTIVE',
            ':status': 'boarded',
          },
        } )
      ),
    ] )

    const boardedPassengers = boardedResult.Items ?? []

    if ( !vanResult.Item ) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify( {
          vanId: 'van-1',
          lat: 7.0625,
          lng: 125.5975,
          isOnline: false,
          nextStop: 'MAA Gate',
          currentPassengers: 0,
          capacity: 10,
          driverName: 'Demo Driver',
          passengers: [],
        } ),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( {
        ...vanResult.Item,
        currentPassengers: boardedPassengers.length,
        boardingUntil: vanResult.Item.boardingUntil,
        passengers: boardedPassengers.map( p => ( {
          userId: p.PK.replace( 'USER#', '' ),
          destination: p.destination,
          boardedAt: p.boardedAt,
        } ) ),
      } ),
    }
  } catch ( err ) {
    console.error( err )
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { message: 'Internal server error' } ),
    }
  }
}