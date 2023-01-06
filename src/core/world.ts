import produce from "immer";
import { match } from "ts-pattern";
import { CHUNK_SHAPE, DIFFICULTY } from "../constants";
import { FieldState, FieldValue, Vec2, World } from "../types";
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

export const addChunk = (world: World, pos: Vec2, difficulty: number) =>
  produce(world, (draft) => {
    if (draft.chunks[`${pos[0]},${pos[1]}`]) {
      return;
    }

    const fields = Array(CHUNK_SHAPE[0] * CHUNK_SHAPE[1])
      .fill(null)
      .map((_) => ({
        value:
          Math.random() < difficulty
            ? ("mine" as const)
            : ("uncounted" as const),
        state: "hidden" as const,
        nFlags: 0 as const,
      }));

    draft.chunks[`${pos[0]},${pos[1]}`] = {
      pos,
      fields,
    };
  });

const changeFieldState = (
  world: World,
  chunkPos: Vec2,
  localPos: Vec2,
  state: FieldState
) =>
  produce(world, (draft) => {
    const chunk = draft.chunks[`${chunkPos[0]},${chunkPos[1]}`];

    if (!chunk) {
      throw new Error("chunk does not exist");
    }

    const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

    field.state = state;
  });

const changeFieldValue = (
  world: World,
  chunkPos: Vec2,
  localPos: Vec2,
  value: FieldValue
) =>
  produce(world, (draft) => {
    const chunk = draft.chunks[`${chunkPos[0]},${chunkPos[1]}`];

    if (!chunk) {
      throw new Error("chunk does not exist");
    }

    const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

    field.value = value;
  });

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

  const newFieldValue = match(field.value)
    .with("uncounted", () => {
      let nMines = 0;

      neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
        ([[cx, cy], [nx, ny]]) => {
          world = addChunk(world, [cx, cy], DIFFICULTY);

          world = produce(world, (draft) => {
            const nChunk = draft.chunks[`${cx},${cy}`];

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
          });
        }
      );

      return nMines as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    })
    .otherwise(() => field.value);

  world = changeFieldValue(world, chunkPos, localPos, newFieldValue);

  if (newFieldValue === 0) {
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
            world = addChunk(world, [cx, cy], DIFFICULTY);

            world = produce(world, (draft) => {
              const nChunk = draft.chunks[`${cx},${cy}`];

              const nIdx = ravel([nx, ny], CHUNK_SHAPE);

              const nField = nChunk.fields[nIdx];

              nField.nFlags += 1;
            });
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
            world = produce(world, (draft) => {
              const nChunk = draft.chunks[`${cx},${cy}`];

              const nIdx = ravel([nx, ny], CHUNK_SHAPE);

              const nField = nChunk.fields[nIdx];

              nField.nFlags -= 1;
            });
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
