import { PNG, PNGWithMetadata } from "pngjs";
import fs from "fs";

function readPng(location: string): PNGWithMetadata {
  var data = fs.readFileSync(location);
  return PNG.sync.read(data);
}

function range(from: number, to: number): ReadonlyArray<number> {
  return [...Array(to - from).keys()].map((i) => i + from);
}

type ZeroTo255 = number; // from 0 to 255

type Location = { x: number; y: number };

class Color {
  constructor(
    public red: ZeroTo255,
    public green: ZeroTo255,
    public blue: ZeroTo255,
    public alpha: ZeroTo255
  ) {}

  public total() {
    return this.red + this.blue + this.green; // maybe reduce if alpha is low? * alpha/255 ?
  }
}

type Pixel = { location: Location; color: Color };

// https://github.com/lukeapage/pngjs#example
class Pixels {
  public readonly width: number;
  public readonly height: number;
  constructor(private png: PNGWithMetadata) {
    if (png.colorType !== 6) {
      throw new Error(
        "Only RGBA color type is supported. Expected colorType 6; got ${png.colorType}, whatever that means."
      );
    }
    this.width = png.width;
    this.height = png.height;
  }

  private static readonly RED_CHANNEL = 0;

  private static readonly GREEN_CHANNEL = 1;
  private static readonly BLUE_CHANNEL = 2;
  private static readonly ALPHA_CHANNEL = 3;

  public at(x: number, y: number) {
    const idx = (this.width * y + x) << 2; // why bitshift by 2? is this different from multiplying by 4, for the number of channels? I think the examples are being too clever
    const red = this.png.data[idx + Pixels.RED_CHANNEL];
    const blue = this.png.data[idx + Pixels.BLUE_CHANNEL];
    const green = this.png.data[idx + Pixels.GREEN_CHANNEL];
    const alpha = this.png.data[idx + Pixels.ALPHA_CHANNEL];

    return { location: { x, y }, color: new Color(red, green, blue, alpha) };
  }

  public all(): Pixel[] {
    return range(0, this.height)
      .map((y) => range(0, this.width).map((x) => this.at(x, y)))
      .flat();
  }
}

export function readImage(imageFile: string) {
  const pixels = new Pixels(readPng(imageFile));

  console.log("alpha:")
  printLines(pixels, (p) => p.color.alpha);
  console.log("Red:")
  printLines(pixels, (p) => p.color.red);
  console.log("Green:")
  printLines(pixels, (p) => p.color.green);
  console.log("Blue:")
  printLines(pixels, (p) => p.color.blue);
  // printLines(pixels, (p) => p.location.x);

  return pixels;
}

function printLines(pixels: Pixels, f: (p: Pixel) => number) {
  const lines = range(0, pixels.height).map((y) =>
    range(0, pixels.width)
      .map((x) => f(pixels.at(x, y)))
      .map((n) => ("" + n).padStart(3, " "))
      .join(" ")
  );
  lines.forEach((l) => console.log(l));
}
