import shallow from "zustand/shallow";
import { CHUNK_SHAPE, FIELD_SHAPE } from "../constants";
import { ChunkData } from "../types";
import { useStore } from "../store/store";
import { Field } from "./field";
import { unravel } from "../core/utils";

export interface ChunkProps {
  gameOver?: boolean;
  data: ChunkData;
  onCheck?: (id: string) => void;
  onMark?: (id: string) => void;
}

export const Chunk = (props: ChunkProps) => {
  const { view, check, mark } = useStore(
    (state) => ({
      view: state.view,
      check: state.check,
      mark: state.mark,
    }),
    shallow
  );

  return (
    <div
      className="whitespace-pre absolute bg-blue-500 grid"
      style={{
        left: props.data.pos[0] + view.position[0],
        top: props.data.pos[1] + view.position[1],
        gridTemplateColumns: `repeat(${CHUNK_SHAPE[0]}, minmax(0, 1fr))`,
        width: CHUNK_SHAPE[0] * FIELD_SHAPE[0],
      }}
    >
      {props.data.fields.map((field, i) => (
        <Field
          gameOver={props.gameOver}
          key={i}
          data={field}
          onCheck={() => check(props.data.pos, unravel(i, CHUNK_SHAPE))}
          onMark={() => mark(props.data.pos, unravel(i, CHUNK_SHAPE))}
        />
      ))}
    </div>
  );
};
