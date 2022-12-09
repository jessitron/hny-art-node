type StackSpec = {
  houseHeight: number;
  time_delta: number;
  houseGroup: string;
};

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
    time_delta: -19,
    houseHeight: 0,
    houseGroup: "portal",
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
  {
    time_delta: -16,
    houseHeight: 0,
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

export function addStackedGraphAttributes(spanSpecs: EnoughOfASpanSpec[]) {
  const stackSpecCountByDelta = countByTimeDelta(stackSpec);
  const spanSpecCountByDelta = countByTimeDelta(spanSpecs);

  Object.keys(stackSpecCountByDelta).forEach((k) => {
    console.log("For stacks at " + k);
    console.log(
      "There are " + stackSpecCountByDelta[k].length + " stack specs then"
    );
    console.log("There are " + spanSpecCountByDelta[k].length + " spans then");
    if (spanSpecCountByDelta[k] < stackSpecCountByDelta[k]) {
      console.log("WARNING: insufficient spans at time " + k);
    }
  });

  return spanSpecs;
}
