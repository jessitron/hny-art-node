import p from "get-pixels";
import { promisify } from "util";

async function readPng(location: string) {
  return promisify(p)(location, "image/png");
}

function range(from: number, to: number): ReadonlyArray<number> {
  return [...Array(to - from).keys()].map((i) => i + from);
}

export async function readImage() {
  const pixels = await readPng("./hatskirt.png");
  const width = pixels.shape[0];
  const height = pixels.shape[1];

  const alpha = pixels.pick(null, null, 3); // the fourth channel
  const lines = range(0, height).map((y) =>
    range(0, width)
      .map((x) => alpha.get(x, y))
      .map((n) => ("" + n).padStart(3, " "))
      .join(" ")
  );
  lines.forEach((l) => console.log(l));

  const bluePoints = range(0, height)
    .map((y) =>
      range(0, width)
        .map((x) => ({ x, y, blueness: alpha.get(x, y) }))
        .filter((b) => b.blueness > 0)
    )
    .flat();
  console.log(JSON.stringify(bluePoints));

  return bluePoints;
}
