import { trace, SpanStatusCode, Context, Span } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  resourceFromAttributes,
  defaultResource,
} from "@opentelemetry/resources";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Initialize OpenTelemetry
const initTracing = () => {
  // Create a resource that identifies your service
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME || "lambda-function",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  });

  // Create a trace provider with our resource
  const provider = new NodeTracerProvider({
    resource: defaultResource().merge(resource),
  });

  // Configure exporter to send traces to Honeycomb
  const exporter = new OTLPTraceExporter({
    url: "https://api.honeycomb.io/v1/traces",
    headers: {
      "x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
      "x-honeycomb-dataset": process.env.HONEYCOMB_DATASET || "lambda-traces",
    },
  });

  // Register the provider and use batch processing to reduce overhead
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();
};

// Initialize tracing (happens once per Lambda container)
initTracing();

// Get a tracer for this module
const tracer = trace.getTracer("lambda-handler");

// Lambda handler function
export const handler = async (event: any, context: Context) => {
  // Create a span representing the entire Lambda execution
  return tracer.startActiveSpan("lambda_execution", async (span: Span) => {
    try {
      // Add Lambda context info to span
      span.setAttribute("aws.lambda.request_id", context.awsRequestId);

      // Your Lambda business logic
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: "Hello from Lambda with OpenTelemetry v2!",
        }),
      };

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      // Record error details in the span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      // End the span
      span.end();
    }
  });
};
