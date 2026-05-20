import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const cognito = new CognitoIdentityProviderClient( { region: 'ap-southeast-1' } )

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await cognito.send(
      new ListUsersCommand( {
        UserPoolId: process.env.USER_POOL_ID ?? '',
        Limit: 60,
      } )
    )

    const students = ( result.Users ?? [] )
      .filter( user => {
        const email = user.Attributes?.find( a => a.Name === 'email' )?.Value ?? ''
        // Only show umindanao emails — exclude admin accounts
        return email.endsWith( '@umindanao.edu.ph' ) || email.includes( '@campusride' )
      } )
      .map( ( user ) => ( {
        username: user.Username ?? '',
        email: user.Attributes?.find( ( a ) => a.Name === 'email' )?.Value ?? '',
        status: user.UserStatus ?? '',
        createdAt: user.UserCreateDate?.toISOString() ?? '',
      } ) )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify( { students } ),
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