import { describe, expect, it } from "vitest";
import { asSide, POSITION_TO_SIDE, SIDE_TO_POSITION, WirePosition } from "./positions.js";

describe("wire canvas positions", () => {
  it("maps between public positions and canonical sides", () => {
    expect(WirePosition).toEqual({
      Top: "top",
      Bottom: "bottom",
      Left: "left",
      Right: "right"
    });
    expect(SIDE_TO_POSITION.left).toBe(WirePosition.Left);
    expect(POSITION_TO_SIDE[WirePosition.Bottom]).toBe("bottom");
  });

  it("normalizes optional strings into sides", () => {
    expect(asSide("top")).toBe("top");
    expect(asSide("right")).toBe("right");
    expect(asSide("unknown")).toBeUndefined();
    expect(asSide(null)).toBeUndefined();
    expect(asSide(undefined)).toBeUndefined();
  });
});
