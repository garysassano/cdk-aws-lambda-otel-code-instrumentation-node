import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { awsLambdaDetector } from "@opentelemetry/resource-detector-aws";
import { detectResources, envDetector } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  ReadableSpan,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";

// Custom console exporter with JSON format
class CustomConsoleSpanExporter extends ConsoleSpanExporter {
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    for (const span of spans) {
      const spanJson = {
        name: span.name,
        kind: span.kind,
        spanId: span.spanContext().spanId,
        traceId: span.spanContext().traceId,
        parentSpanId: span.parentSpanContext?.spanId,
        startTime: span.startTime,
        endTime: span.endTime,
        status: span.status,
        attributes: span.attributes,
        events: span.events,
        resource: span.resource.attributes,
        instrumentationScope: span.instrumentationScope,
      };

      console.log(spanJson);
    }
    resultCallback({ code: ExportResultCode.SUCCESS });
  }
}

// Enable debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Initialize OpenTelemetry with proper resource detection
const provider = new NodeTracerProvider({
  resource: detectResources({
    detectors: [awsLambdaDetector, envDetector],
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: "https://api.honeycomb.io/v1/traces",
        headers: {
          "x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
        },
      }),
    ),
    new SimpleSpanProcessor(new CustomConsoleSpanExporter()),
  ],
});

// Register the provider
provider.register();

// Get a tracer
const tracer = trace.getTracer("lambda-tracer");

// Lambda handler function
export const handler = async (
  _event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  // Use the tracer to create a span
  return tracer.startActiveSpan("lambda-handler", async (span) => {
    try {
      // Add Lambda context to span attributes
      span.setAttribute("aws.lambda.invoked_arn", context.invokedFunctionArn);
      span.setAttribute("faas.invocation_id", context.awsRequestId);

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
