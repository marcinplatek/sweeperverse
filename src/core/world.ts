import produce from "immer";
import { match } from "ts-pattern";
import { CHUNK_SHAPE, DIFFICULTY } from "../constants";
import {
  ChunkData,
  FieldState,
  FieldValue,
  Fin9,
  Vec2,
  Vec2Hash,
  World,
} from "../types";
import { ravel } from "./utils";

export const newWorld = (): World => ({
  isExploded: false,
  chunks: {},
});

const neighbors = (
  chunkPos: Vec2,
  localPos: Vec2,
  shape: Vec2
): [Vec2, Vec2][] => {
  const [x, y] = localPos;

  const neighborhood = [
    [x - 1, y - 1],
    [x - 1, y],
    [x - 1, y + 1],
    [x, y - 1],
    [x, y + 1],
    [x + 1, y - 1],
    [x + 1, y],
    [x + 1, y + 1],
  ];

  // if out of bounds, get neighbor chunk

  return neighborhood.map(([nx, ny]) => {
    let cx = chunkPos[0];
    let cy = chunkPos[1];

    if (nx < 0) {
      nx = shape[0] - 1;
      cx -= 1;
    }

    if (nx >= shape[0]) {
      nx = 0;
      cx += 1;
    }

    if (ny < 0) {
      ny = shape[1] - 1;
      cy -= 1;
    }

    if (ny >= shape[1]) {
      ny = 0;
      cy += 1;
    }

    return [
      [cx, cy],
      [nx, ny],
    ];
  });
};

export const addChunk = (world: World, pos: Vec2, difficulty: number) => {
  if (world.chunks[`${pos[0]},${pos[1]}`]) {
    return world;
  }

  const fields = Array(CHUNK_SHAPE[0] * CHUNK_SHAPE[1])
    .fill(null)
    .map((_) => ({
      value:
        Math.random() < difficulty ? ("mine" as const) : ("uncounted" as const),
      state: "hidden" as const,
      nFlags: 0 as const,
    }));

  return {
    ...world,
    chunks: {
      ...world.chunks,
      [`${pos[0]},${pos[1]}`]: {
        pos,
        fields,
      },
    },
  };
};

const changeFieldState = (
  world: World,
  chunkPos: Vec2,
  localPos: Vec2,
  state: FieldState
) => {
  const chunkKey = `${chunkPos[0]},${chunkPos[1]}` as const;
  const chunk = world.chunks[chunkKey];
  if (!chunk) {
    throw new Error("chunk does not exist");
  }

  const fieldIndex = ravel(localPos, CHUNK_SHAPE);
  const newField = { ...chunk.fields[fieldIndex], state };
  const newFields = [...chunk.fields];
  newFields[fieldIndex] = newField;

  const newChunk = { ...chunk, fields: newFields };
  const newChunks = { ...world.chunks };
  newChunks[chunkKey] = newChunk;

  return { ...world, chunks: newChunks };
};

const changeFieldValue = (
  world: World,
  chunkPos: Vec2,
  localPos: Vec2,
  value: FieldValue
) => {
  const chunkKey = `${chunkPos[0]},${chunkPos[1]}` as const;
  const chunk = world.chunks[chunkKey];
  if (!chunk) {
    throw new Error("chunk does not exist");
  }

  const fieldIndex = ravel(localPos, CHUNK_SHAPE);
  const newField = { ...chunk.fields[fieldIndex], value };
  const newFields = [...chunk.fields];
  newFields[fieldIndex] = newField;

  const newChunk = { ...chunk, fields: newFields };
  const newChunks = { ...world.chunks };
  newChunks[chunkKey] = newChunk;

  return { ...world, chunks: newChunks };
};

const reveal = (world: World, chunkPos: Vec2, localPos: Vec2): World => {
  const chunk = world.chunks[`${chunkPos[0]},${chunkPos[1]}`];

  const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

  if (field.state !== "hidden") {
    return world;
  }

  world = changeFieldState(world, chunkPos, localPos, "revealed");

  if (field.value === "mine") {
    world.isExploded = true;

    world = produce(world, (draft) => {
      Object.values(draft.chunks).forEach((chunk) => {
        chunk.fields.forEach((field) => {
          if (field.state === "hidden" && field.value === "mine") {
            field.state = "revealed";
          }
        });
      });
    });

    return world;
  }

  if (field.value !== "uncounted") {
    return world;
  }

  let nMines: Fin9 = 0;

  neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
    ([[cx, cy], [nx, ny]]) => {
      world = addChunk(world, [cx, cy], DIFFICULTY);

      const nChunk = world.chunks[`${cx},${cy}`];

      const nField = nChunk.fields[ravel([nx, ny], CHUNK_SHAPE)];

      if (nField === undefined) {
        // throw error with full position

        throw new Error(
          `field ${nx}, ${ny} does not exist in chunk ${cx}, ${cy}`
        );
      }

      if (nField.value === "mine") {
        nMines += 1;
      }
    }
  );

  world = changeFieldValue(world, chunkPos, localPos, nMines);

  if (nMines === 0) {
    neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
      ([[cx, cy], [nx, ny]]) => {
        world = reveal(world, [cx, cy], [nx, ny]);
      }
    );
  }

  return world;
};

export const check = (world: World, chunkPos: Vec2, localPos: Vec2): World => {
  if (world.isExploded) {
    return world;
  }

  const chunk = world.chunks[`${chunkPos[0]},${chunkPos[1]}`];

  if (!chunk) {
    throw new Error("chunk does not exist");
  }

  const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

  // if field is already revealed, check if all neighbors are revealed

  if (field.state === "revealed") {
    if (field.nFlags === field.value) {
      neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
        ([[cx, cy], [nx, ny]]) => {
          world = reveal(world, [cx, cy], [nx, ny]);
        }
      );
    }
    return world;
  }

  return reveal(world, chunkPos, localPos);
};

function incrementFlags(
  world: World,
  n: number,
  chunkPos: Vec2,
  localPos: Vec2
): World {
  const [cx, cy] = chunkPos;
  const [nx, ny] = localPos;

  const nChunk = world.chunks[`${cx},${cy}`];
  const nIdx = ravel([nx, ny], CHUNK_SHAPE);
  const nField = nChunk.fields[nIdx];

  const updatedChunks: Record<Vec2Hash, ChunkData> = {
    ...world.chunks,
    [`${cx},${cy}`]: {
      ...nChunk,
      fields: [...nChunk.fields],
    },
  };

  const nFlags = (nField.nFlags + n) as Fin9;

  updatedChunks[`${cx},${cy}`].fields[nIdx] = {
    ...nField,
    nFlags,
  };

  return {
    ...world,
    chunks: updatedChunks,
  };
}

export const mark = (world: World, chunkPos: Vec2, localPos: Vec2): World => {
  if (world.isExploded) {
    return world;
  }

  const chunk = world.chunks[`${chunkPos[0]},${chunkPos[1]}`];

  if (chunk) {
    const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

    match(field.state)
      .with("hidden", () => {
        world.chunks[`${chunkPos[0]},${chunkPos[1]}`].fields[
          ravel(localPos, CHUNK_SHAPE)
        ].state = "flagged";

        // increment nFlags in neighbors

        neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
          ([[cx, cy], [nx, ny]]) => {
            world = incrementFlags(world, 1, [cx, cy], [nx, ny]);
          }
        );
      })
      .with("flagged", () => {
        world.chunks[`${chunkPos[0]},${chunkPos[1]}`].fields[
          ravel(localPos, CHUNK_SHAPE)
        ].state = "questioned";

        // decrement nFlags in neighbors

        neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
          ([[cx, cy], [nx, ny]]) => {
            world = incrementFlags(world, -1, [cx, cy], [nx, ny]);
          }
        );
      })
      .with("questioned", () => {
        world.chunks[`${chunkPos[0]},${chunkPos[1]}`].fields[
          ravel(localPos, CHUNK_SHAPE)
        ].state = "hidden";
      })
      .otherwise(() => {});
  }

  return world;
};

export const worldPosToChunkPos = (worldPos: Vec2): Vec2 => [
  Math.floor(worldPos[0] / CHUNK_SHAPE[0]),
  Math.floor(worldPos[1] / CHUNK_SHAPE[1]),
];

export const worldPosToLocalPos = (worldPos: Vec2): Vec2 => [
  worldPos[0] % CHUNK_SHAPE[0],
  worldPos[1] % CHUNK_SHAPE[1],
];
