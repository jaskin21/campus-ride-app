import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.Table

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.table = new dynamodb.Table(this, 'CampusRideTable', {
      tableName: 'campusride-dev',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // GSI — SK-index
    this.table.addGlobalSecondaryIndex({
      indexName: 'SK-index',
      partitionKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    })

    new cdk.CfnOutput(this, 'TableName', { value: this.table.tableName })
  }
}