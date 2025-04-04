import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  Architecture,
  Runtime,
  LoggingFormat,
  Tracing,
} from "aws-cdk-lib/aws-lambda";
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
      tracing: Tracing.ACTIVE,
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        HONEYCOMB_API_KEY: env.HONEYCOMB_API_KEY,
        // This will be used by the proper service name detector from @opentelemetry/resource-detector-aws
        OTEL_SERVICE_NAME: "otel-v2-lambda-service",
        OTEL_LOG_LEVEL: "debug",
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: [],
        nodeModules: [
          "@opentelemetry/api",
          "@opentelemetry/exporter-trace-otlp-http",
          "@opentelemetry/sdk-trace-base",
          "@opentelemetry/sdk-trace-node",
          "@opentelemetry/resources",
          "@opentelemetry/resource-detector-aws",
        ],
      },
    });
  }
}
