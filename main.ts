import { sdk } from "./tracing";
import { Darkness, Pixel, Pixels, readImage } from "./image";
import { populateAttributes } from "./attributes";

import otel from "@opentelemetry/api";
import { findLinkToDataset } from "./honeyApi";
const tracer = otel.trace.getTracer("i did this on purpose");

console.log("Greetings! Here we go...");

type CountOfSpans = number; // 0 to maxSpansAtOnePoint
type SpanSpec = {
  time_delta: number;
  height: number;
  spans_at_once: CountOfSpans;
};

type SecondsSinceEpoch = number;
type Seconds = number;
type Nanoseconds = number;
type HrTime = [SecondsSinceEpoch, Nanoseconds];
const Granularity: Seconds = 5;

function approximateColorByNumberOfSpans(
  allPixels: Pixel[]
): (d: Pixel) => CountOfSpans {
  const bluenesses = allPixels.map((p) => 255 - p.color.blue);
  const maxBlueness = Math.max(...bluenesses);
  const bluenessWidth = maxBlueness - Math.min(...bluenesses);
  if (bluenessWidth === 0) {
    // there is only one color. We only ever need to send 1 span.
    return (d) => 1;
  }
  const maxSpansAtOnePoint = 10.0;
  const increaseInSpansPerBlueness =
    bluenessWidth === 0 ? 1 : (maxSpansAtOnePoint - 1) / bluenessWidth;
  return (p: Pixel) =>
    maxSpansAtOnePoint -
    Math.round(
      (maxBlueness - (255 - p.color.blue)) * increaseInSpansPerBlueness
    );
}

type RowInPng = number; // distance from the top of the png, in pixels. Int
type HeatmapHeight = number; // the height we should heatmap on. float. NEVER a whole number

function placeVerticallyInBuckets(
  visiblePixels: Pixel[],
  imageHeight: number
): (y: RowInPng) => HeatmapHeight {
  const pictureHeight =
    imageHeight - Math.min(...visiblePixels.map((p) => p.location.y));
  const imageBase =
    imageHeight - Math.max(...visiblePixels.map((p) => p.location.y));
  const imageHeightRange = pictureHeight - imageBase + 1;
  if (imageHeightRange > 50) {
    console.log(
      "WARNING: The picture is too tall. Make its content 25-50 pixels high"
    );
  }
  if (imageHeightRange <= 25) {
    console.log(
      "WARNING: The picture is too short. Make its content 25-50 pixels high"
    );
  }
  var predictedStepSize = 1.6777216; // this is just what it is. 0.0000001 * 2^24
  return (y) =>
    (imageHeight - y - imageBase + 0.5) * predictedStepSize + imageBase + 0.01;
}

function placeHorizontallyInBucket(
  begin: SecondsSinceEpoch,
  howFarToTheRight: number
): HrTime {
  return [begin + howFarToTheRight * Granularity, 0];
}

async function main(imageFile: string) {
  await sdk.start();
  const pixels = readImage(imageFile);
  const visiblePixels = pixels.all().filter((p) => p.color.darkness() > 0);

  const spansForColor = approximateColorByNumberOfSpans(visiblePixels);
  const heatmapHeight = placeVerticallyInBuckets(visiblePixels, pixels.height);

  // turn each pixel into some spans
  const spanSpecs: SpanSpec[] = visiblePixels
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

const byTime = function (ss1: SpanSpec, ss2: SpanSpec) {
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
