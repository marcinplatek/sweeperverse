import produce from "immer";
import { match } from "ts-pattern";
import { CHUNK_SHAPE, DIFFICULTY } from "../constants";
import { Vec2, World } from "../types";
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
    if (nx < 0) {
      return [
        [chunkPos[0] - 1, chunkPos[1]] as Vec2,
        [shape[0] - 1, ny] as Vec2,
      ];
    }

    if (nx >= shape[0]) {
      return [[chunkPos[0] + 1, chunkPos[1]] as Vec2, [0, ny] as Vec2];
    }

    if (ny < 0) {
      return [
        [chunkPos[0], chunkPos[1] - 1] as Vec2,
        [nx, shape[1] - 1] as Vec2,
      ];
    }

    if (ny >= shape[1]) {
      return [[chunkPos[0], chunkPos[1] + 1] as Vec2, [nx, 0] as Vec2];
    }

    return [
      [chunkPos[0], chunkPos[1]],
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

export const reveal = (
  world: World,
  chunkPosk: Vec2,
  localPos: Vec2
): World => {
  const chunk = world.chunks[`${chunkPosk[0]},${chunkPosk[1]}`];

  const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

  if (field.state !== "hidden") {
    return world;
  }

  world.chunks[`${chunkPosk[0]},${chunkPosk[1]}`].fields[
    ravel(localPos, CHUNK_SHAPE)
  ].state = "revealed";

  if (field.value === "mine") {
    world.isExploded = true;

    // reveal all bombs
    Object.values(world.chunks).forEach((chunk) => {
      chunk.fields.forEach((field) => {
        if (field.state === "hidden" && field.value === "mine") {
          field.state = "revealed";
        }
      });
    });
    return world;
  }

  // count neighboring mines

  world.chunks[`${chunkPosk[0]},${chunkPosk[1]}`].fields[
    ravel(localPos, CHUNK_SHAPE)
  ].value = match(field.value)
    .with("uncounted", () => {
      let nMines = 0;

      neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
        ([[cx, cy], [nx, ny]]) => {
          world = addChunk(world, [cx, cy], DIFFICULTY);

          const nChunk = world.chunks[`${cx},${cy}`];

          const nField = nChunk.fields[ravel([nx, ny], CHUNK_SHAPE)];

          if (nField.value === "mine") {
            nMines += 1;
          }
        }
      );

      if (nMines < 0 || nMines > 8) {
        throw new Error(`Invalid number of mines: ${nMines}`);
      }

      return nMines as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    })
    .otherwise(() => field.value);

  if (field.value === 0) {
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
    return world;
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

export const mark = (world: World, chunkPos: Vec2, localPos: Vec2): World =>
  produce(world, (draft) => {
    if (draft.isExploded) {
      return;
    }

    const chunk = draft.chunks[`${chunkPos[0]},${chunkPos[1]}`];

    if (chunk) {
      const field = chunk.fields[ravel(localPos, CHUNK_SHAPE)];

      match(field.state)
        .with("hidden", () => {
          field.state = "flagged";

          // increment nFlags in neighbors

          neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
            ([[cx, cy], [nx, ny]]) => {
              draft = addChunk(draft, [cx, cy], DIFFICULTY);

              const nChunk = draft.chunks[`${cx},${cy}`];

              const nIdx = ravel([nx, ny], CHUNK_SHAPE);

              const nField = nChunk.fields[nIdx];

              nField.nFlags += 1;
            }
          );
        })
        .with("flagged", () => {
          field.state = "questioned";

          // decrement nFlags in neighbors

          neighbors(chunk.pos, localPos, CHUNK_SHAPE).forEach(
            ([[cx, cy], [nx, ny]]) => {
              const nChunk = draft.chunks[`${cx},${cy}`];

              const nIdx = ravel([nx, ny], CHUNK_SHAPE);

              const nField = nChunk.fields[nIdx];

              nField.nFlags -= 1;
            }
          );
        })
        .with("questioned", () => {
          field.state = "hidden";
        })
        .otherwise(() => {});
    }
  });

export const worldPosToChunkPos = (pos: Vec2): Vec2 => [
  Math.floor(pos[0] / CHUNK_SHAPE[0]),
  Math.floor(pos[1] / CHUNK_SHAPE[1]),
];

export const worldPosToLocalPos = (pos: Vec2): Vec2 => [
  pos[0] % CHUNK_SHAPE[0],
  pos[1] % CHUNK_SHAPE[1],
];
