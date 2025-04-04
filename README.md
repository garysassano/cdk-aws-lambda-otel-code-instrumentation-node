# cdk-aws-lambda-otel-code-instrumentation-node

CDK app showcasing OpenTelemetry [code-based instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/code-based/) for AWS Lambda functions running on the Node.js runtime.

### Related Apps

- [cdk-aws-lambda-otel-auto-instrumentation-node](https://github.com/garysassano/cdk-aws-lambda-otel-auto-instrumentation-node) - Uses OpenTelemetry auto instrumentation instead of code.

## Prerequisites

- **_AWS:_**
  - Must have authenticated with [Default Credentials](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli_auth) in your local environment.
  - Must have completed the [CDK bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) for the target AWS environment.
- **_Honeycomb:_**
  - Must have set the `HONEYCOMB_API_KEY` variable in your local environment.
- **_Node.js + npm:_**
  - Must be [installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) in your system.

## Installation

```sh
npx projen install
```

## Deployment

```sh
npx projen deploy
```

## Cleanup

```sh
npx projen destroy
```
