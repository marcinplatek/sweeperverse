import { Vec2 } from "../types";

export const unravel = (idx: number, shape: Vec2): Vec2 => {
  const [width, height] = shape;
  return [idx % width, Math.floor(idx / width)];
};

export const ravel = (pos: Vec2, shape: Vec2): number => {
  const [x, y] = pos;
  const [width, height] = shape;
  return y * width + x;
};
