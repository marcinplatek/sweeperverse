"use client";

import { useStore } from "../store/store";
import shallow from "zustand/shallow";
import { useController } from "./use-controller";

export interface ControllerProps {}

export const Controller = (props: ControllerProps) => {
  const { view } = useStore(
    (state) => ({
      view: state.view,
    }),
    shallow
  );

  useController();

  return (
    <div>
      {view.position[0]}:{view.position[1]}:{view.zoom}
    </div>
  );
};
