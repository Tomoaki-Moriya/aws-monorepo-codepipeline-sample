#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaFooPipelineStack } from "../lib/lambda-foo-pipeline-stack";
import { ArtifactBucketStack } from "../lib/artifact-bucket-stack";
import { LambdaFooBarPipelineStack } from "../lib/lambda-foobar-pipeline-stack";

const app = new cdk.App();
new ArtifactBucketStack(app, "ArtifactBucketStack", {});
new LambdaFooPipelineStack(app, "LambdaFooPipelineStack", {});
new LambdaFooBarPipelineStack(app, "LambdaFooBarPipelineStack", {});
