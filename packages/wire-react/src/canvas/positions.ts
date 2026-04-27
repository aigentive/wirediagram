import { Position } from "@xyflow/react";
import type { Side } from "@aigentive/wire-core";

export const SIDE_TO_POSITION: Record<Side, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right
};

export const POSITION_TO_SIDE: Record<string, Side> = {
  [Position.Top]: "top",
  [Position.Bottom]: "bottom",
  [Position.Left]: "left",
  [Position.Right]: "right"
};

export function asSide(value: string | null | undefined): Side | undefined {
  if (!value) return undefined;
  return POSITION_TO_SIDE[value];
}
