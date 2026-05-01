import { describe, expect, it } from "vitest";
import type { WireDiagram, WireNode } from "@aigentive/wire-core";
import {
  buildWireCanvasModel,
  defaultSides,
  descendantsOfGroup,
  handlePoint,
  markerId,
  sourceSidesForNode,
  targetSidesForNode
} from "./geometry.js";

describe("wire canvas geometry", () => {
  it("resolves default sides for every layout direction", () => {
    expect(defaultSides("LR")).toEqual({ from: "right", to: "left" });
    expect(defaultSides("RL")).toEqual({ from: "left", to: "right" });
    expect(defaultSides("TB")).toEqual({ from: "bottom", to: "top" });
    expect(defaultSides("BT")).toEqual({ from: "top", to: "bottom" });
  });

  it("uses custom handles while keeping notes detached from flow handles", () => {
    const action: WireNode = {
      id: "code",
      kind: "action",
      title: "Code",
      handles: { source: ["top", "right"], target: ["bottom"] }
    };
    const note: WireNode = { id: "note", kind: "note", title: "Note" };

    expect(sourceSidesForNode(action, "LR")).toEqual(["top", "right"]);
    expect(targetSidesForNode(action, "LR")).toEqual(["bottom"]);
    expect(sourceSidesForNode(note, "LR")).toEqual([]);
    expect(targetSidesForNode(note, "LR")).toEqual([]);
  });

  it("computes handle points for cards and centered condition diamonds", () => {
    const frame = {
      id: "choice",
      node: { id: "choice", kind: "condition" as const, title: "Choice" },
      x: 40,
      y: 80,
      width: 120,
      height: 80
    };

    expect(handlePoint(frame, "left")).toEqual({ x: 40, y: 120 });
    expect(handlePoint(frame, "right")).toEqual({ x: 160, y: 120 });
    expect(handlePoint(frame, "top")).toEqual({ x: 100, y: 80 });
    expect(handlePoint(frame, "bottom")).toEqual({ x: 100, y: 160 });
  });

  it("builds frames, labels, markers, and grouped bounds from a mixed diagram", () => {
    const diagram: WireDiagram = {
      version: 1,
      id: "geometry",
      title: "Geometry",
      layout: "LR",
      nodes: [
        { id: "ops", kind: "group", title: "Ops", children: ["code"], position: { x: 0, y: 0 } },
        { id: "start", kind: "trigger", title: "Start", position: { x: 40, y: 90 } },
        {
          id: "code",
          kind: "action",
          title: "Code",
          parent: "ops",
          position: { x: 160, y: 96 },
          size: { width: 260, height: 96 },
          handles: { source: ["right"], target: ["left"] }
        },
        {
          id: "choice",
          kind: "condition",
          title: "Choice",
          position: { x: 500, y: 100 },
          branches: ["yes", "no"]
        },
        { id: "ship", kind: "end", title: "Ship", position: { x: 820, y: 90 } },
        { id: "sticky", kind: "note", title: "Sticky", attachedTo: "code" }
      ],
      edges: [
        {
          id: "start-code",
          from: "start",
          to: "code",
          label: "queued",
          style: { stroke: "#ef4444", strokeWidth: 3, markerStart: "circle", markerEnd: "diamond" },
          routing: "smoothstep"
        },
        {
          id: "code-choice",
          from: "code",
          to: "choice",
          fromHandle: "right",
          toHandle: "left",
          routing: "step"
        },
        {
          id: "choice-ship",
          from: "choice.yes",
          to: "ship",
          branch: "yes",
          routing: "straight"
        }
      ]
    };

    const model = buildWireCanvasModel(diagram, {
      edgeStyle: { stroke: "#334155", markerEnd: "arrow", curvature: 0.25 },
      edgeRouting: "bezier",
      positionOverrides: new Map([["ship", { x: 880, y: 120 }]]),
      sizeOverrides: new Map([["start", { width: 280, height: 110 }]])
    });

    expect(model.direction).toBe("LR");
    expect(model.framesById.get("start")).toMatchObject({ x: 40, y: 90, width: 280, height: 110 });
    expect(model.framesById.get("ship")).toMatchObject({ x: 880, y: 120 });
    expect(model.frames[0]?.id).toBe("ops");
    expect(model.nodeById.get("sticky")?.kind).toBe("note");
    expect(model.edges).toHaveLength(3);
    expect(model.explicitEdgeIds).toEqual(new Set(["start-code", "code-choice", "choice-ship"]));

    const styled = model.edges.find((edge) => edge.edge.id === "start-code");
    expect(styled?.label).toBe("queued");
    expect(styled?.style).toMatchObject({
      stroke: "#ef4444",
      strokeWidth: 3,
      markerStart: "circle",
      markerEnd: "diamond",
      routing: "smoothstep"
    });
    expect(styled?.path).toContain("Q");

    const branched = model.edges.find((edge) => edge.edge.id === "choice-ship");
    expect(branched?.label).toBe("yes");
    expect(branched?.path).toContain("L");

    const group = model.framesById.get("ops");
    expect(group?.width).toBeGreaterThanOrEqual(320);
    expect(group?.height).toBeGreaterThanOrEqual(200);
    expect(model.bounds.maxX).toBeGreaterThan(1000);
  });

  it("routes backward bezier edges around cards", () => {
    const diagram: WireDiagram = {
      version: 1,
      id: "backward",
      title: "Backward",
      layout: "LR",
      nodes: [
        { id: "a", kind: "action", title: "A", position: { x: 300, y: 0 } },
        { id: "b", kind: "action", title: "B", position: { x: 0, y: 0 } }
      ],
      edges: [{ id: "back", from: "a", to: "b", routing: "bezier" }]
    };

    const edge = buildWireCanvasModel(diagram).edges[0];
    expect(edge?.path).toContain("C");
    expect(edge?.labelPoint).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it("finds nested group descendants and sanitizes marker ids", () => {
    const nodes: WireNode[] = [
      { id: "root", kind: "group", title: "Root" },
      { id: "child-group", kind: "group", title: "Child group", parent: "root" },
      { id: "leaf", kind: "action", title: "Leaf", parent: "child-group" }
    ];

    expect(descendantsOfGroup("root", nodes).map((node) => node.id)).toEqual(["child-group", "leaf"]);
    expect(markerId("diamond", "#38-bdf8", "end")).toBe("wire-canvas-diamond-end-38bdf8");
  });
});
