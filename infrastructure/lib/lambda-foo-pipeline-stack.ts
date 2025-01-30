import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MonorepoLambdaPipelineConstruct } from "./monorepo-lambda-pipeline-construct";
import { ARTIFACT_BUCKET_NAME } from "./artifact-bucket-stack";

export class LambdaFooPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new MonorepoLambdaPipelineConstruct(this, "LambdaFooPipeline", {
      repo: "aws-monorepo-codepipeline-sample",
      branch: "main",
      projectName: "lambda-project-foo",
      artifactBucketName: ARTIFACT_BUCKET_NAME,
    });
  }
}
