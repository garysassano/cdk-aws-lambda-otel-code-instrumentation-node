import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Architecture, Runtime, LoggingFormat } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { validateEnv } from "../utils/validate-env";

const env = validateEnv(["HONEYCOMB_API_KEY"]);

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // OpenTelemetry SDK v2 Lambda function
    new NodejsFunction(this, "OtelV2Lambda", {
      functionName: "otel-v2-lambda",
      entry: join(__dirname, "../functions/hello", "index.ts"),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      memorySize: 512,
      loggingFormat: LoggingFormat.JSON,
      environment: {
        HONEYCOMB_API_KEY: env.HONEYCOMB_API_KEY,
        OTEL_SERVICE_NAME: "otel-v2-lambda-service",
      },
      bundling: {
        minify: true,
        sourceMap: true,
        nodeModules: [
          "@opentelemetry/api",
          "@opentelemetry/exporter-trace-otlp-http",
          "@opentelemetry/sdk-trace-base",
          "@opentelemetry/sdk-trace-node",
        ],
      },
    });
  }
}
