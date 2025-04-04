import { trace, SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";

// Initialize OpenTelemetry
const provider = new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: "https://api.honeycomb.io/v1/traces",
        headers: {
          "x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
          "x-honeycomb-dataset":
            process.env.HONEYCOMB_DATASET || "lambda-traces",
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
export const handler = async (event: any, context: any): Promise<any> => {
  // Use the tracer to create a span
  return tracer.startActiveSpan("lambda_handler", async (span) => {
    try {
      // Your Lambda business logic
      const response = {
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

      throw error;
    }
  });
};
