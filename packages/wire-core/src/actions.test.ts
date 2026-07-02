import { describe, expect, it } from "vitest";
import { applyWireAction, applyWireActions } from "./actions.js";
import { emptyDiagram } from "./edit.js";
import { validate } from "./validate.js";

describe("wire actions", () => {
  it("adds a node through the shared reducer", () => {
    const result = applyWireAction(emptyDiagram(), {
      type: "node.add",
      node: { kind: "trigger", title: "Webhook fires", id: "webhook" }
    });

    expect(result.diagram.nodes).toHaveLength(1);
    expect(result.diagram.nodes[0]?.id).toBe("webhook");
    expect(result.validation.valid).toBe(true);
    expect(result.changedNodeIds).toEqual(["webhook"]);
    expect(result.changedEdgeIds).toEqual([]);
    expect(result.inverse).toEqual({ type: "node.remove", id: "webhook" });
  });

  it("applies batches in order and validates once at the end", () => {
    const result = applyWireActions(emptyDiagram(), [
      { type: "node.add", node: { kind: "trigger", title: "Start", id: "start" } },
      { type: "node.add", node: { kind: "action", title: "Run", id: "run", from: "start" } },
      { type: "node.patch", id: "run", patch: { tone: "success" } }
    ]);

    expect(result.diagram.nodes).toHaveLength(2);
    expect(result.diagram.nodes.find((n) => n.id === "run")?.from).toBe("start");
    expect(result.diagram.nodes.find((n) => n.id === "run")?.tone).toBe("success");
    expect(result.validation.valid).toBe(true);
    expect(result.changedNodeIds).toEqual(["start", "run"]);
    expect(result.inverse).toEqual({
      type: "batch",
      actions: [
        { type: "node.patch", id: "run", patch: { tone: null } },
        { type: "node.remove", id: "run" },
        { type: "node.remove", id: "start" }
      ]
    });
  });

  it("moves and resizes nodes with inverse patch actions", () => {
    const base = applyWireAction(emptyDiagram(), {
      type: "node.add",
      node: { kind: "action", title: "Run", id: "run" }
    }).diagram;

    const moved = applyWireAction(base, {
      type: "node.move",
      id: "run",
      position: { x: 42, y: 84 }
    });
    expect(moved.diagram.nodes[0]?.position).toEqual({ x: 42, y: 84 });
    expect(moved.inverse).toEqual({ type: "node.patch", id: "run", patch: { position: null } });

    const resized = applyWireAction(moved.diagram, {
      type: "node.resize",
      id: "run",
      size: { width: 320, height: 120 }
    });
    expect(resized.diagram.nodes[0]?.size).toEqual({ width: 320, height: 120 });
    expect(resized.inverse).toEqual({ type: "node.patch", id: "run", patch: { size: null } });
  });

  it("creates explicit styled edges when edge-only fields are supplied", () => {
    const base = applyWireActions(emptyDiagram(), [
      { type: "node.add", node: { kind: "trigger", title: "A", id: "a" } },
      { type: "node.add", node: { kind: "action", title: "B", id: "b" } }
    ]).diagram;

    const result = applyWireAction(base, {
      type: "edge.connect",
      edge: {
        from: "a",
        to: "b",
        label: "approved",
        fromHandle: "right",
        toHandle: "left",
        routing: "smoothstep",
        style: { stroke: "#2563eb", markerEnd: "arrow" },
        labelStyle: { fill: "#172554", background: "#eff6ff" }
      }
    });

    expect(result.diagram.edges).toHaveLength(1);
    expect(result.diagram.edges[0]).toMatchObject({
      id: "a-to-b",
      from: "a",
      to: "b",
      label: "approved",
      fromHandle: "right",
      toHandle: "left",
      routing: "smoothstep",
      style: { stroke: "#2563eb", markerEnd: "arrow" },
      labelStyle: { fill: "#172554", background: "#eff6ff" }
    });
    expect(validate(result.diagram).valid).toBe(true);
    expect(result.changedEdgeIds).toEqual(["a-to-b"]);
    expect(result.inverse).toEqual({ type: "edge.remove", id: "a-to-b" });
  });

  it("patches and removes explicit edges", () => {
    const withEdge = applyWireActions(emptyDiagram(), [
      { type: "node.add", node: { kind: "trigger", title: "A", id: "a" } },
      { type: "node.add", node: { kind: "action", title: "B", id: "b" } },
      { type: "edge.connect", edge: { id: "approval", from: "a", to: "b", label: "old" } }
    ]).diagram;

    const patched = applyWireAction(withEdge, {
      type: "edge.patch",
      id: "approval",
      patch: { label: "new", routing: "straight" }
    });
    expect(patched.diagram.edges[0]?.label).toBe("new");
    expect(patched.diagram.edges[0]?.routing).toBe("straight");
    expect(patched.inverse).toEqual({
      type: "edge.patch",
      id: "approval",
      patch: { label: "old", routing: null }
    });

    const removed = applyWireAction(patched.diagram, { type: "edge.remove", id: "approval" });
    expect(removed.diagram.edges).toEqual([]);
    expect(removed.inverse).toEqual({
      type: "edge.connect",
      edge: { id: "approval", from: "a", to: "b", label: "new", routing: "straight" }
    });
  });

  it("undoes and redoes implicit edge disconnects", () => {
    const connected = applyWireActions(emptyDiagram(), [
      { type: "node.add", node: { kind: "trigger", title: "A", id: "a" } },
      { type: "node.add", node: { kind: "action", title: "B", id: "b", from: "a" } }
    ]).diagram;

    const disconnected = applyWireAction(connected, { type: "edge.disconnect", from: "a", to: "b" });
    expect(disconnected.diagram.nodes.find((node) => node.id === "b")?.from).toBeUndefined();
    expect(disconnected.inverse).toEqual({ type: "diagram.replace", diagram: connected });

    const undone = applyWireAction(disconnected.diagram, disconnected.inverse!);
    expect(undone.diagram).toEqual(connected);
    const redone = applyWireAction(undone.diagram, undone.inverse!);
    expect(redone.diagram).toEqual(disconnected.diagram);
  });

  it("undoes node removal with pruned references intact", () => {
    const connected = applyWireActions(emptyDiagram(), [
      { type: "node.add", node: { kind: "trigger", title: "A", id: "a" } },
      { type: "node.add", node: { kind: "action", title: "B", id: "b", from: "a" } },
      { type: "node.add", node: { kind: "action", title: "C", id: "c", from: "b" } }
    ]).diagram;

    const removed = applyWireAction(connected, { type: "node.remove", id: "b" });
    expect(removed.diagram.nodes.map((node) => node.id)).toEqual(["a", "c"]);
    expect(removed.diagram.nodes.find((node) => node.id === "c")?.from).toBeUndefined();
    expect(removed.inverse).toEqual({ type: "diagram.replace", diagram: connected });

    const undone = applyWireAction(removed.diagram, removed.inverse!);
    expect(undone.diagram).toEqual(connected);
  });

  it("patches diagram metadata without replacing unrelated keys", () => {
    const base = { ...emptyDiagram({ id: "d" }), metadata: { owner: "team-a", stale: true } };
    const result = applyWireAction(base, {
      type: "metadata.patch",
      patch: { stale: null, status: "draft" }
    });

    expect(result.diagram.metadata).toEqual({ owner: "team-a", status: "draft" });
    expect(result.inverse).toEqual({
      type: "metadata.patch",
      patch: { stale: true, status: null }
    });
  });

  it("does not partially mutate the caller diagram when a batch action fails", () => {
    const base = emptyDiagram();

    expect(() =>
      applyWireActions(base, [
        { type: "node.add", node: { kind: "trigger", title: "A", id: "a" } },
        { type: "edge.connect", edge: { from: "missing", to: "a" } }
      ])
    ).toThrow(/Source node "missing" not found/);

    expect(base.nodes).toEqual([]);
  });
});
