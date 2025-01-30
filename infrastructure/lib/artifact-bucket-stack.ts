import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export const ARTIFACT_BUCKET_NAME = "monorepo-codepipeline-sample-bucket";

export class ArtifactBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new Bucket(this, "ArtifactBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      bucketName: ARTIFACT_BUCKET_NAME,
    });
  }
}
