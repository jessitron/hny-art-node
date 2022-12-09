import { Pixel, readImage } from "./image";

type StackSpec = {
  houseHeight: number;
  time_delta: number;
  houseGroup: string;
};

// type TimeDelta = number;
// const chimney = { name: "chimney", heights: [0, 10, 10, 0], startingAt: -22 };
// const house = {
//   name: "house",
//   heights: [0, 8, 9, 10, 11, 12, 11, 10, 9, 8.5, 8, 0],
//   startingAt: -21,
// };
// const door = { name: "portal", heights: [0, 4, 4, 0], startingAt: -19 };

// function buildSpecs() {
//   const columns = {} as Record<TimeDelta, Array<StackSpec>>;

//   const rect = chimney;
//   const timeDelta = rect.startingAt;
//   rect.heights.map(h => { })
// }

function onlyUnique<T>(value: T, index: number, self: T[]): boolean {
  return self.indexOf(value) === index;
}

function objectMap<V, V2>(
  obj: Record<string, V>,
  fn: (v: V) => V2
): Record<string, V2> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}

function readSpecsFromImage(filename: string) {
  const pixels = readImage(filename);
  const visible = pixels.all().filter((p) => p.color.darkness() > 0);

  // give me the top height (min YLoc) of each color, in each column
  type XLoc = number;
  type ColorKey = string;
  type YLoc = number;
  type ColorsbyColumn = Record<XLoc, Record<ColorKey, YLoc>>;
  const distanceFromBottom = function (p: Pixel) {
    return pixels.height - p.location.y;
  };
  const colorsByColumn = visible.reduce((cbc, p) => {
    const colorKey = p.color.toString();
    if (!cbc[p.location.x]) {
      // initialize
      cbc[p.location.x] = {};
    }
    if (!cbc[p.location.x][colorKey]) {
      // initialize
      cbc[p.location.x][colorKey] = 0;
    }
    if (cbc[p.location.x][colorKey] < distanceFromBottom(p)) {
      // compare
      cbc[p.location.x][colorKey] = distanceFromBottom(p);
    }
    return cbc;
  }, {} as ColorsbyColumn);

  console.log("COlors by columns: " + JSON.stringify(colorsByColumn));
  const distanceFromRight = function (x: XLoc) {
    return x - pixels.width;
  };

  const colorAndHeightByColumn: Record<
    XLoc,
    Array<[ColorKey, YLoc]>
  > = objectMap(colorsByColumn, (heightByColor) => {
    const pairs: Array<[ColorKey, YLoc]> = Object.entries(heightByColor);
    const ascendingHeight = pairs.sort((a, b) => a[1] - b[1]);
    console.log("pairs: " + JSON.stringify(ascendingHeight));
    for (var i = ascendingHeight.length - 1; i > 0; i--) {
      console.log(
        "This one: " + JSON.stringify(ascendingHeight[i]) + " at " + i
      );
      const heightOfThisColor = ascendingHeight[i][1];
      const heightOfNextColorDown = ascendingHeight[i - 1][1];
      const heightOfThisColorInAStackedGraph =
        heightOfThisColor - heightOfNextColorDown;
      ascendingHeight[i][1] = heightOfThisColorInAStackedGraph;
    }
    return ascendingHeight;
  });

  console.log(
    "Color and height by column: " + JSON.stringify(colorAndHeightByColumn)
  );

  const specs = Object.entries(colorAndHeightByColumn)
    .map(([x, colorsAndHeights]) =>
      colorsAndHeights.map(([colorKey, y]) => ({ x, y, colorKey }))
    )
    .flat()
    .map((s) => ({
      // this is the klugey bit
      time_delta: distanceFromRight(parseInt(s.x)),
      houseHeight: s.y,
      houseGroup: s.colorKey,
    }));

  return specs;
}

const stackSpec: StackSpec[] = [
  {
    time_delta: -22,
    houseHeight: 0,
    houseGroup: "chimney",
  },
  {
    time_delta: -21,
    houseHeight: 10,
    houseGroup: "chimney",
  },
  {
    time_delta: -20,
    houseHeight: 10 - 8,
    houseGroup: "chimney",
  },
  {
    time_delta: -19,
    houseHeight: 0,
    houseGroup: "chimney",
  },
  {
    time_delta: -21,
    houseHeight: 0,
    houseGroup: "house",
  },
  {
    time_delta: -20,
    houseHeight: 8,
    houseGroup: "house",
  },
  {
    time_delta: -19,
    houseHeight: 9,
    houseGroup: "house",
  },
  {
    time_delta: -18,
    houseHeight: 10 - 4,
    houseGroup: "house",
  },
  {
    time_delta: -17,
    houseHeight: 11 - 4,
    houseGroup: "house",
  },
  {
    time_delta: -16,
    houseHeight: 12,
    houseGroup: "house",
  },
  {
    time_delta: -15,
    houseHeight: 11,
    houseGroup: "house",
  },
  {
    time_delta: -14,
    houseHeight: 10,
    houseGroup: "house",
  },
  {
    time_delta: -13,
    houseHeight: 9,
    houseGroup: "house",
  },
  {
    time_delta: -12,
    houseHeight: 8.5,
    houseGroup: "house",
  },
  {
    time_delta: -11,
    houseHeight: 8,
    houseGroup: "house",
  },
  {
    time_delta: -10,
    houseHeight: 0,
    houseGroup: "house",
  },
  {
    time_delta: -18,
    houseHeight: 4,
    houseGroup: "portal",
  },
  {
    time_delta: -17,
    houseHeight: 4,
    houseGroup: "portal",
  },
].map((v) => ({ ...v, iteration: "our" }));

// I want to know whether there are enough SpanSpecs to hold our StackSpecs

type EnoughOfASpanSpec = { time_delta: number };
function countByTimeDelta<T extends EnoughOfASpanSpec>(
  ss: T[]
): Record<string, T[]> {
  return ss.reduce((p, c) => {
    const k = "" + c.time_delta;
    if (!p.hasOwnProperty(k)) {
      p[k] = [];
    }
    p[k].push(c);
    return p;
  }, {} as Record<string, T[]>);
}

type PossibleStackSpec = { houseHeight?: number; houseGroup?: string };
export function addStackedGraphAttributes<T extends EnoughOfASpanSpec>(
  spanSpecs: T[]
): Array<T & PossibleStackSpec> {
  var stackSpecCountByDelta = countByTimeDelta(readSpecsFromImage("house.png")); // the array reference won't be mutated but its contents will be

  const withStackSpecs = spanSpecs.map((ss) => {
    // do we have a need for a stack spec at this time?
    const stackSpecForThisTime = stackSpecCountByDelta[ss.time_delta]?.pop();
    if (stackSpecForThisTime) {
      return { ...ss, ...stackSpecForThisTime };
    } else {
      return ss;
    }
  });

  // warn if we missed any
  Object.values(stackSpecCountByDelta)
    .filter((ss) => ss.length > 0)
    .forEach((missedSpecs) => {
      console.log(
        `WARNING: ${missedSpecs.length} stack spec at ${
          missedSpecs[0].time_delta
        } unused. You'll be missing a ${missedSpecs
          .map((ss) => ss.houseGroup)
          .join(" and a ")}`
      );
    });
  return withStackSpecs;

  const spanSpecCountByDelta = countByTimeDelta(spanSpecs);
  Object.keys(stackSpecCountByDelta).forEach((k) => {
    console.log("For stacks at " + k);
    console.log(
      "There are " + stackSpecCountByDelta[k].length + " stack specs then"
    );
    console.log("There are " + spanSpecCountByDelta[k].length + " spans then");
  });

  return spanSpecs;
}

