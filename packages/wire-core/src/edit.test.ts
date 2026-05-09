import { describe, expect, it } from "vitest";
import { addNode, addNote, connect, disconnect, emptyDiagram, removeNode, setLayout, updateNode } from "./edit.js";
import { validate } from "./validate.js";

describe("edit primitives", () => {
  it("addNode generates ids and validates result", () => {
    const d0 = emptyDiagram();
    const { diagram: d1, node: trigger } = addNode(d0, { kind: "trigger", title: "Webhook fires" });
    expect(trigger.id).toBe("webhook-fires");
    const { diagram: d2, node: trigger2 } = addNode(d1, { kind: "trigger", title: "Webhook fires" });
    expect(trigger2.id).toBe("webhook-fires-2");
    expect(d2.nodes).toHaveLength(2);
  });

  it("addNode resolves branch into from='id.branch'", () => {
    const d0 = emptyDiagram();
    const { diagram: d1 } = addNode(d0, { kind: "trigger", title: "T", id: "t" });
    const { diagram: d2 } = addNode(d1, {
      kind: "condition", title: "Route", id: "r", from: "t", branches: ["yes", "no"]
    });
    const { diagram: d3, node: branchAction } = addNode(d2, {
      kind: "action", title: "Yes path", id: "yes", from: "r", branch: "yes"
    });
    expect(branchAction.from).toBe("r.yes");
    const v = validate(d3);
    expect(v.valid).toBe(true);
  });

  it("connect prefers `from` on target when no label/tone given", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "action", title: "B", id: "b" }).diagram;
    d = connect(d, { from: "a", to: "b" });
    expect(d.nodes.find((n) => n.id === "b")?.from).toBe("a");
    expect(d.edges).toEqual([]);
  });

  it("connect with label produces explicit edge", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "action", title: "B", id: "b" }).diagram;
    d = connect(d, { from: "a", to: "b", label: "happy" });
    expect(d.edges).toHaveLength(1);
    expect(d.edges[0]?.label).toBe("happy");
  });

  it("disconnect removes from-ref", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "action", title: "B", id: "b", from: "a" }).diagram;
    d = disconnect(d, { from: "a", to: "b" });
    expect(d.nodes.find((n) => n.id === "b")?.from).toBeUndefined();
  });

  it("removeNode prunes from-refs that pointed to it", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "action", title: "B", id: "b", from: "a" }).diagram;
    d = removeNode(d, "a").diagram;
    expect(d.nodes.find((n) => n.id === "b")?.from).toBeUndefined();
    expect(d.nodes).toHaveLength(1);
  });

  it("updateNode validates the merged result", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "ai", title: "Plan", id: "plan", model: "gpt-4" }).diagram;
    const { diagram: d2, node } = updateNode(d, "plan", { model: "gpt-4.1", tone: "ai" });
    expect(node.kind).toBe("ai");
    expect((node as { model?: string }).model).toBe("gpt-4.1");
    void d2;
  });

  it("setLayout updates direction", () => {
    const d0 = emptyDiagram({ layout: "LR" });
    const d1 = setLayout(d0, "TB");
    expect(d1.layout).toBe("TB");
  });

  it("addNote attaches to a host", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNote(d, { title: "watch this", attachedTo: "a" }).diagram;
    expect(d.nodes.find((n) => n.kind === "note")?.attachedTo).toBe("a");
  });

  it("addNode throws on explicit id collision", () => {
    const d0 = emptyDiagram();
    const d = addNode(d0, { kind: "trigger", title: "A", id: "dup" }).diagram;
    expect(() => addNode(d, { kind: "action", title: "B", id: "dup" })).toThrow(/dup/);
  });

  it("connect rejects branched ref on non-condition", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "action", title: "B", id: "b" }).diagram;
    expect(() => connect(d, { from: "a", to: "b", branch: "yes" })).toThrow(/condition/);
  });

  it("connect rejects unknown branch", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "T", id: "t" }).diagram;
    d = addNode(d, { kind: "condition", title: "C", id: "c", from: "t", branches: ["yes", "no"] }).diagram;
    d = addNode(d, { kind: "action", title: "X", id: "x" }).diagram;
    expect(() => connect(d, { from: "c", to: "x", branch: "maybe" })).toThrow(/no branch.*maybe/);
  });

  it("connect rejects edges to notes", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNote(d, { title: "n", id: "n" }).diagram;
    expect(() => connect(d, { from: "a", to: "n" })).toThrow(/notes/i);
  });

  it("disconnect without branch removes branched refs too", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "T", id: "t" }).diagram;
    d = addNode(d, { kind: "condition", title: "C", id: "c", from: "t", branches: ["a", "b"] }).diagram;
    d = addNode(d, { kind: "action", title: "X", id: "x", from: "c", branch: "a" }).diagram;
    d = disconnect(d, { from: "c", to: "x" });
    expect(d.nodes.find((n) => n.id === "x")?.from).toBeUndefined();
  });

  it("updateNode clears a field when patch value is null", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "ai", title: "P", id: "p", model: "gpt-4" }).diagram;
    const { node } = updateNode(d, "p", { model: null });
    expect((node as { model?: string }).model).toBeUndefined();
  });

  it("addNode rejects branch combined with array from", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "trigger", title: "A", id: "a" }).diagram;
    d = addNode(d, { kind: "trigger", title: "B", id: "b" }).diagram;
    expect(() =>
      addNode(d, { kind: "action", title: "C", id: "c", from: ["a", "b"], branch: "yes" })
    ).toThrow(/branch can only/);
  });

  it("removeNode strips group.children entries", () => {
    const d0 = emptyDiagram();
    let d = addNode(d0, { kind: "group", title: "G", id: "g" }).diagram;
    d = addNode(d, { kind: "trigger", title: "A", id: "a", parent: "g" }).diagram;
    // Manually set children since addNode doesn't auto-populate
    d = updateNode(d, "g", { children: ["a"] }).diagram;
    expect((d.nodes[0] as { children?: string[] }).children).toEqual(["a"]);
    d = removeNode(d, "a").diagram;
    expect((d.nodes[0] as { children?: string[] }).children).toBeUndefined();
  });
});

describe("schema-level guards", () => {
  it("rejects ids with dots", async () => {
    const { parseWireDiagram } = await import("./schema.js");
    expect(() =>
      parseWireDiagram({
        nodes: [{ id: "with.dot", kind: "trigger", title: "T" }]
      })
    ).toThrow(/id must match/);
  });

  it("folds `after` into `from` on parse", async () => {
    const { parseWireDiagram } = await import("./schema.js");
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", after: "a" }
      ]
    });
    expect(d.nodes[1]?.from).toBe("a");
  });
});
