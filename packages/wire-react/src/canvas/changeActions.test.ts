import { describe, expect, it } from "vitest";
import type { Edge, EdgeChange, NodeChange } from "@xyflow/react";
import {
  selectionFromEdgeChanges,
  selectionFromNodeChanges,
  wireActionsFromEdgeChanges,
  wireActionsFromNodeChanges,
  wireActionsFromSelectionDelete
} from "./changeActions.js";

describe("wireActionsFromNodeChanges", () => {
  it("does not commit a node move while the node is still dragging", () => {
    const changes: NodeChange[] = [
      { type: "position", id: "node-1", position: { x: 120, y: 80 }, dragging: true }
    ];

    expect(wireActionsFromNodeChanges(changes)).toEqual([]);
  });

  it("commits one node move when dragging finishes", () => {
    const changes: NodeChange[] = [
      { type: "position", id: "node-1", position: { x: 120, y: 80 }, dragging: false }
    ];

    expect(wireActionsFromNodeChanges(changes)).toEqual([
      { type: "node.move", id: "node-1", position: { x: 120, y: 80 } }
    ]);
  });
});

describe("wireActionsFromEdgeChanges", () => {
  it("disconnects synthesized edges by endpoints and branch", () => {
    const edge: Edge = {
      id: "route->notify:sales",
      source: "route",
      target: "notify",
      data: { branch: "sales" },
      position: { x: 0, y: 0 }
    };
    const changes: EdgeChange[] = [{ type: "remove", id: edge.id }];

    expect(wireActionsFromEdgeChanges(changes, new Map([[edge.id, edge]]), new Set())).toEqual([
      { type: "edge.disconnect", from: "route", to: "notify", branch: "sales" }
    ]);
  });

  it("removes explicit edges by id", () => {
    const edge: Edge = {
      id: "a-to-b",
      source: "a",
      target: "b",
      position: { x: 0, y: 0 }
    };
    const changes: EdgeChange[] = [{ type: "remove", id: edge.id }];

    expect(wireActionsFromEdgeChanges(changes, new Map([[edge.id, edge]]), new Set([edge.id]))).toEqual([
      { type: "edge.remove", id: "a-to-b" }
    ]);
  });
});

describe("wireActionsFromSelectionDelete", () => {
  it("removes selected nodes", () => {
    expect(
      wireActionsFromSelectionDelete({ nodeIds: ["a", "b"], edgeIds: [] }, new Map(), new Set())
    ).toEqual([
      { type: "node.remove", id: "a" },
      { type: "node.remove", id: "b" }
    ]);
  });

  it("removes selected edges using the same explicit/synthesized rules as React Flow changes", () => {
    const explicit: Edge = {
      id: "a-to-b",
      source: "a",
      target: "b",
      position: { x: 0, y: 0 }
    };
    const synthesized: Edge = {
      id: "route->notify:sales",
      source: "route",
      target: "notify",
      data: { branch: "sales" },
      position: { x: 0, y: 0 }
    };
    const edgeById = new Map([
      [explicit.id, explicit],
      [synthesized.id, synthesized]
    ]);

    expect(
      wireActionsFromSelectionDelete(
        { nodeIds: [], edgeIds: [explicit.id, synthesized.id] },
        edgeById,
        new Set([explicit.id])
      )
    ).toEqual([
      { type: "edge.remove", id: "a-to-b" },
      { type: "edge.disconnect", from: "route", to: "notify", branch: "sales" }
    ]);
  });

  it("skips selected edges that will be pruned by a selected node removal", () => {
    const edge: Edge = {
      id: "a-to-b",
      source: "a",
      target: "b",
      position: { x: 0, y: 0 }
    };

    expect(
      wireActionsFromSelectionDelete(
        { nodeIds: ["a"], edgeIds: [edge.id] },
        new Map([[edge.id, edge]]),
        new Set([edge.id])
      )
    ).toEqual([{ type: "node.remove", id: "a" }]);
  });
});

describe("selectionFromNodeChanges", () => {
  it("clears selected edges when a node is selected", () => {
    expect(
      selectionFromNodeChanges(
        { nodeIds: [], edgeIds: ["a-to-b"] },
        [{ type: "select", id: "a", selected: true }]
      )
    ).toEqual({ nodeIds: ["a"], edgeIds: [] });
  });

  it("preserves selected edges when a node is only deselected", () => {
    expect(
      selectionFromNodeChanges(
        { nodeIds: ["a"], edgeIds: ["a-to-b"] },
        [{ type: "select", id: "a", selected: false }]
      )
    ).toEqual({ nodeIds: [], edgeIds: ["a-to-b"] });
  });
});

describe("selectionFromEdgeChanges", () => {
  it("clears selected nodes when an edge is selected", () => {
    expect(
      selectionFromEdgeChanges(
        { nodeIds: ["a"], edgeIds: [] },
        [{ type: "select", id: "a-to-b", selected: true }]
      )
    ).toEqual({ nodeIds: [], edgeIds: ["a-to-b"] });
  });

  it("preserves selected nodes when an edge is only deselected", () => {
    expect(
      selectionFromEdgeChanges(
        { nodeIds: ["a"], edgeIds: ["a-to-b"] },
        [{ type: "select", id: "a-to-b", selected: false }]
      )
    ).toEqual({ nodeIds: ["a"], edgeIds: [] });
  });
});
