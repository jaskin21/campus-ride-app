import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
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

    try {
        // Delete user queue state
        await client.send(
            new DeleteCommand( {
                TableName: TABLE_NAME,
                Key: Keys.userQueueState( userId ),
            } )
        )

        // Decrement van passenger count
        await client.send(
            new UpdateCommand( {
                TableName: TABLE_NAME,
                Key: { PK: 'VAN#van-1', SK: 'POSITION' },
                UpdateExpression: 'SET currentPassengers = if_not_exists(currentPassengers, :zero) - :dec',
                ExpressionAttributeValues: {
                    ':dec': 1,
                    ':zero': 0,
                },
            } )
        )

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'Offboarded successfully' } ),
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