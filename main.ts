import { sdk } from "./tracing";
import { Darkness, Pixel, Pixels, readImage } from "./image";
import { populateAttributes } from "./attributes";

import otel from "@opentelemetry/api";
import { findLinkToDataset } from "./honeyApi";
import {
  approximateColorByNumberOfSpans,
  placeHorizontallyInBucket,
  placeVerticallyInBuckets,
  SecondsSinceEpoch,
  HeatmapSpanSpec,
} from "./heatmap";
const tracer = otel.trace.getTracer("i did this on purpose");

console.log("Greetings! Here we go...");

async function main(imageFile: string) {
  await sdk.start();
  const pixels = readImage(imageFile);
  const visiblePixels = pixels.all().filter((p) => p.color.darkness() > 0);

  const spansForColor = approximateColorByNumberOfSpans(visiblePixels);
  const heatmapHeight = placeVerticallyInBuckets(visiblePixels, pixels.height);

  type NewType = HeatmapSpanSpec;

  // turn each pixel into some spans
  const spanSpecs: NewType[] = visiblePixels
    .map((p) => {
      const spans_at_once = spansForColor(p);
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          ...p.asFlatJson(), // add all the fields, for observability ;-)
          ...populateAttributes(p),
          time_delta: p.location.x - pixels.width,
          height: heatmapHeight(p.location.y), // make it noninteger, so hny knows this is a float field
          spans_at_once,
        }));
    })
    .flat();

  console.log(`Preparing to send ${spanSpecs.length} spans...`);

  const begin: SecondsSinceEpoch = Date.now() / 1000;

  // the root span has no height, so it doesn't appear in the heatmap
  tracer.startActiveSpan("Deck the halls with boughs of holly", (rootSpan) => {
    // create all the spans for the picture
    spanSpecs.sort(byTime).forEach((ss) => {
      const s = tracer.startSpan("la", {
        startTime: placeHorizontallyInBucket(begin, ss.time_delta),
        attributes: ss,
      });
      s.end();
    });
    console.log("Trace ID is: " + rootSpan.spanContext().traceId);
    rootSpan.end();
  });
}

const byTime = function (ss1: HeatmapSpanSpec, ss2: HeatmapSpanSpec) {
  return ss2.time_delta - ss1.time_delta;
};
const imageFile = process.argv[2] || "dontpeek.png";

main(imageFile).then(async () => {
  console.log("Pausing to send buffered spans...");

  const link = await findLinkToDataset();
  if (link) {
    console.log("Run a new query for HEATMAP(height) in this dataset: " + link);
  }

  // TODO: print a link to the environment
  // TODO: send them from the left rather than from the top
  sdk.shutdown();

  setTimeout(() => console.log("hopefully they've all been sent"), 20000);
});
