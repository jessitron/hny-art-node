console.log("Greetings from Typescript");

import p from "get-pixels";
import { promisify } from "util";

async function main() {
  const pixels = await promisify(p)("./hatted.png", "image/png");

  console.log(JSON.stringify(pixels.shape.slice()));
}

main();

setTimeout(() => {
  console.log("Good Bye");
}, 10000);
