import { describe, expect, it } from "vitest";
import { emptyDiagram } from "@aigentive/wire-core";
import {
  canonicalWireDiagram,
  normalizeWireSelection,
  normalizeWireViewport,
  sameWireDiagram,
  sameWireSelection,
  sameWireViewport
} from "./runtimeState.js";

describe("wire provider runtime state helpers", () => {
  it("normalizes selection values with sorted unique ids", () => {
    expect(normalizeWireSelection({
      nodeIds: ["b", "a", "a"],
      edgeIds: ["edge-b", "edge-a", "edge-b"]
    })).toEqual({
      nodeIds: ["a", "b"],
      edgeIds: ["edge-a", "edge-b"]
    });
    expect(sameWireSelection(
      { nodeIds: ["a", "b"], edgeIds: ["edge-a"] },
      { nodeIds: ["b", "a", "a"], edgeIds: ["edge-a"] }
    )).toBe(true);
  });

  it("normalizes finite viewport values and rejects invalid viewports", () => {
    expect(normalizeWireViewport({ x: -0, y: 0, zoom: 1 })).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(sameWireViewport({ x: -0, y: 0, zoom: 1 }, { x: 0, y: -0, zoom: 1 })).toBe(true);
    expect(() => normalizeWireViewport({ x: Number.NaN, y: 0, zoom: 1 })).toThrow(/x must be finite/);
    expect(() => normalizeWireViewport({ x: 0, y: 0, zoom: 0 })).toThrow(/zoom must be greater than 0/);
  });

  it("creates stable diagram snapshots for dirty comparisons", () => {
    const left = {
      ...emptyDiagram({ id: "stable", title: "Stable" }),
      metadata: { b: true, a: 1 }
    };
    const right = {
      ...emptyDiagram({ id: "stable", title: "Stable" }),
      metadata: { a: 1, b: true }
    };

    expect(canonicalWireDiagram(left)).toBe(canonicalWireDiagram(right));
    expect(sameWireDiagram(left, right)).toBe(true);
  });
});
