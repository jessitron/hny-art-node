console.log("Greetings from Typescript");
import { sdk } from "./tracing"
import { Darkness, Pixel, Pixels, readImage } from "./image";

// tracing.js
("use strict");

import otel from "@opentelemetry/api";
const tracer = otel.trace.getTracer("i did this on purpose");

type SpanSpec = {
  time_delta: number;
  height: number;
  spans_at_once: number;
};

type CountOfSpans = number; // 0 to maxSpansAtOnePoint
function approximateColorByNumberOfSpans(allPixels: Pixel[]): (d: Darkness) => CountOfSpans { 

  const bluenesses = allPixels.map((p) => p.color.darkness());
  const maxBlueness = Math.max(...bluenesses);
  const bluenessWidth = maxBlueness - Math.min(...bluenesses);
  if (bluenessWidth === 0) {
    // there is only one color. We only ever need to send 1 span.
    return (d) => 1;
  }
  const maxSpansAtOnePoint = 10.0;
  const increaseInSpansPerBlueness = bluenessWidth === 0 ? 1 : (maxSpansAtOnePoint - 1) / bluenessWidth;
  console.log(
    "Let's increase blueness by " + increaseInSpansPerBlueness + " per"
  );
  return (b: Darkness) =>
    maxSpansAtOnePoint -
    Math.round((maxBlueness - b) * increaseInSpansPerBlueness);
}

async function main(imageFile: string) {
  await sdk.start();
  const pixels = readImage(imageFile);
  const allPixels = pixels.all().filter((p) => p.color.darkness() > 0);

  const spansForBlueness = approximateColorByNumberOfSpans(allPixels);

  const KnownGoodNumberOfPixels = 48;
  const KnownHeightValueThatLooksGood = 40;
  const imageHeight = Math.max(KnownGoodNumberOfPixels, pixels.height);
  const predictedStepSize = KnownHeightValueThatLooksGood / imageHeight;
  const spanSpecs: SpanSpec[] = allPixels
    .map((p) => {
      const spans_at_once = spansForBlueness(p.color.darkness());
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          ...p.asFlatJson(),
          time_delta: p.location.x - pixels.width,
          height_int: pixels.height - p.location.y,
          height: (pixels.height - p.location.y) * predictedStepSize + 0.01, // make it noninteger, so hny knows this is a float field
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
