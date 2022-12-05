console.log("Greetings from Typescript");
import { sdk } from "./tracing";
import { Darkness, Pixel, Pixels, readImage } from "./image";

import otel from "@opentelemetry/api";
const tracer = otel.trace.getTracer("i did this on purpose");

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
  var predictedStepSize = findNextLargerAllowedStepSize(
    imageHeightRange / 50.0
  );
  console.log("Predicted step size:" + predictedStepSize);
  // stepSize is likely to be 0.83886. It is 0.0000001*2^24

  // experimenting
  // predictedStepSize = 1;
  return (y) =>
    (imageHeight - y - imageBase + 0.5) * predictedStepSize + imageBase + 0.01;
}

function placeHorizontallyInBucket(
  begin: SecondsSinceEpoch,
  howFarToTheRight: number
): HrTime {
  return [begin + howFarToTheRight * Granularity, 0];
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

  // turn each pixel into some spans
  const spanSpecs: SpanSpec[] = visiblePixels
    .map((p) => {
      const spans_at_once = spansForBlueness(p.color.darkness());
      return Array(spans_at_once)
        .fill(0)
        .map((_) => ({
          // TODO: could I increase sample rate instead of sending more? ... out of scope
          ...p.asFlatJson(),
          time_delta: p.location.x - pixels.width,
          height: heatmapHeight(p.location.y), // make it noninteger, so hny knows this is a float field
          spans_at_once,
          // error: p.color.red > 140,
        }));
    })
    .flat();

  console.log(`Preparing to send ${spanSpecs.length} spans...`);

  const begin: SecondsSinceEpoch = Date.now() / 1000;

  // the root span has no height, so it doesn't appear in the heatmap
  tracer.startActiveSpan("Once upon a time", (rootSpan) => {
    // create all the spans for the picture
    spanSpecs.forEach((ss) => {
      const s = tracer.startSpan("dot", {
        startTime: placeHorizontallyInBucket(begin, ss.time_delta),
        attributes: ss,
      });
      s.end();
    });
    console.log("Trace ID is: " + rootSpan.spanContext().traceId);
    rootSpan.end();
  });
}

const imageFile = process.argv[2] || "dontpeek.png";

main(imageFile);
console.log("Pausing to send buffered spans...");

// TODO: print a link to the environment
// TODO: send them from the left rather than from the top
sdk.shutdown();

setTimeout(() => console.log("hopefully they've all been sent"), 20000);
