import { describe, expect, it } from "vitest";
import { parseWireDiagram, safeParseWireDiagram, splitFromRef } from "./schema.js";

const MIN_DIAGRAM = {
  layout: "LR",
  nodes: [
    { id: "webhook", kind: "trigger", title: "Webhook fires" },
    { id: "classify", kind: "ai", title: "Classify intent", from: "webhook", model: "gpt-4.1" }
  ]
};

describe("schema", () => {
  it("parses the canonical workflow example", () => {
    const diagram = parseWireDiagram({
      layout: "LR",
      nodes: [
        { id: "webhook", kind: "trigger", title: "Webhook fires" },
        { id: "classify", kind: "ai", title: "Classify intent", from: "webhook", model: "gpt-4.1" },
        {
          id: "route",
          kind: "condition",
          title: "Route request",
          from: "classify",
          branches: ["sales", "support", "other"]
        },
        { id: "notify-sales", kind: "action", title: "Notify sales", from: "route.sales", tone: "success" },
        { id: "open-ticket", kind: "action", title: "Open support ticket", from: "route.support", tone: "warning" },
        { id: "risk-note", kind: "note", title: "Routing risk", attachedTo: "classify", body: "Check confidence." }
      ]
    });
    expect(diagram.nodes).toHaveLength(6);
    expect(diagram.layout).toBe("LR");
    expect(diagram.edges).toEqual([]);
  });

  it("applies default layout, version, edges", () => {
    const diagram = parseWireDiagram(MIN_DIAGRAM);
    expect(diagram.layout).toBe("LR");
    expect(diagram.version).toBe(1);
    expect(diagram.edges).toEqual([]);
  });

  it("rejects unknown node kinds", () => {
    const result = safeParseWireDiagram({
      nodes: [{ id: "x", kind: "lazer-cannon", title: "boom" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects condition nodes without branches", () => {
    const result = safeParseWireDiagram({
      nodes: [{ id: "c", kind: "condition", title: "Branch?" }]
    });
    expect(result.success).toBe(false);
  });

  it("accepts `from` as array", () => {
    const diagram = parseWireDiagram({
      nodes: [
        { id: "a", kind: "action", title: "A" },
        { id: "b", kind: "action", title: "B" },
        { id: "merge", kind: "action", title: "Merge", from: ["a", "b"] }
      ]
    });
    expect(diagram.nodes[2]).toMatchObject({ from: ["a", "b"] });
  });
});

describe("splitFromRef", () => {
  it("splits node.branch", () => {
    expect(splitFromRef("classify.sales")).toEqual({ nodeId: "classify", branch: "sales" });
  });
  it("returns undefined branch when missing", () => {
    expect(splitFromRef("classify")).toEqual({ nodeId: "classify" });
  });
});
