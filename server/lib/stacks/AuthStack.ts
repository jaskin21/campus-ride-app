import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ─── User Pool ────────────────────────────────────
    this.userPool = new cognito.UserPool(this, 'CampusRideUserPool', {
      userPoolName: 'campusride-dev-userpool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ─── Groups ───────────────────────────────────────
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admin',
      description: 'System administrators',
    })

    new cognito.CfnUserPoolGroup(this, 'DriverGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Driver',
      description: 'Van drivers',
    })

    new cognito.CfnUserPoolGroup(this, 'StudentGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Student',
      description: 'University students',
    })

    // ─── User Pool Client ─────────────────────────────
    this.userPoolClient = new cognito.UserPoolClient(this, 'CampusRideUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'campusride-dev-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    })

    // ─── Outputs ──────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId })
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId })
  }
}