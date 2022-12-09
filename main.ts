import { sdk } from "./tracing";
import { Pixels, readImage } from "./image";
import { populateAttributes } from "./bubbleUp";

import otel from "@opentelemetry/api";
import { findLinkToDataset } from "./honeyApi";
import {
  approximateColorByNumberOfSpans,
  placeHorizontallyInBucket,
  placeVerticallyInBuckets,
  SecondsSinceEpoch,
  HeatmapSpanSpec,
} from "./heatmap";
const tracer = otel.trace.getTracer("viz-art");

console.log("Greetings! Here we go...");

async function main(imageFile: string) {
  await sdk.start();

  const pixels = readImage(imageFile);
  console.log(`Read ${pixels.width}x${pixels.height} image from ${imageFile}`);

  const spanSpecs = planSpans(pixels);
  console.log(`Preparing to send ${spanSpecs.length} spans...`);

  const traceId = sendSpans(spanSpecs);
  console.log("Trace ID is: " + traceId);

  const link = await findLinkToDataset();
  console.log("Run a new query for HEATMAP(height) in this dataset: " + link);

  sdk.shutdown();
  console.log("Pausing to send buffered spans...");
  setTimeout(() => console.log("hopefully they've all been sent"), 20000);
}

type SpanSpec = HeatmapSpanSpec & Record<string, number | string>;

function planSpans(pixels: Pixels): SpanSpec[] {
  const visiblePixels = pixels.all().filter((p) => p.color.darkness() > 0);

  const spansForColor = approximateColorByNumberOfSpans(visiblePixels);
  const heatmapHeight = placeVerticallyInBuckets(visiblePixels, pixels.height);

  // turn each pixel into some spans
  const spanSpecs = visiblePixels
    .map((p) => {
      const spans_at_once = spansForColor(p);
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          ...p.asFlatJson(), // add all the fields, for observability ;-)
          spans_at_once,
          time_delta: p.location.x - pixels.width,
          height: heatmapHeight(p.location.y), // make it noninteger, so hny knows this is a float field
          ...populateAttributes(p), // for bubble up
        }));
    })
    .flat();

  return spanSpecs;
}

type TraceID = string;
function sendSpans(spanSpecs: SpanSpec[]): TraceID {
  const begin: SecondsSinceEpoch = Date.now() / 1000;
  var traceId: string;
  // the root span has no height, so it doesn't appear in the heatmap
  return tracer.startActiveSpan(
    "Deck the halls with boughs of holly",
    (rootSpan) => {
      // create all the spans for the picture
      spanSpecs.sort(byTime).forEach((ss) => {
        const s = tracer.startSpan("la", {
          startTime: placeHorizontallyInBucket(begin, ss.time_delta),
          attributes: ss,
        });
        s.end();
      });
      traceId = rootSpan.spanContext().traceId;
      rootSpan.end();
      return traceId;
    }
  );
}

const byTime = function (ss1: HeatmapSpanSpec, ss2: HeatmapSpanSpec) {
  return ss2.time_delta - ss1.time_delta;
};

const imageFile = process.argv[2] || "dontpeek.png";

main(imageFile);
