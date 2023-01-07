import create from "zustand";
import { State, Vec2 } from "../types";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { addChunk, check, mark, newWorld } from "../core/world";

export const useStore = create<State>()(
  devtools(
    immer((set) => ({
      world: addChunk(newWorld(), [0, 0], 0.1),
      view: {
        position: [0, 0],
        zoom: 1,
      },
      config: {
        scrollSensitivity: 20,
        zoomSensitivity: 1,
        difficulty: 0.1,
      },
      move: (x: number, y: number, zoom: number) =>
        set((state) => {
          state.view.position[0] += x * state.config.scrollSensitivity;
          state.view.position[1] += y * state.config.scrollSensitivity;
          state.view.zoom += zoom * state.config.zoomSensitivity;
        }),
      check: (chunkPos: Vec2, localPos: Vec2) =>
        set((state) => {
          state.world = check(state.world, chunkPos, localPos);
        }),
      mark: (chunkPos: Vec2, localPos: Vec2) =>
        set((state) => {
          state.world = mark(state.world, chunkPos, localPos);
        }),
    }))
  )
);
