import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  Architecture,
  LayerVersion,
  LoggingFormat,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { validateEnv } from "../utils/validate-env";

const env = validateEnv(["HONEYCOMB_API_KEY"]);

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const adotNodeLayer = LayerVersion.fromLayerVersionArn(
      this,
      "AdotNodeLayer",
      "arn:aws:lambda:eu-central-1:901920570463:layer:aws-otel-nodejs-arm64-ver-1-30-1:1",
    );

    new NodejsFunction(this, "AdotHelloLambda", {
      functionName: "adot-hello-lambda",
      entry: join(__dirname, "../functions/hello", "index.ts"),
      layers: [adotNodeLayer],
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(1),
      memorySize: 1024,
      loggingFormat: LoggingFormat.JSON,
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
        // OTel SDK
        OTEL_SERVICE_NAME: "adot-hello-lambda",
        OTEL_PROPAGATORS: "tracecontext",
        // OTel Collector
        OPENTELEMETRY_COLLECTOR_CONFIG_URI:
          "file:/var/task/collector-confmap.yml",
        HONEYCOMB_API_KEY: env.HONEYCOMB_API_KEY,
      },
      bundling: {
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cp ${inputDir}/src/otel/collector-confmap.yml ${outputDir}`,
            ];
          },
          afterBundling() {
            return [];
          },
          beforeInstall() {
            return [];
          },
        },
      },
    });
  }
}
