import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { Keys, TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from( new DynamoDBClient( {} ) )

export const handler: APIGatewayProxyHandler = async ( event ) => {
    const userId = event.requestContext.authorizer?.claims?.sub

    if ( !userId ) {
        return {
            statusCode: 401,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'Unauthorized' } ),
        }
    }

    const body = JSON.parse( event.body ?? '{}' )
    const { destination } = body

    if ( !destination ) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'destination is required' } ),
        }
    }

    try {
        await client.send(
            new UpdateCommand( {
                TableName: TABLE_NAME,
                Key: Keys.userQueueState( userId ),
                UpdateExpression: 'SET #destination = :destination, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#destination': 'destination',
                    '#updatedAt': 'updatedAt',
                },
                ExpressionAttributeValues: {
                    ':destination': destination,
                    ':updatedAt': new Date().toISOString(),
                },
            } )
        )

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'Destination updated', destination } ),
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