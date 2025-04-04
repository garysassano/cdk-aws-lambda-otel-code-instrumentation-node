import { trace, context, propagation } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Function to initialize the OpenTelemetry tracer
export function initTracer(serviceName: string): void {
  // Create a resource that includes metadata about this service
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.AWS_LAMBDA_FUNCTION_VERSION ? 'production' : 'development',
  });

  // Merge with default resource (provides host and runtime metadata)
  const mergedResource = defaultResource().merge(resource);

  // Create a trace provider with our custom resource
  const provider = new NodeTracerProvider({
    resource: mergedResource,
  });

  // Configure the OTLP exporter to send traces to Honeycomb
  // Honeycomb expects the API key in the header
  const exporter = new OTLPTraceExporter({
    url: 'https://api.honeycomb.io/v1/traces',
    headers: {
      'x-honeycomb-team': process.env.HONEYCOMB_API_KEY || '',
      'x-honeycomb-dataset': process.env.HONEYCOMB_DATASET || 'lambda-traces',
    },
  });

  // Create a span processor to batch and send traces
  const processor = new BatchSpanProcessor(exporter);
  provider.addSpanProcessor(processor);

  // Register the provider globally
  provider.register();

  // Return the tracer instance
  return trace.getTracer(serviceName);
}

// Export a singleton tracer
export const tracer = trace.getTracer('lambda-function'); 