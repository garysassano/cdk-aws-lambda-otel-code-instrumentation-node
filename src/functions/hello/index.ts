import { trace, SpanStatusCode, Context, Span } from "@opentelemetry/api";
import { initTracer } from "./tracer";

// Initialize the tracer when the Lambda container starts
initTracer("hello-lambda-function");

// Get the tracer instance
const tracer = trace.getTracer("hello-lambda-function");

interface LambdaEvent {
  // Define properties based on your expected input
  [key: string]: any;
}

// Lambda handler with OpenTelemetry instrumentation
export const handler = async (event: LambdaEvent, context: Context) => {
  // Start a new span for this Lambda invocation
  return tracer.startActiveSpan("lambda_execution", async (span: Span) => {
    try {
      // Add attributes to the span
      span.setAttribute("aws.lambda.request_id", context.awsRequestId);
      span.setAttribute("lambda.event", JSON.stringify(event));

      // Your business logic
      const response = {
        statusCode: 200,
        body: JSON.stringify("Hello from Lambda with OpenTelemetry!"),
      };

      // Add response information to the span
      span.setAttribute("lambda.response", JSON.stringify(response));

      // Set span status to success
      span.setStatus({ code: SpanStatusCode.OK });

      return response;
    } catch (error) {
      // Record error details in the span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });

      // Re-throw the error
      throw error;
    } finally {
      // End the span
      span.end();
    }
  });
};
