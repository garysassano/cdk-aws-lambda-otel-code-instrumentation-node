import { awscdk, javascript } from "projen";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.187.0",
  defaultReleaseBranch: "main",
  depsUpgradeOptions: { workflow: false },
  devDeps: ["zod"],
  eslint: true,
  minNodeVersion: "22.14.0",
  name: "cdk-aws-lambda-otel-auto-instrumentation-node",
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: "10",
  prettier: true,
  projenrcTs: true,
});

project.synth();
