import {
  trace,
  SpanStatusCode,
  diag,
  DiagLogLevel,
  DiagConsoleLogger,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { detectResources } from "@opentelemetry/resources";
import { awsLambdaDetector } from "@opentelemetry/resource-detector-aws";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";

// Enable debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Detect resources including AWS Lambda environment
const resources = detectResources({
  detectors: [awsLambdaDetector],
});

// Initialize OpenTelemetry with proper resource detection
const provider = new NodeTracerProvider({
  resource: resources,
  spanProcessors: [
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: "https://api.honeycomb.io/v1/traces",
        headers: {
          "x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
        },
      }),
    ),
  ],
});

// Register the provider
provider.register();

// Get a tracer
const tracer = trace.getTracer("lambda-handler");

// Lambda handler function
export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  // Use the tracer to create a span
  return tracer.startActiveSpan("lambda_handler", async (span) => {
    try {
      // Add important context information
      span.setAttribute("aws.requestId", context.awsRequestId);
      span.setAttribute("lambda.name", context.functionName);

      // Your Lambda business logic
      const response: APIGatewayProxyResultV2 = {
        statusCode: 200,
        body: JSON.stringify({
          message: "Hello from Lambda!",
          requestId: context.awsRequestId,
        }),
      };

      // End the span
      span.end();

      // Force export before Lambda completes
      await provider.forceFlush();

      return response;
    } catch (error) {
      // Record the error and end the span
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();

      // Force export before Lambda completes
      await provider.forceFlush();

      // Return an error response
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  });
};
