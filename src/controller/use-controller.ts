import { useCallback, useEffect } from "react";
import { match } from "ts-pattern";
import shallow from "zustand/shallow";
import { useStore } from "../store/store";

export const useController = () => {
  const { view, move } = useStore(
    (state) => ({
      view: state.view,
      move: state.move,
    }),
    shallow
  );

  const keyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      match(e.key)
        .with("ArrowUp", () => move(0, -1, 0))
        .with("ArrowDown", () => move(0, 1, 0))
        .with("ArrowLeft", () => move(-1, 0, 0))
        .with("ArrowRight", () => move(1, 0, 0))
        .with("+", () => move(0, 0, 1))
        .with("-", () => move(0, 0, -1))
        .otherwise(() => {});
    },
    [move]
  );

  useEffect(() => {
    window.addEventListener("keydown", keyDownHandler);

    return () => window.removeEventListener("keydown", keyDownHandler);
  }, [keyDownHandler]);
};
