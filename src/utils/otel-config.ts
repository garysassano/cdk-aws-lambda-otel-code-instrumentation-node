/**
 * Environment variables for configuring OpenTelemetry in Lambda functions
 */
export const getOpenTelemetryEnv = (
  honeycombApiKey: string,
  dataset: string = "lambda-traces",
) => {
  return {
    // Honeycomb specific configurations
    HONEYCOMB_API_KEY: honeycombApiKey,
    HONEYCOMB_DATASET: dataset,

    // OpenTelemetry configurations
    OTEL_SERVICE_NAME: "lambda-service",
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://api.honeycomb.io",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_PROPAGATORS: "tracecontext,baggage",

    // Lambda specific configurations
    OTEL_LAMBDA_DISABLE_AWS_CONTEXT_PROPAGATION: "false",

    // Sampling configuration (adjust as needed)
    OTEL_TRACES_SAMPLER: "parentbased_always_on",
  };
};
