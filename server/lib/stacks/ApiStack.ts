import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table, userPool } = props;

    // ─── Cognito Authorizer ───────────────────────────
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "CampusRideAuthorizer",
      {
        cognitoUserPools: [userPool],
      },
    );

    // ─── API Gateway ──────────────────────────────────
    const api = new apigw.RestApi(this, "CampusRideApi", {
      restApiName: "campusride-dev-api",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // ─── Lambda env ───────────────────────────────────
    const lambdaEnv = {
      TABLE_NAME: table.tableName,
    };

    // ─── Lambda defaults ──────────────────────────────
    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: lambdaEnv,
      bundling: {
        externalModules: ["@aws-sdk/*"],
        forceDockerBundling: false,
      },
    };

    // ─── Queue Lambdas ────────────────────────────────
    const joinQueueFn = new NodejsFunction(this, "JoinQueueFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/joinQueue.ts"),
      handler: "handler",
    });

    const leaveQueueFn = new NodejsFunction(this, "LeaveQueueFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/leaveQueue.ts"),
      handler: "handler",
    });

    const getQueueFn = new NodejsFunction(this, "GetQueueFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/getQueue.ts"),
      handler: "handler",
    });

    // ─── Grant DynamoDB access ────────────────────────
    table.grantReadWriteData(joinQueueFn);
    table.grantReadWriteData(leaveQueueFn);
    table.grantReadData(getQueueFn);

    // ─── API Routes ───────────────────────────────────
    const queueResource = api.root.addResource("queue");

    // POST /queue/join
    queueResource
      .addResource("join")
      .addMethod("POST", new apigw.LambdaIntegration(joinQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    // POST /queue/leave
    queueResource
      .addResource("leave")
      .addMethod("POST", new apigw.LambdaIntegration(leaveQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    // GET /queue/{stopId}
    queueResource
      .addResource("{stopId}")
      .addMethod("GET", new apigw.LambdaIntegration(getQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    // ─── Output API URL ───────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
