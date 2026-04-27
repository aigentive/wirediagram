import { describe, expect, it } from "vitest";
import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { WireDiagram } from "@aigentive/wire-core";
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

  it("converts child moves from React Flow parent-relative positions to Wire absolute positions", () => {
    const diagram: WireDiagram = {
      version: 1,
      layout: "LR",
      nodes: [
        { id: "group", kind: "group", title: "Group", children: ["child"] },
        { id: "child", kind: "action", title: "Child", parent: "group" }
      ],
      edges: []
    };
    const nodes: Node[] = [
      { id: "group", position: { x: 100, y: 40 }, data: {}, type: "wire-group" },
      { id: "child", parentId: "group", position: { x: 20, y: 30 }, data: {}, type: "wire-action" }
    ];

    expect(
      wireActionsFromNodeChanges(
        [{ type: "position", id: "child", position: { x: 50, y: 70 }, dragging: false }],
        diagram,
        nodes
      )
    ).toEqual([
      { type: "node.move", id: "child", position: { x: 150, y: 110 } }
    ]);
  });

  it("moves group descendants with the group so children remain visually attached", () => {
    const diagram: WireDiagram = {
      version: 1,
      layout: "LR",
      nodes: [
        { id: "group", kind: "group", title: "Group", children: ["a", "b"] },
        { id: "a", kind: "trigger", title: "A", parent: "group" },
        { id: "b", kind: "action", title: "B", parent: "group" }
      ],
      edges: []
    };
    const nodes: Node[] = [
      { id: "group", position: { x: 100, y: 40 }, data: {}, type: "wire-group" },
      { id: "a", parentId: "group", position: { x: 20, y: 30 }, data: {}, type: "wire-trigger" },
      { id: "b", parentId: "group", position: { x: 260, y: 30 }, data: {}, type: "wire-action" }
    ];

    expect(
      wireActionsFromNodeChanges(
        [{ type: "position", id: "group", position: { x: 100, y: 10 }, dragging: false }],
        diagram,
        nodes
      )
    ).toEqual([
      { type: "node.move", id: "group", position: { x: 100, y: 10 } },
      { type: "node.move", id: "a", position: { x: 120, y: 40 } },
      { type: "node.move", id: "b", position: { x: 360, y: 40 } }
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
