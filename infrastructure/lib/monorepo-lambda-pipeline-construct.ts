import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  aws_s3,
} from "aws-cdk-lib";
import { ProviderType } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { ARTIFACT_BUCKET_NAME } from "./artifact-bucket-stack";

const PROJECTS_DIR = "projects";

interface MonorepoLambdaPipelineConstructProps {
  repo: string;
  branch: string;
  projectName: string;
  artifactBucketName: string;
}

export class MonorepoLambdaPipelineConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: MonorepoLambdaPipelineConstructProps
  ) {
    super(scope, id);

    const { repo, branch, projectName, artifactBucketName } = props;
    const artifactBucket = aws_s3.Bucket.fromBucketName(
      this,
      "Bucket",
      artifactBucketName
    );

    const codeBuild = new aws_codebuild.PipelineProject(this, "Project", {
      environment: {
        privileged: true,
        buildImage: aws_codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
      },
      environmentVariables: {
        ARTIFACT_S3_BUCKET_NAME: {
          value: ARTIFACT_BUCKET_NAME,
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
      },
      buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
        `projects/${projectName}/buildspec.yml`
      ),
    });

    const sourceOutput = new aws_codepipeline.Artifact();
    const buildOutput = new aws_codepipeline.Artifact();

    const connectionArn = this.node.tryGetContext("connectionArn");
    const sourceAction =
      new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "Source",
        owner: "Tomoaki-Moriya",
        repo: repo,
        branch: branch,
        output: sourceOutput,
        runOrder: 1,
        connectionArn,
      });

    new aws_codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: `${projectName}-pipeline`,
      role: new aws_iam.Role(this, "Role", {
        assumedBy: new aws_iam.ServicePrincipal("codepipeline.amazonaws.com"),
        inlinePolicies: {
          LambdaCodePipelinePolicy: new aws_iam.PolicyDocument({
            statements: [
              new aws_iam.PolicyStatement({
                actions: ["codestar-connections:*"],
                resources: [connectionArn],
              }),
              new aws_iam.PolicyStatement({
                actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
                resources: [
                  `arn:aws:s3:::${artifactBucket.bucketName}/*`,
                  `arn:aws:s3:::${artifactBucket.bucketName}`,
                ],
                effect: aws_iam.Effect.ALLOW,
              }),
              new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: [
                  "iam:GetRole",
                  "iam:CreateRole",
                  "iam:TagRole",
                  "iam:AttachRolePolicy",
                  "iam:PassRole",
                ],
                resources: ["*"],
              }),
              new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: [
                  "lambda:GetFunction",
                  "lambda:GetFunctionUrlConfig",
                  "lambda:CreateFunction",
                  "lambda:CreateFunctionUrlConfig",
                  "lambda:AddPermission",
                  "lambda:TagResource",
                ],
                resources: ["*"],
              }),
            ],
          }),
        },
      }),
      artifactBucket,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: "Build",
              project: codeBuild,
              input: sourceOutput,
              outputs: [buildOutput],
              runOrder: 2,
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new aws_codepipeline_actions.CloudFormationCreateReplaceChangeSetAction(
              {
                actionName: "create-deploy",
                stackName: projectName,
                changeSetName: "deploy-change-set",
                runOrder: 3,
                templatePath: buildOutput.atPath("build.yml"),
                adminPermissions: true,
              }
            ),
            new aws_codepipeline_actions.CloudFormationExecuteChangeSetAction({
              actionName: "execute-deploy",
              stackName: projectName,
              changeSetName: "deploy-change-set",
              runOrder: 4,
            }),
          ],
        },
      ],
      triggers: [
        {
          providerType: ProviderType.CODE_STAR_SOURCE_CONNECTION,
          gitConfiguration: {
            sourceAction,
            pullRequestFilter: [
              {
                filePathsIncludes: [`${PROJECTS_DIR}/${projectName}/*`],
                branchesIncludes: [branch],
              },
            ],
          },
        },
      ],
    });
  }
}
