import type { Side } from "@aigentive/wire-core";

export type WireCanvasPosition = Side;

export const WirePosition = {
  Top: "top",
  Bottom: "bottom",
  Left: "left",
  Right: "right"
} as const satisfies Record<string, WireCanvasPosition>;

export const SIDE_TO_POSITION: Record<Side, WireCanvasPosition> = {
  top: WirePosition.Top,
  bottom: WirePosition.Bottom,
  left: WirePosition.Left,
  right: WirePosition.Right
};

export const POSITION_TO_SIDE: Record<string, Side> = {
  [WirePosition.Top]: "top",
  [WirePosition.Bottom]: "bottom",
  [WirePosition.Left]: "left",
  [WirePosition.Right]: "right"
};

export function asSide(value: string | null | undefined): Side | undefined {
  if (!value) return undefined;
  return POSITION_TO_SIDE[value];
}
