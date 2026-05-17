import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const cognito = new CognitoIdentityProviderClient( { region: 'ap-southeast-1' } )

export const handler: APIGatewayProxyHandler = async ( event ) => {
    const body = JSON.parse( event.body ?? '{}' )
    const { email, firstName, lastName, password } = body

    if ( !email || !firstName || !lastName || !password ) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'email, firstName, lastName and password are required' } ),
        }
    }

    try {
        // Create user in Cognito
        await cognito.send(
            new AdminCreateUserCommand( {
                UserPoolId: process.env.USER_POOL_ID ?? '',
                Username: email,
                MessageAction: 'SUPPRESS',
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'given_name', Value: firstName },
                    { Name: 'family_name', Value: lastName },
                ],
            } )
        )

        // Set permanent password
        await cognito.send(
            new AdminSetUserPasswordCommand( {
                UserPoolId: process.env.USER_POOL_ID ?? '',
                Username: email,
                Password: password,
                Permanent: true,
            } )
        )

        // Add to Driver group
        await cognito.send(
            new AdminAddUserToGroupCommand( {
                UserPoolId: process.env.USER_POOL_ID ?? '',
                Username: email,
                GroupName: 'Driver',
            } )
        )

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message: 'Driver account created', email } ),
        }
    } catch ( err ) {
        console.error( err )
        const message = err instanceof Error ? err.message : 'Failed to create driver'
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( { message } ),
        }
    }
}