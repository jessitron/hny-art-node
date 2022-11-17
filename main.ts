console.log("Greetings from Typescript");

import { readImage } from "./image";

// tracing.js
("use strict");

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

const { DiagConsoleLogger, DiagLogLevel, diag } = require("@opentelemetry/api");
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// The Trace Exporter exports the data to Honeycomb and uses
// the environment variables for endpoint, service name, and API Key.
const traceExporter = new OTLPTraceExporter();

const sdk = new NodeSDK({
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    scheduledDelayMillis: 500,
    maxQueueSize: 16000,
    maxExportBatchSize: 1000,
  }),
});

import otel from "@opentelemetry/api";
const tracer = otel.trace.getTracer("i did this on purpose");

type SpanSpec = {
  time_delta: number;
  height: number;
  spans_at_once: number;
};

async function main(imageFile: string) {
  await sdk.start();
  const pixels = readImage(imageFile);
  const allPixels = pixels.all().filter((p) => p.color.total() > 0);

  const bluenesses = [...new Set(allPixels.map((p) => p.color.total()))].sort();
  console.log(
    `There are ${bluenesses.length} different bluenesses: ` +
      JSON.stringify(bluenesses)
  );
  const maxBlueness = Math.max(...bluenesses);
  const bluenessWidth = maxBlueness - Math.min(...bluenesses);
  const maxSpansAtOnePoint = 10.0;
  const increaseInSpansPerBlueness = maxSpansAtOnePoint / bluenessWidth;
  console.log(
    "Let's increase blueness by " + increaseInSpansPerBlueness + " per"
  );
  const spansForBlueness = (b: number) =>
    maxSpansAtOnePoint -
    Math.round((maxBlueness - b) * increaseInSpansPerBlueness) +
    1;

  const spanSpecs: SpanSpec[] = allPixels
    .map((p) => {
      const spans_at_once = spansForBlueness(p.color.total());
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          ...p.asFlatJson(),
          time_delta: p.location.x - pixels.width,
          height: pixels.height - p.location.y,
          spans_at_once,
          error: p.color.red > 140,
        }));
    })
    .flat();

  console.log(`this should send ${spanSpecs.length} spans`);

  type SecondsSinceEpoch = number;
  type Nanoseconds = number;
  type HrTime = [SecondsSinceEpoch, Nanoseconds];
  const begin: Nanoseconds = Date.now() / 1000; // sec since epoch. first element in HrTime

  tracer.startActiveSpan("Once upon a time", (rootSpan) => {
    spanSpecs.forEach((ss) => {
      const startTime: HrTime = [begin + ss.time_delta * 5, 0];
      const s = tracer.startSpan("dot", {
        startTime,
        attributes: ss,
      });
      s.end();
    });
    console.log("Trace ID is: " + rootSpan.spanContext().traceId);
    rootSpan.end();
  });
}

const imageFile = process.argv[2] || "hatskirt.png";
console.log("reading image from: " + imageFile);

main(imageFile);
console.log("did some stuff");

sdk.shutdown();

setTimeout(() => console.log("hopefully they've all been sent"), 20000);
