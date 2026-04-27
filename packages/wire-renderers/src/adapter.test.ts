import { describe, expect, it } from "vitest";
import { parseWireDiagram } from "@aigentive/wire-core";
import { toReactFlow } from "./adapter.js";

describe("toReactFlow", () => {
  it("emits one rf node per wire node and one rf edge per resolved edge", () => {
    const diagram = parseWireDiagram({
      layout: "LR",
      nodes: [
        { id: "webhook", kind: "trigger", title: "Webhook fires" },
        { id: "classify", kind: "ai", title: "Classify intent", from: "webhook", model: "gpt-4.1" },
        {
          id: "route",
          kind: "condition",
          title: "Route",
          from: "classify",
          branches: ["sales", "support"]
        },
        { id: "notify", kind: "action", title: "Notify", from: "route.sales", tone: "success" }
      ]
    });

    const rf = toReactFlow(diagram);
    expect(rf.nodes).toHaveLength(4);
    expect(rf.edges).toHaveLength(3);
    expect(rf.bounds.width).toBeGreaterThan(0);

    const notify = rf.nodes.find((n) => n.id === "notify")!;
    expect(notify.data.tone).toBe("success");
    expect(notify.data.toneClass).toContain("emerald");
    expect(notify.type).toBe("wire-action");

    const branchEdge = rf.edges.find((e) => e.target === "notify")!;
    expect(branchEdge.label).toBe("sales");
    expect(branchEdge.data?.branch).toBe("sales");
  });

  it("animates outgoing edges from ai/condition by default", () => {
    const diagram = parseWireDiagram({
      nodes: [
        { id: "a", kind: "ai", title: "Plan" },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    const rf = toReactFlow(diagram);
    expect(rf.edges[0]?.animated).toBe(true);
  });

  it("can disable animation", () => {
    const diagram = parseWireDiagram({
      nodes: [
        { id: "a", kind: "ai", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    const rf = toReactFlow(diagram, { animate: false });
    expect(rf.edges[0]?.animated).toBeFalsy();
  });

  it("threads parent id through for grouped nodes", () => {
    const diagram = parseWireDiagram({
      nodes: [
        { id: "g", kind: "group", title: "Pipeline" },
        { id: "a", kind: "trigger", title: "A", parent: "g" }
      ]
    });
    const rf = toReactFlow(diagram);
    const a = rf.nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("g");
  });
});
