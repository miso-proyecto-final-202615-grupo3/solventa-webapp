#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HostingStack } from '../lib/hosting-stack';

const app = new cdk.App();

new HostingStack(app, 'SolventaWebappHosting', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  githubRepo: 'miso-proyecto-final-202615-grupo3/solventa-webapp',
  // true la primera vez que se deployea en la cuenta; false si ya existe
  // un OIDC provider de GitHub (falla el deploy si se crea uno duplicado).
  createGithubOidcProvider: true,
});
