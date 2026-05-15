import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";
import * as ssm from "aws-cdk-lib/aws-ssm";

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

    // ─── CORS Gateway Responses ───────────────────────
    api.addGatewayResponse("Default4xx", {
      type: apigw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
      },
    });

    api.addGatewayResponse("Default5xx", {
      type: apigw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
      },
    });

    // ─── Lambda defaults ──────────────────────────────
    const lambdaEnv = { TABLE_NAME: table.tableName };

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

    const getUserQueueFn = new NodejsFunction(this, "GetUserQueueFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/getUserQueue.ts"),
      handler: "handler",
    });

    const confirmBoardingFn = new NodejsFunction(this, "ConfirmBoardingFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/confirmBoarding.ts"),
      handler: "handler",
    });

    const skipBoardingFn = new NodejsFunction(this, "SkipBoardingFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/queue/skipBoarding.ts"),
      handler: "handler",
    });

    // ─── Van Lambdas ──────────────────────────────────
    const getVanPositionFn = new NodejsFunction(this, "GetVanPositionFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/van/getVanPosition.ts"),
      handler: "handler",
    });

    const startSimulationFn = new NodejsFunction(this, "StartSimulationFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/van/startSimulation.ts"),
      handler: "handler",
    });

    const toggleOnlineFn = new NodejsFunction(this, "ToggleOnlineFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/van/toggleOnline.ts"),
      handler: "handler",
    });

    const updateVanPositionFn = new NodejsFunction(
      this,
      "UpdateVanPositionFn",
      {
        ...lambdaDefaults,
        entry: path.join(__dirname, "../lambdas/van/updateVanPosition.ts"),
        handler: "handler",
      },
    );

    // Get Groq API key from SSM
    const groqApiKey = ssm.StringParameter.valueFromLookup(
      this,
      "/campusride/dev/GROQ_API_KEY",
    );

    const jarvisChatFn = new NodejsFunction(this, "JarvisChatFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/jarvis/chat.ts"),
      handler: "handler",
      environment: {
        ...lambdaEnv,
        GROQ_API_KEY: groqApiKey,
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
        forceDockerBundling: false,
        nodeModules: ["groq-sdk"],
      },
    });

    // ─── Stop Lambdas ─────────────────────────────────
    const getStopsFn = new NodejsFunction(this, "GetStopsFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/stops/getStops.ts"),
      handler: "handler",
    });

    const updateStopFn = new NodejsFunction(this, "UpdateStopFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/stops/updateStop.ts"),
      handler: "handler",
    });

    const seedStopsFn = new NodejsFunction(this, "SeedStopsFn", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambdas/stops/seedStops.ts"),
      handler: "handler",
    });

    // ─── Grant DynamoDB access ────────────────────────
    table.grantReadWriteData(joinQueueFn);
    table.grantReadWriteData(leaveQueueFn);
    table.grantReadData(getQueueFn);
    table.grantReadData(getUserQueueFn);
    table.grantReadWriteData(confirmBoardingFn);
    table.grantReadWriteData(skipBoardingFn);
    table.grantReadData(getVanPositionFn);
    table.grantReadWriteData(startSimulationFn);
    table.grantReadWriteData(updateVanPositionFn);
    table.grantReadData(getStopsFn);
    table.grantReadWriteData(updateStopFn);
    table.grantReadWriteData(seedStopsFn);
    table.grantReadData(jarvisChatFn);

    // ─── EventBridge — van simulation ticker ──────────
    const vanTickRule = new events.Rule(this, "VanTickRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: "Triggers van position update every minute",
    });
    vanTickRule.addTarget(new targets.LambdaFunction(updateVanPositionFn));

    // ─── Queue Routes ─────────────────────────────────
    const queueResource = api.root.addResource("queue");

    queueResource
      .addResource("join")
      .addMethod("POST", new apigw.LambdaIntegration(joinQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    queueResource
      .addResource("leave")
      .addMethod("POST", new apigw.LambdaIntegration(leaveQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    queueResource
      .addResource("{stopId}")
      .addMethod("GET", new apigw.LambdaIntegration(getQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    const userResource = queueResource.addResource("user");
    userResource
      .addResource("active")
      .addMethod("GET", new apigw.LambdaIntegration(getUserQueueFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    queueResource
      .addResource("board")
      .addMethod("POST", new apigw.LambdaIntegration(confirmBoardingFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    queueResource
      .addResource("skip")
      .addMethod("POST", new apigw.LambdaIntegration(skipBoardingFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    // ─── Van Routes ───────────────────────────────────
    const vanResource = api.root.addResource("van");

    vanResource
      .addResource("position")
      .addMethod("GET", new apigw.LambdaIntegration(getVanPositionFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    vanResource
      .addResource("simulation")
      .addMethod("POST", new apigw.LambdaIntegration(startSimulationFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    vanResource
      .addResource("toggle")
      .addMethod("POST", new apigw.LambdaIntegration(toggleOnlineFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    const jarvisResource = api.root.addResource("jarvis");
    jarvisResource
      .addResource("chat")
      .addMethod("POST", new apigw.LambdaIntegration(jarvisChatFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    // ─── Stop Routes ──────────────────────────────────
    const stopsResource = api.root.addResource("stops");

    stopsResource.addMethod("GET", new apigw.LambdaIntegration(getStopsFn), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    stopsResource
      .addResource("seed")
      .addMethod("POST", new apigw.LambdaIntegration(seedStopsFn), {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });

    const stopResource = stopsResource.addResource("{stopId}");
    stopResource.addMethod("PUT", new apigw.LambdaIntegration(updateStopFn), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    // ─── Output API URL ───────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
