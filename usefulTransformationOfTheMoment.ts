import { readImage, Color } from "./image";

const pixels = readImage("./santa7.png");

const Purple = new Color(66, 19, 112, 255);

const Transparent = new Color(0, 0, 0, 0);

pixels.all().forEach((p) => {
  if (p.color.darkness() > 0) {
    pixels.overwrite(p.withColor(new Color(0, 0, p.color.blue, 255)));
  }
});

pixels.writeToFile("santa9.png");
