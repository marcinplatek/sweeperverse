"use client";

import shallow from "zustand/shallow";
import { useStore } from "../store/store";
import { Chunk } from "./chunk";
import { Controller } from "../../src/controller/controller";

export interface ViewProps {}

export const View = (props: ViewProps) => {
  const { world } = useStore(
    (state) => ({
      view: state.view,
      world: state.world,
    }),
    shallow
  );

  return (
    <div className="w-screen h-screen bg-red-200 relative p-2 overflow-clip select-none">
      <Controller />
      {Object.values(world.chunks).map((chunk) => (
        <Chunk
          key={chunk.pos.join(",")}
          data={chunk}
          gameOver={world.isExploded}
        />
      ))}
    </div>
  );
};
