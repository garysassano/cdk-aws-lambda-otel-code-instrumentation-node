import { trace, SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";

// Initialize OpenTelemetry
const provider = new NodeTracerProvider({
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
  _event: APIGatewayProxyEventV2,
  _context: Context,
): Promise<APIGatewayProxyResultV2> => {
  // Use the tracer to create a span
  return tracer.startActiveSpan("lambda_handler", async (span) => {
    try {
      // Your Lambda business logic
      const response: APIGatewayProxyResultV2 = {
        statusCode: 200,
        body: JSON.stringify({ message: "Hello from Lambda!" }),
      };

      // End the span
      span.end();
      return response;
    } catch (error) {
      // Record the error and end the span
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();

      // Return an error response
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  });
};
