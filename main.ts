console.log("Greetings from Typescript");

import { readImage } from "./image";

// tracing.js
("use strict");

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base"

// The Trace Exporter exports the data to Honeycomb and uses
// the environment variables for endpoint, service name, and API Key.
const traceExporter = new OTLPTraceExporter({});

const sdk = new NodeSDK({
  spanProcessor: new BatchSpanProcessor(traceExporter,
  {
    scheduledDelayMillis: 500,
    maxQueueSize: 16000,
    maxExportBatchSize: 1000,
  }),
});

sdk.start();

import otel from "@opentelemetry/api";
const tracer = otel.trace.getTracer("i did this on purpose");

type SpanSpec = {
  x: number;
  y: number;
  blueness: number;
  time_delta: number;
  height: number;
  spans_at_once: number;
};

async function main() {
  const points = await readImage();
  const xs = points.map((p) => p.x);
  const maxWidth = Math.max(...xs);
  const maxHeight = Math.max(...points.map((p) => p.y));

  const bluenesses = [...new Set(points.map((p) => p.blueness + p.redness + p.greenness))].sort();
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

  const spanSpecs: SpanSpec[] = points
    .map((p) => {
      const spans_at_once = spansForBlueness(p.blueness);
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          ...p,
          time_delta: p.x - maxWidth,
          height: maxHeight - p.y,
          spans_at_once,
          error: p.redness > 140,
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

main();
console.log("did some stuff");

sdk.shutdown();

setTimeout(() => console.log("hopefully they've all been sent"), 20000);
