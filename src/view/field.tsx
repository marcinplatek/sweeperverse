import { match, P } from "ts-pattern";
import { FIELD_SHAPE } from "../constants";
import { FieldData } from "../types";

export interface FieldProps {
  gameOver?: boolean;
  data: FieldData;
  onCheck?: () => void;
  onMark?: () => void;
}

export const Field = (props: FieldProps) => {
  return (
    <div
      onClick={props.onCheck}
      onContextMenu={(e) => {
        e.preventDefault();
        props.onMark?.();
      }}
      className={`text-center font-bold text-lg align-middle active:bg-slate-400 cursor-pointer shadow-inner ${match(
        props.data
      )
        .with(
          { state: "revealed", value: 1 },
          () => "bg-gray-300 text-blue-500"
        )
        .with(
          { state: "revealed", value: 2 },
          () => "bg-gray-300 text-green-500"
        )
        .with({ state: "revealed", value: 3 }, () => "bg-gray-300 text-red-500")
        .with(
          { state: "revealed", value: 4 },
          () => "bg-gray-300 text-purple-500"
        )
        .with(
          { state: "revealed", value: 5 },
          () => "bg-gray-300 text-yellow-500"
        )
        .with(
          { state: "revealed", value: 6 },
          () => "bg-gray-300 text-pink-500"
        )
        .with(
          { state: "revealed", value: 7 },
          () => "bg-gray-300 text-orange-500"
        )
        .with(
          { state: "revealed", value: 8 },
          () => "bg-gray-300 text-teal-500"
        )
        .with({ state: "revealed" }, () => "bg-gray-300")
        .otherwise(() => "bg-gray-200")}`}
      style={{
        width: FIELD_SHAPE[0] + "px",
        height: FIELD_SHAPE[1] + "px",
      }}
    >
      {match(props.data)
        .with(
          {
            state: "hidden",
          },
          () => " "
        )
        .with(
          {
            state: "flagged",
          },
          () => (props.gameOver && props.data.value != "mine" ? "❌" : "🚩")
        )
        .with(
          {
            state: "questioned",
          },
          () => "❓"
        )
        .with(
          {
            value: "mine",
          },
          () => "💣"
        )
        .with(
          {
            value: 0,
          },
          () => " "
        )
        .with(
          {
            value: P.select(P.number),
          },
          (value) => value.toString()
        )
        .otherwise(() => "E")}
    </div>
  );
};
