console.log("Greetings from Typescript");
import { sdk } from "./tracing";
import { Darkness, Pixel, Pixels, readImage } from "./image";

import otel from "@opentelemetry/api";
const tracer = otel.trace.getTracer("i did this on purpose");

type SpanSpec = {
  time_delta: number;
  height: number;
  spans_at_once: number;
};

type CountOfSpans = number; // 0 to maxSpansAtOnePoint
function approximateColorByNumberOfSpans(
  allPixels: Pixel[]
): (d: Darkness) => CountOfSpans {
  const bluenesses = allPixels.map((p) => p.color.darkness());
  const maxBlueness = Math.max(...bluenesses);
  const bluenessWidth = maxBlueness - Math.min(...bluenesses);
  if (bluenessWidth === 0) {
    // there is only one color. We only ever need to send 1 span.
    return (d) => 1;
  }
  const maxSpansAtOnePoint = 10.0;
  const increaseInSpansPerBlueness =
    bluenessWidth === 0 ? 1 : (maxSpansAtOnePoint - 1) / bluenessWidth;
  console.log(
    "Let's increase blueness by " + increaseInSpansPerBlueness + " per"
  );
  return (b: Darkness) =>
    maxSpansAtOnePoint -
    Math.round((maxBlueness - b) * increaseInSpansPerBlueness);
}

type RowInPng = number; // distance from the top of the png, in pixels. Int
type HeatmapHeight = number; // the height we should heatmap on. float. NEVER a whole number
function placeVerticallyInBuckets(
  visiblePixels: Pixel[],
  imageHeight: number
): (y: RowInPng) => HeatmapHeight {
  const KnownGoodNumberOfPixels = 48;
  const KnownHeightValueThatLooksGood = 40;
  const pictureHeight =
    imageHeight - Math.min(...visiblePixels.map((p) => p.location.y));
  const imageBase =
    imageHeight - Math.max(...visiblePixels.map((p) => p.location.y));
  console.log("Image starts at " + imageBase);
  const imageHeightRange = pictureHeight - imageBase + 1;
  if (imageHeightRange > 50) {
    console.log(
      "WARNING: This image won't fit, it has more than 50 pixels of stuff"
    );
  }
  if (imageHeightRange <= 25) {
    console.log(
      "WARNING: This image will be stripey, it has fewer than 25 pixels of stuff"
    );
  }
  console.log("Image height range: " + imageHeightRange);
  var predictedStepSize = findNextLargerAllowedStepSize(
    imageHeightRange / 50.0
  );
  console.log("Predicted step size:" + predictedStepSize);
  // really, what I know now is: stepSize is likely to be 0.83886. It is 0.0000001*2^24

  // experimenting
  // predictedStepSize = 1;
  return (y) =>
    (imageHeight - y - imageBase + 0.5) * predictedStepSize + imageBase + 0.01;
}

function findNextLargerAllowedStepSize(atLeastThisBig: number): number {
  var stepSize = 0.0000001; // it always starts here
  while (stepSize < atLeastThisBig) {
    stepSize = stepSize * 2;
  }
  return stepSize;
}

async function main(imageFile: string) {
  await sdk.start();
  const pixels = readImage(imageFile);
  const visiblePixels = pixels.all().filter((p) => p.color.darkness() > 0);

  const spansForBlueness = approximateColorByNumberOfSpans(visiblePixels);
  const heatmapHeight = placeVerticallyInBuckets(visiblePixels, pixels.height);

  const spanSpecs: SpanSpec[] = visiblePixels
    .map((p) => {
      const spans_at_once = spansForBlueness(p.color.darkness());
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          // TODO: could I increase sample rate instead of sending more?
          ...p.asFlatJson(),
          time_delta: p.location.x - pixels.width,
          height_int: pixels.height - p.location.y,
          height: heatmapHeight(p.location.y), // make it noninteger, so hny knows this is a float field
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

// TODO: print a link to the environment

sdk.shutdown();

setTimeout(() => console.log("hopefully they've all been sent"), 20000);
