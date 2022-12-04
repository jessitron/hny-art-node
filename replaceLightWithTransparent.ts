import * as image from "./image";

const pixels = image.readImage("./santa5.png");

const Purple = new image.Color(66, 19, 112, 255);

const Transparent = new image.Color(0, 0, 0, 0);

pixels.all().forEach((p) => {
  if (p.color.darkness() < 100) {
    pixels.overwrite(p.withColor(Transparent));
  } else if (p.color.darkness() > 200) {
    pixels.overwrite(p.withColor(Purple));
  }
});

pixels.writeToFile("santa6.png");
