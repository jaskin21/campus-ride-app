#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AuthStack } from '../lib/stacks/AuthStack'
import { DataStack } from '../lib/stacks/DataStack'
import { ApiStack } from '../lib/stacks/ApiStack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-southeast-1',
}

const dataStack = new DataStack(app, 'CampusRide-DataStack-dev', { env })
const authStack = new AuthStack(app, 'CampusRide-AuthStack-dev', { env })

const _api = new ApiStack(app, 'CampusRide-ApiStack-dev', {
  env,
  table: dataStack.table,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
})