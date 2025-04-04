import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Architecture, LoggingFormat, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { validateEnv } from "../utils/validate-env";

const env = validateEnv(["HONEYCOMB_API_KEY"]);

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new NodejsFunction(this, "OtelHelloLambda", {
      functionName: "otel-hello-lambda",
      entry: join(__dirname, "../functions/hello", "index.ts"),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(1),
      memorySize: 1024,
      loggingFormat: LoggingFormat.JSON,
      environment: {
        // OTel SDK
        HONEYCOMB_API_KEY: env.HONEYCOMB_API_KEY,
        OTEL_SERVICE_NAME: "otel-hello-lambda",
      },
    });
  }
}
