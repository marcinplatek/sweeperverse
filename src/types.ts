export type Vec2 = [number, number];

export type MapState = {};

export type ViewState = {
  position: Vec2;
  zoom: number;
};

export type ConfigState = {
  scrollSensitivity: number;
  zoomSensitivity: number;
  difficulty: number;
};

export type Callbacks = {
  move: (x: number, y: number, zoom: number) => void;
  check: (chunkPos: Vec2, localPos: Vec2) => void;
  mark: (chunkPos: Vec2, localPos: Vec2) => void;
};

export type State = {
  world: World;
  view: ViewState;
  config: ConfigState;
} & Callbacks;

export type Fin9 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type FieldState = "revealed" | "hidden" | "flagged" | "questioned";
export type FieldValue = "mine" | "uncounted" | Fin9;

export type FieldData = {
  state: FieldState;
  value: FieldValue;
  nFlags: Fin9;
};

export type ChunkData = {
  pos: Vec2;
  fields: FieldData[];
};

export type Vec2Hash = `${number},${number}`;

export type World = {
  isExploded: boolean;
  chunks: Record<Vec2Hash, ChunkData>;
};
