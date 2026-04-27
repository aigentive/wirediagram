import { describe, expect, it } from "vitest";
import { parseWireDiagram } from "@aigentive/wire-core";
import { renderToSvg } from "./index.js";

describe("renderToSvg", () => {
  it("renders a self-contained svg", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "Webhook fires" },
        { id: "b", kind: "ai", title: "Classify", from: "a", model: "gpt-4.1" },
        { id: "c", kind: "condition", title: "Route", from: "b", branches: ["yes", "no"] },
        { id: "y", kind: "action", title: "Yes path", from: "c.yes", tone: "success" },
        { id: "n", kind: "action", title: "No path", from: "c.no", tone: "warning" }
      ]
    });
    const svg = renderToSvg(d);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Webhook fires");
    expect(svg).toContain("Classify");
    expect(svg).toContain("yes");
    expect(svg).toContain("no");
    expect(svg).toMatch(/<\/svg>$/);
  });

  it("produces well-formed XML — every <text> is closed and contains valid <tspan>s", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "Webhook fires" },
        { id: "b", kind: "ai", title: "Classify intent with a long descriptive title", from: "a", description: "Routes by confidence threshold" }
      ]
    });
    const svg = renderToSvg(d);
    // No raw "<tspan>" without attributes (regression for the slice() bug).
    expect(svg).not.toMatch(/<tspan>(?![^<]*<\/tspan>)/);
    // Every <text> closes properly.
    const opens = (svg.match(/<text\b/g) ?? []).length;
    const closes = (svg.match(/<\/text>/g) ?? []).length;
    expect(opens).toBe(closes);
    // Same for tspan
    const tOpens = (svg.match(/<tspan\b/g) ?? []).length;
    const tCloses = (svg.match(/<\/tspan>/g) ?? []).length;
    expect(tOpens).toBe(tCloses);
    // Title text actually appears (un-corrupted).
    expect(svg).toContain("Webhook fires");
    expect(svg).toContain("Classify intent");
    expect(svg).toContain("Routes by confidence");
  });

  it("emits arrow markers for edges", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    const svg = renderToSvg(d);
    // Marker ids are now keyed by shape + color so multi-color edges work.
    expect(svg).toMatch(/marker-end="url\(#wire-arrow-end-[a-zA-Z0-9]+\)"/);
    expect(svg).toMatch(/<marker id="wire-arrow-end-[a-zA-Z0-9]+"/);
  });

  it("honors per-edge stroke + dash + marker overrides", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B" }
      ],
      edges: [
        {
          from: "a",
          to: "b",
          style: { stroke: "#ff0000", strokeDasharray: "4 2", markerEnd: "circle" }
        }
      ]
    });
    const svg = renderToSvg(d);
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke-dasharray="4 2"');
    expect(svg).toMatch(/marker-end="url\(#wire-circle-end-ff0000\)"/);
  });

  it("honors per-node style overrides", () => {
    const d = parseWireDiagram({
      nodes: [
        {
          id: "a",
          kind: "action",
          title: "Custom",
          style: { fill: "#fef3c7", stroke: "#d97706", strokeDasharray: "5 3", borderRadius: 24, shadow: true }
        }
      ]
    });
    const svg = renderToSvg(d);
    expect(svg).toContain('fill="#fef3c7"');
    expect(svg).toContain('stroke="#d97706"');
    expect(svg).toContain('stroke-dasharray="5 3"');
    expect(svg).toContain('rx="24"');
    expect(svg).toContain('filter="url(#wire-shadow)"');
  });

  it("supports per-edge handle overrides + edge routing modes", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B" }
      ],
      edges: [
        { from: "a", to: "b", routing: "step" }
      ]
    });
    const svg = renderToSvg(d);
    // step routing for matched horizontal handles produces a 3-corner path.
    expect(svg).toMatch(/<path d="M [^"]*L [^"]*L [^"]*L [^"]*"/);
  });

  it("step routing with mixed handle axes produces a single corner", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B" }
      ],
      edges: [
        { from: "a", to: "b", toHandle: "top", routing: "step" }
      ]
    });
    const svg = renderToSvg(d);
    // Right-to-top is a single 90° corner, so two L segments only.
    expect(svg).toMatch(/<path d="M [^"]+L [^"]+L [^"]+"/);
    expect(svg).not.toMatch(/<path d="M [^"]+L [^"]+L [^"]+L [^"]+"/);
  });

  it("applies diagram-level RenderSvgOptions defaults", () => {
    const d = parseWireDiagram({
      nodes: [
        { id: "a", kind: "trigger", title: "A" },
        { id: "b", kind: "action", title: "B", from: "a" }
      ]
    });
    const svg = renderToSvg(d, {
      edgeStyle: { stroke: "#6366f1", strokeWidth: 3 },
      nodeStyle: { borderRadius: 20 }
    });
    expect(svg).toContain('stroke="#6366f1"');
    expect(svg).toContain('stroke-width="3"');
    expect(svg).toContain('rx="20"');
  });
});
