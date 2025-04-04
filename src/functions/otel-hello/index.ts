import { trace, SpanStatusCode, Context, Span } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  resourceFromAttributes,
  defaultResource,
} from "@opentelemetry/resources";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Initialize the tracer when the Lambda container starts
const initTracer = (): void => {
  // Create a resource that includes metadata about this service
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME || "otel-hello-lambda",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env
      .AWS_LAMBDA_FUNCTION_VERSION
      ? "production"
      : "development",
  });

  // Merge with default resource
  const mergedResource = defaultResource().merge(resource);

  // Create a trace provider with our custom resource
  const provider = new NodeTracerProvider({
    resource: mergedResource,
  });

  // Configure the OTLP exporter to send traces to Honeycomb
  const exporter = new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    headers: {
      "x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
      "x-honeycomb-dataset": process.env.HONEYCOMB_DATASET || "lambda-traces",
    },
  });

  // Create a span processor to batch and send traces
  const processor = new BatchSpanProcessor(exporter);
  provider.addSpanProcessor(processor);

  // Register the provider globally
  provider.register();
};

// Initialize the tracer outside the handler for container reuse
initTracer();

// Get the tracer instance
const tracer = trace.getTracer("otel-hello-lambda");

interface LambdaEvent {
  // Define properties based on your expected input
  [key: string]: any;
}

// Lambda handler with OpenTelemetry instrumentation
export const handler = async (event: LambdaEvent, context: Context) => {
  // Start a new span for this Lambda invocation
  return tracer.startActiveSpan("lambda_execution", async (span: Span) => {
    try {
      // Add context as span attributes
      span.setAttribute("aws.lambda.request_id", context.awsRequestId);
      span.setAttribute("aws.lambda.arn", context.invokedFunctionArn);
      span.setAttribute("aws.lambda.cold_start", context.coldStart === true);

      // Add event data as span attributes (be careful with sensitive data)
      const eventType =
        event.httpMethod || event.requestContext?.http?.method || "unknown";
      span.setAttribute("lambda.event.type", eventType);

      // Your business logic here
      // Create a child span for the business logic
      const childSpan = tracer.startSpan("process_data");
      try {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 100));
        childSpan.setAttribute("process.status", "success");
      } catch (error) {
        childSpan.recordException(error as Error);
        childSpan.setStatus({ code: SpanStatusCode.ERROR });
      } finally {
        childSpan.end();
      }

      // Generate response
      const response = {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello from Lambda with OpenTelemetry SDK v2!",
          timestamp: new Date().toISOString(),
        }),
      };

      // Add response data to the span
      span.setAttribute("lambda.response.statusCode", response.statusCode);

      // Set span status to success
      span.setStatus({ code: SpanStatusCode.OK });

      return response;
    } catch (error) {
      // Handle and log any errors
      console.error("Error in Lambda function:", error);

      // Record error details in the span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });

      // Return error response
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Internal Server Error",
          error: (error as Error).message,
        }),
      };
    } finally {
      // End the span
      span.end();
    }
  });
};
