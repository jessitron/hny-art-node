console.log("Greetings from Typescript");

import p from "get-pixels";
import { promisify } from "util";

async function readPng(location: string) {
  return promisify(p)(location, "image/png");
}

function range(from: number, to: number): ReadonlyArray<number> {
  return [...Array(to - from).keys()].map((i) => i + from);
}

async function main() {
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
}

main();

// setTimeout(() => {
//   console.log("Good Bye");
// }, 10000);
