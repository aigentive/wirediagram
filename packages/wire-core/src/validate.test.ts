import { describe, expect, it } from "vitest";
import { validate } from "./validate.js";

describe("validate", () => {
  it("accepts the canonical workflow example", () => {
    const result = validate({
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
        { id: "open-ticket", kind: "action", title: "Open support ticket", from: "route.support", tone: "warning" }
      ]
    });
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("flags duplicate ids", () => {
    const r = validate({
      nodes: [
        { id: "x", kind: "trigger", title: "T" },
        { id: "x", kind: "action", title: "A" }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "node.duplicate-id")).toBeTruthy();
  });

  it("flags missing edge target", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "ghost" }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "edge.from-missing")).toBeTruthy();
  });

  it("flags unknown branch on condition", () => {
    const r = validate({
      nodes: [
        { id: "t", kind: "trigger", title: "T" },
        { id: "c", kind: "condition", title: "C?", from: "t", branches: ["yes", "no"] },
        { id: "x", kind: "action", title: "X", from: "c.maybe" }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "edge.unknown-branch")).toBeTruthy();
  });

  it("flags branch suffix on non-condition", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a.success" }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "edge.branch-from-non-condition")).toBeTruthy();
  });

  it("flags missing attachedTo", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "n", kind: "note", title: "N", attachedTo: "ghost" }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "node.attached-to-missing")).toBeTruthy();
  });

  it("warns on orphan", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "lonely", kind: "action", title: "Lonely" }
      ]
    });
    // orphan is a warning — diagram is still valid
    expect(r.valid).toBe(true);
    expect(r.issues.find((i) => i.code === "node.orphan")).toBeTruthy();
  });

  it("warns on self-loop", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "loop", kind: "action", title: "L", from: ["a", "loop"] }
      ]
    });
    expect(r.issues.find((i) => i.code === "edge.self-loop")).toBeTruthy();
  });

  it("warns on cycles", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a" },
        { id: "c", kind: "action", title: "C", from: "b" }
      ],
      edges: [{ id: "back", from: "c", to: "b" }]
    });
    expect(r.issues.find((i) => i.code === "flow.cycle")).toBeTruthy();
  });

  it("flags missing group child", () => {
    const r = validate({
      nodes: [
        { id: "g", kind: "group", title: "G", children: ["ghost"] }
      ]
    });
    expect(r.valid).toBe(false);
    expect(r.issues.find((i) => i.code === "group.child-missing")).toBeTruthy();
  });

  it("warns on dropped connectsTo (canonical JSON uses from)", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", connectsTo: "a" } as unknown as Record<string, unknown>
      ]
    });
    expect(r.issues.find((i) => i.code === "node.forbidden-field")).toBeTruthy();
  });

  it("warns on duplicate from refs", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: ["a", "a"] }
      ]
    });
    expect(r.issues.find((i) => i.code === "node.duplicate-from")).toBeTruthy();
  });

  it("warns when layoutEngine is elk (not implemented)", () => {
    const r = validate({
      layoutEngine: "elk",
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    expect(r.issues.find((i) => i.code === "flow.layout-engine-not-implemented")).toBeTruthy();
  });

  it("rejects from with empty array", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: [] }
      ]
    });
    expect(r.valid).toBe(false);
  });

  it("rejects from refs with bad characters", () => {
    const r = validate({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a/b" }
      ]
    });
    expect(r.valid).toBe(false);
  });

  it("rejects branch names with dots", () => {
    const r = validate({
      nodes: [
        { id: "t", kind: "trigger", title: "T" },
        { id: "c", kind: "condition", title: "C", from: "t", branches: ["yes.maybe", "no"] }
      ]
    });
    expect(r.valid).toBe(false);
  });

  it("warns on group/parent mismatch", () => {
    const r = validate({
      nodes: [
        { id: "g", kind: "group", title: "G", children: ["a"] },
        { id: "a", kind: "trigger", title: "A" } // missing parent: "g"
      ]
    });
    expect(r.issues.find((i) => i.code === "group.child-parent-mismatch")).toBeTruthy();
  });
});
