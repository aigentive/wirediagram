import { describe, expect, it } from "vitest";
import { layoutDiagram } from "./layout.js";
import { parseWireDiagram } from "./schema.js";

describe("layoutDiagram", () => {
  it("assigns positions to flow nodes", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "ai", title: "B", from: "a" },
        { id: "c", kind: "action", title: "C", from: "b" }
      ]
    });
    const layout = layoutDiagram(d);
    expect(layout.nodes).toHaveLength(3);
    for (const node of layout.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.width).toBeGreaterThan(0);
    }
    expect(layout.bounds.width).toBeGreaterThan(0);
  });

  it("places notes near their host", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "ai", title: "B", from: "a" },
        { id: "n", kind: "note", title: "Watch", attachedTo: "b" }
      ]
    });
    const layout = layoutDiagram(d);
    const host = layout.nodes.find((n) => n.id === "b")!;
    const note = layout.nodes.find((n) => n.id === "n")!;
    expect(host).toBeTruthy();
    expect(note).toBeTruthy();
    expect(note.y + note.height).toBeLessThanOrEqual(host.y - 32);
    expect(note.x).toBe(host.x);
  });

  it("respects explicit position on a node", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A", position: { x: 100, y: 50 } },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    const layout = layoutDiagram(d);
    const a = layout.nodes.find((n) => n.id === "a")!;
    expect(a.x).toBe(100);
    expect(a.y).toBe(50);
  });
});
