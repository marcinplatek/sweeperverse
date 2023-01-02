import { useEffect, useState } from "react";
import { CHUNK_SHAPE } from "./constants";
import { World } from "./types";

function choose<T>(choices: T[]) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

const world: World = {
  isExploded: false,
  chunks: {
    "0,0": {
      pos: [0, 0],
      fields: Array(CHUNK_SHAPE[0] * CHUNK_SHAPE[1])
        .fill(null)
        .map((_) => ({
          value: choose(["mine", 0, 1, 2, 3, 4, 5, 6, 7, 8]),
          state: choose(["hidden", "flagged", "questioned", "revealed"]),
          nFlags: 0,
        })),
    },
  },
};

export const useDummyWorld = () => {
  const [w, setW] = useState<World | null>(null);

  useEffect(() => {
    setW(world);
  }, []);

  return w;
};
