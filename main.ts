console.log("Greetings from Typescript");

import { readImage } from "./image";

// tracing.js
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");

// The Trace Exporter exports the data to Honeycomb and uses
// the environment variables for endpoint, service name, and API Key.
const traceExporter = new OTLPTraceExporter();

const sdk = new NodeSDK({
  traceExporter
});

sdk.start()

async function main() {
  const points = readImage();
}

main();


