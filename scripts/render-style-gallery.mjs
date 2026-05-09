#!/usr/bin/env node
// Generates the style-gallery in examples/styles/.
// For each entry: writes <name>.json, <name>.svg, <name>.png.
import { Resvg } from "@resvg/resvg-js";
import { renderToSvg } from "../packages/wire-core/dist/svg.js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "examples/styles");

function emit(name, diagram, opts) {
  const json = JSON.stringify(
    { $schema: "https://aigentive.dev/schemas/wire-diagram.json", ...diagram },
    null,
    2
  );
  writeFileSync(join(OUT, `${name}.json`), json + "\n");
  const svg = renderToSvg(diagram, opts);
  writeFileSync(join(OUT, `${name}.svg`), svg);
  const png = new Resvg(svg).render().asPng();
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`${name.padEnd(28)}  ${String(svg.length).padStart(6)}b svg  ${String(png.length).padStart(6)}b png`);
}

// ---------------------------------------------------------------------------
// 1. Dark mode — diagram-level defaults via RenderSvgOptions.
// ---------------------------------------------------------------------------
emit(
  "theme-dark",
  {
    version: 1, layout: "LR",
    title: "Theme: Dark",
    description: "Dark canvas with cyan accents. Style is applied per-node so the JSON is portable.",
    nodes: [
      { id: "trig", kind: "trigger", title: "Webhook",
        style: { fill: "#1e293b", stroke: "#22d3ee", textColor: "#e2e8f0", strokeWidth: 2 } },
      { id: "ai", kind: "ai", title: "Classify intent", from: "trig",
        style: { fill: "#1e293b", stroke: "#a78bfa", textColor: "#e2e8f0", strokeWidth: 2, shadow: true } },
      { id: "cond", kind: "condition", title: "Route", from: "ai", branches: ["a", "b"],
        style: { fill: "#1e293b", stroke: "#f59e0b", textColor: "#e2e8f0", strokeWidth: 2 } },
      { id: "act-a", kind: "action", title: "Path A", from: "cond.a",
        style: { fill: "#022c22", stroke: "#34d399", textColor: "#d1fae5", strokeWidth: 2 } },
      { id: "act-b", kind: "action", title: "Path B", from: "cond.b",
        style: { fill: "#3b0a0a", stroke: "#fb7185", textColor: "#fecdd3", strokeWidth: 2 } },
      { id: "end", kind: "end", title: "Done", from: ["act-a", "act-b"],
        style: { fill: "#0f172a", stroke: "#22d3ee", textColor: "#e2e8f0", strokeWidth: 2 } }
    ],
    edges: []
  },
  {
    background: "#0b1120",
    edgeStyle: { stroke: "#64748b", strokeWidth: 1.5 },
    edgeLabelStyle: { fill: "#cbd5e1", background: "#1e293b", border: "#334155" }
  }
);

// ---------------------------------------------------------------------------
// 2. Blueprint — engineering schematic look.
// ---------------------------------------------------------------------------
emit(
  "theme-blueprint",
  {
    version: 1, layout: "LR",
    title: "Theme: Blueprint",
    description: "White stroke on cyan-blue. Dashed edges, square corners.",
    nodes: [
      { id: "in", kind: "trigger", title: "Input",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "proc", kind: "ai", title: "Process",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "valid", kind: "guardrail", title: "Validate",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "out", kind: "end", title: "Output",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } }
    ],
    edges: [
      { from: "in", to: "proc", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } },
      { from: "proc", to: "valid", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } },
      { from: "valid", to: "out", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } }
    ]
  },
  { background: "#075985" }
);

// ---------------------------------------------------------------------------
// 3. Pastel — soft, rounded, dropshadow UI.
// ---------------------------------------------------------------------------
emit(
  "theme-pastel",
  {
    version: 1, layout: "LR",
    title: "Theme: Pastel",
    description: "Soft pastel cards with large radius and a subtle shadow.",
    nodes: [
      { id: "start", kind: "trigger", title: "User asks",
        style: { fill: "#fce7f3", stroke: "#f9a8d4", textColor: "#831843", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "think", kind: "ai", title: "Think it through", from: "start",
        style: { fill: "#ede9fe", stroke: "#c4b5fd", textColor: "#4c1d95", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "tool", kind: "tool", title: "Look up data", from: "think",
        style: { fill: "#dbeafe", stroke: "#93c5fd", textColor: "#1e3a8a", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "answer", kind: "action", title: "Answer", from: "tool",
        style: { fill: "#dcfce7", stroke: "#86efac", textColor: "#14532d", borderRadius: 24, shadow: true, strokeWidth: 2 } }
    ],
    edges: []
  },
  {
    background: "#fafafa",
    edgeStyle: { stroke: "#a8a29e", strokeWidth: 2, curvature: 0.6 }
  }
);

// ---------------------------------------------------------------------------
// 4. Mono — minimal monochrome, dashed borders, no fills.
// ---------------------------------------------------------------------------
emit(
  "theme-mono",
  {
    version: 1, layout: "LR",
    title: "Theme: Mono",
    description: "Stroke-only nodes, dashed borders, single-weight typography.",
    nodes: [
      { id: "a", kind: "trigger", title: "Trigger",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "b", kind: "ai", title: "Reason", from: "a",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "c", kind: "action", title: "Act", from: "b",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "d", kind: "end", title: "End", from: "c",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } }
    ],
    edges: []
  },
  {
    background: "#fafafa",
    edgeStyle: { stroke: "#18181b", strokeWidth: 1, strokeDasharray: "2 2" }
  }
);

// ---------------------------------------------------------------------------
// 5. Neon — neon strokes on black.
// ---------------------------------------------------------------------------
emit(
  "theme-neon",
  {
    version: 1, layout: "LR",
    title: "Theme: Neon",
    description: "Neon strokes over black. Thick borders, vivid colors.",
    nodes: [
      { id: "a", kind: "trigger", title: "Signal",
        style: { fill: "#000000", stroke: "#22d3ee", textColor: "#22d3ee", strokeWidth: 3 } },
      { id: "b", kind: "ai", title: "Synth",
        style: { fill: "#000000", stroke: "#a855f7", textColor: "#a855f7", strokeWidth: 3 } },
      { id: "c", kind: "tool", title: "Pulse",
        style: { fill: "#000000", stroke: "#f472b6", textColor: "#f472b6", strokeWidth: 3 } },
      { id: "d", kind: "end", title: "Drop",
        style: { fill: "#000000", stroke: "#facc15", textColor: "#facc15", strokeWidth: 3 } }
    ],
    edges: [
      { from: "a", to: "b", style: { stroke: "#22d3ee", strokeWidth: 2 } },
      { from: "b", to: "c", style: { stroke: "#a855f7", strokeWidth: 2 } },
      { from: "c", to: "d", style: { stroke: "#f472b6", strokeWidth: 2 } }
    ]
  },
  { background: "#000000" }
);

// ---------------------------------------------------------------------------
// 6. Routing modes — bezier / smoothstep / step / straight side-by-side.
// ---------------------------------------------------------------------------
emit(
  "feature-routing-modes",
  {
    version: 1, layout: "LR",
    title: "Feature: edge routing modes",
    description: "Same edge from one source to four targets, each with a different routing mode.",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "p1", kind: "action", title: "bezier", tone: "info" },
      { id: "p2", kind: "action", title: "smoothstep", tone: "success" },
      { id: "p3", kind: "action", title: "step", tone: "warning" },
      { id: "p4", kind: "action", title: "straight", tone: "error" }
    ],
    edges: [
      { from: "src", to: "p1", routing: "bezier", label: "bezier" },
      { from: "src", to: "p2", routing: "smoothstep", label: "smoothstep" },
      { from: "src", to: "p3", routing: "step", label: "step" },
      { from: "src", to: "p4", routing: "straight", label: "straight" }
    ]
  }
);

// ---------------------------------------------------------------------------
// 7. Edge markers — arrow / circle / diamond / none on the same diagram.
// ---------------------------------------------------------------------------
emit(
  "feature-edge-markers",
  {
    version: 1, layout: "LR",
    title: "Feature: edge markers",
    description: "End-cap variants. Each edge sets its own markerEnd.",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "a", kind: "action", title: "arrow" },
      { id: "b", kind: "action", title: "circle" },
      { id: "c", kind: "action", title: "diamond" },
      { id: "d", kind: "action", title: "none" }
    ],
    edges: [
      { from: "src", to: "a", style: { markerEnd: "arrow" }, label: "arrow" },
      { from: "src", to: "b", style: { markerEnd: "circle", stroke: "#16a34a" }, label: "circle" },
      { from: "src", to: "c", style: { markerEnd: "diamond", stroke: "#dc2626" }, label: "diamond" },
      { from: "src", to: "d", style: { markerEnd: "none", stroke: "#6b7280" }, label: "none" }
    ]
  }
);

// ---------------------------------------------------------------------------
// 8. Edge styles — strokes, dashes, weights, colors.
// ---------------------------------------------------------------------------
emit(
  "feature-edge-styles",
  {
    version: 1, layout: "LR",
    title: "Feature: edge styles",
    description: "Color, stroke width, dasharray, curvature combinations.",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "a", kind: "action", title: "thin solid" },
      { id: "b", kind: "action", title: "thick solid" },
      { id: "c", kind: "action", title: "dashed" },
      { id: "d", kind: "action", title: "dotted" },
      { id: "e", kind: "action", title: "low curve" }
    ],
    edges: [
      { from: "src", to: "a", style: { stroke: "#0ea5e9", strokeWidth: 1 } },
      { from: "src", to: "b", style: { stroke: "#16a34a", strokeWidth: 4 } },
      { from: "src", to: "c", style: { stroke: "#dc2626", strokeDasharray: "6 3" } },
      { from: "src", to: "d", style: { stroke: "#9333ea", strokeDasharray: "1 3" } },
      { from: "src", to: "e", style: { stroke: "#f59e0b", curvature: 0.1 } }
    ]
  }
);

// ---------------------------------------------------------------------------
// 9. Handle anchors — pin edges to specific node sides.
// ---------------------------------------------------------------------------
emit(
  "feature-handles",
  {
    version: 1, layout: "LR",
    title: "Feature: handle anchors",
    description: "fromHandle / toHandle pin an edge to a specific side of source or target.",
    nodes: [
      { id: "hub", kind: "ai", title: "Hub" },
      { id: "n", kind: "action", title: "north", tone: "info" },
      { id: "s", kind: "action", title: "south", tone: "warning" },
      { id: "e", kind: "action", title: "east", tone: "success" },
      { id: "w", kind: "action", title: "west", tone: "error" }
    ],
    edges: [
      { from: "hub", to: "n", fromHandle: "top", toHandle: "bottom", label: "top→bottom" },
      { from: "hub", to: "s", fromHandle: "bottom", toHandle: "top", label: "bottom→top" },
      { from: "hub", to: "e", fromHandle: "right", toHandle: "left", label: "right→left" },
      { from: "hub", to: "w", fromHandle: "left", toHandle: "right", label: "left→right" }
    ]
  }
);

// ---------------------------------------------------------------------------
// 10. Node styles — fill, dash, radius, shadow, opacity in one place.
// ---------------------------------------------------------------------------
emit(
  "feature-node-styles",
  {
    version: 1, layout: "LR",
    title: "Feature: node styles",
    description: "All node-level style props on a single row.",
    nodes: [
      { id: "tone-only", kind: "action", title: "tone defaults", tone: "ai" },
      { id: "fill", kind: "action", title: "custom fill", from: "tone-only",
        style: { fill: "#fef3c7", stroke: "#d97706", textColor: "#78350f" } },
      { id: "dash", kind: "action", title: "dashed border", from: "fill",
        style: { strokeDasharray: "5 3", strokeWidth: 2 } },
      { id: "radius", kind: "action", title: "big radius", from: "dash",
        style: { borderRadius: 28, fill: "#dbeafe", stroke: "#1d4ed8" } },
      { id: "shadow", kind: "action", title: "shadow", from: "radius",
        style: { shadow: true, fill: "#ffffff" } },
      { id: "fade", kind: "action", title: "faded", from: "shadow",
        style: { opacity: 0.4 } }
    ],
    edges: []
  }
);

// ---------------------------------------------------------------------------
// 11. Fan-in slot distribution — multiple edges to one side, evenly spaced.
// ---------------------------------------------------------------------------
emit(
  "feature-fanin-slots",
  {
    version: 1, layout: "LR",
    title: "Feature: fan-in slot distribution",
    description: "Multiple edges into the same side auto-distribute evenly between 25% and 75% of the side length.",
    nodes: [
      { id: "a", kind: "trigger", title: "Source A" },
      { id: "b", kind: "trigger", title: "Source B" },
      { id: "c", kind: "trigger", title: "Source C" },
      { id: "d", kind: "trigger", title: "Source D" },
      { id: "e", kind: "trigger", title: "Source E" },
      { id: "merge", kind: "ai", title: "Aggregator", from: ["a", "b", "c", "d", "e"], tone: "ai" }
    ],
    edges: []
  }
);

// ===========================================================================
// VERTICAL VARIANTS (TB layout)
//
// Same showcases as above but with `layout: "TB"`. For TB, the default
// handle pair becomes source.bottom → target.top, so the diagrams flow
// downward. Useful when embedding diagrams in narrow / portrait surfaces
// or in vertically-scrolling docs.
// ===========================================================================

// 1v. Dark — vertical
emit(
  "theme-dark-tb",
  {
    version: 1, layout: "TB",
    title: "Theme: Dark (vertical)",
    nodes: [
      { id: "trig", kind: "trigger", title: "Webhook",
        style: { fill: "#1e293b", stroke: "#22d3ee", textColor: "#e2e8f0", strokeWidth: 2 } },
      { id: "ai", kind: "ai", title: "Classify intent", from: "trig",
        style: { fill: "#1e293b", stroke: "#a78bfa", textColor: "#e2e8f0", strokeWidth: 2, shadow: true } },
      { id: "cond", kind: "condition", title: "Route", from: "ai", branches: ["a", "b"],
        style: { fill: "#1e293b", stroke: "#f59e0b", textColor: "#e2e8f0", strokeWidth: 2 } },
      { id: "act-a", kind: "action", title: "Path A", from: "cond.a",
        style: { fill: "#022c22", stroke: "#34d399", textColor: "#d1fae5", strokeWidth: 2 } },
      { id: "act-b", kind: "action", title: "Path B", from: "cond.b",
        style: { fill: "#3b0a0a", stroke: "#fb7185", textColor: "#fecdd3", strokeWidth: 2 } },
      { id: "end", kind: "end", title: "Done", from: ["act-a", "act-b"],
        style: { fill: "#0f172a", stroke: "#22d3ee", textColor: "#e2e8f0", strokeWidth: 2 } }
    ],
    edges: []
  },
  {
    background: "#0b1120",
    edgeStyle: { stroke: "#64748b", strokeWidth: 1.5 },
    edgeLabelStyle: { fill: "#cbd5e1", background: "#1e293b", border: "#334155" }
  }
);

// 2v. Blueprint — vertical
emit(
  "theme-blueprint-tb",
  {
    version: 1, layout: "TB",
    title: "Theme: Blueprint (vertical)",
    nodes: [
      { id: "in", kind: "trigger", title: "Input",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "proc", kind: "ai", title: "Process",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "valid", kind: "guardrail", title: "Validate",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } },
      { id: "out", kind: "end", title: "Output",
        style: { fill: "#0c4a6e", stroke: "#e0f2fe", textColor: "#f0f9ff", borderRadius: 0, strokeWidth: 1.5 } }
    ],
    edges: [
      { from: "in", to: "proc", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } },
      { from: "proc", to: "valid", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } },
      { from: "valid", to: "out", style: { stroke: "#bae6fd", strokeDasharray: "4 3" } }
    ]
  },
  { background: "#075985" }
);

// 3v. Pastel — vertical
emit(
  "theme-pastel-tb",
  {
    version: 1, layout: "TB",
    title: "Theme: Pastel (vertical)",
    nodes: [
      { id: "start", kind: "trigger", title: "User asks",
        style: { fill: "#fce7f3", stroke: "#f9a8d4", textColor: "#831843", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "think", kind: "ai", title: "Think it through", from: "start",
        style: { fill: "#ede9fe", stroke: "#c4b5fd", textColor: "#4c1d95", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "tool", kind: "tool", title: "Look up data", from: "think",
        style: { fill: "#dbeafe", stroke: "#93c5fd", textColor: "#1e3a8a", borderRadius: 24, shadow: true, strokeWidth: 2 } },
      { id: "answer", kind: "action", title: "Answer", from: "tool",
        style: { fill: "#dcfce7", stroke: "#86efac", textColor: "#14532d", borderRadius: 24, shadow: true, strokeWidth: 2 } }
    ],
    edges: []
  },
  {
    background: "#fafafa",
    edgeStyle: { stroke: "#a8a29e", strokeWidth: 2, curvature: 0.6 }
  }
);

// 4v. Mono — vertical
emit(
  "theme-mono-tb",
  {
    version: 1, layout: "TB",
    title: "Theme: Mono (vertical)",
    nodes: [
      { id: "a", kind: "trigger", title: "Trigger",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "b", kind: "ai", title: "Reason", from: "a",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "c", kind: "action", title: "Act", from: "b",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } },
      { id: "d", kind: "end", title: "End", from: "c",
        style: { fill: "#ffffff", stroke: "#18181b", textColor: "#18181b", strokeWidth: 1.5, strokeDasharray: "3 2" } }
    ],
    edges: []
  },
  {
    background: "#fafafa",
    edgeStyle: { stroke: "#18181b", strokeWidth: 1, strokeDasharray: "2 2" }
  }
);

// 5v. Neon — vertical
emit(
  "theme-neon-tb",
  {
    version: 1, layout: "TB",
    title: "Theme: Neon (vertical)",
    nodes: [
      { id: "a", kind: "trigger", title: "Signal",
        style: { fill: "#000000", stroke: "#22d3ee", textColor: "#22d3ee", strokeWidth: 3 } },
      { id: "b", kind: "ai", title: "Synth",
        style: { fill: "#000000", stroke: "#a855f7", textColor: "#a855f7", strokeWidth: 3 } },
      { id: "c", kind: "tool", title: "Pulse",
        style: { fill: "#000000", stroke: "#f472b6", textColor: "#f472b6", strokeWidth: 3 } },
      { id: "d", kind: "end", title: "Drop",
        style: { fill: "#000000", stroke: "#facc15", textColor: "#facc15", strokeWidth: 3 } }
    ],
    edges: [
      { from: "a", to: "b", style: { stroke: "#22d3ee", strokeWidth: 2 } },
      { from: "b", to: "c", style: { stroke: "#a855f7", strokeWidth: 2 } },
      { from: "c", to: "d", style: { stroke: "#f472b6", strokeWidth: 2 } }
    ]
  },
  { background: "#000000" }
);

// 6v. Routing modes — vertical
emit(
  "feature-routing-modes-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: edge routing modes (vertical)",
    description: "Source on top, four targets below — one per routing mode.",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "p1", kind: "action", title: "bezier", tone: "info" },
      { id: "p2", kind: "action", title: "smoothstep", tone: "success" },
      { id: "p3", kind: "action", title: "step", tone: "warning" },
      { id: "p4", kind: "action", title: "straight", tone: "error" }
    ],
    edges: [
      { from: "src", to: "p1", routing: "bezier", label: "bezier" },
      { from: "src", to: "p2", routing: "smoothstep", label: "smoothstep" },
      { from: "src", to: "p3", routing: "step", label: "step" },
      { from: "src", to: "p4", routing: "straight", label: "straight" }
    ]
  }
);

// 7v. Edge markers — vertical
emit(
  "feature-edge-markers-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: edge markers (vertical)",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "a", kind: "action", title: "arrow" },
      { id: "b", kind: "action", title: "circle" },
      { id: "c", kind: "action", title: "diamond" },
      { id: "d", kind: "action", title: "none" }
    ],
    edges: [
      { from: "src", to: "a", style: { markerEnd: "arrow" }, label: "arrow" },
      { from: "src", to: "b", style: { markerEnd: "circle", stroke: "#16a34a" }, label: "circle" },
      { from: "src", to: "c", style: { markerEnd: "diamond", stroke: "#dc2626" }, label: "diamond" },
      { from: "src", to: "d", style: { markerEnd: "none", stroke: "#6b7280" }, label: "none" }
    ]
  }
);

// 8v. Edge styles — vertical
emit(
  "feature-edge-styles-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: edge styles (vertical)",
    nodes: [
      { id: "src", kind: "trigger", title: "Source" },
      { id: "a", kind: "action", title: "thin solid" },
      { id: "b", kind: "action", title: "thick solid" },
      { id: "c", kind: "action", title: "dashed" },
      { id: "d", kind: "action", title: "dotted" },
      { id: "e", kind: "action", title: "low curve" }
    ],
    edges: [
      { from: "src", to: "a", style: { stroke: "#0ea5e9", strokeWidth: 1 } },
      { from: "src", to: "b", style: { stroke: "#16a34a", strokeWidth: 4 } },
      { from: "src", to: "c", style: { stroke: "#dc2626", strokeDasharray: "6 3" } },
      { from: "src", to: "d", style: { stroke: "#9333ea", strokeDasharray: "1 3" } },
      { from: "src", to: "e", style: { stroke: "#f59e0b", curvature: 0.1 } }
    ]
  }
);

// 9v. Handle anchors — vertical layout (default bottom→top), overridden per-edge.
emit(
  "feature-handles-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: handle anchors (vertical)",
    description: "TB defaults to bottom→top; per-edge fromHandle/toHandle pin specific edges to other sides.",
    nodes: [
      { id: "hub", kind: "ai", title: "Hub" },
      { id: "n", kind: "action", title: "north", tone: "info" },
      { id: "s", kind: "action", title: "south", tone: "warning" },
      { id: "e", kind: "action", title: "east", tone: "success" },
      { id: "w", kind: "action", title: "west", tone: "error" }
    ],
    edges: [
      { from: "hub", to: "n", fromHandle: "top", toHandle: "bottom", label: "top→bottom" },
      { from: "hub", to: "s", fromHandle: "bottom", toHandle: "top", label: "bottom→top" },
      { from: "hub", to: "e", fromHandle: "right", toHandle: "left", label: "right→left" },
      { from: "hub", to: "w", fromHandle: "left", toHandle: "right", label: "left→right" }
    ]
  }
);

// 10v. Node styles — vertical column
emit(
  "feature-node-styles-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: node styles (vertical)",
    nodes: [
      { id: "tone-only", kind: "action", title: "tone defaults", tone: "ai" },
      { id: "fill", kind: "action", title: "custom fill", from: "tone-only",
        style: { fill: "#fef3c7", stroke: "#d97706", textColor: "#78350f" } },
      { id: "dash", kind: "action", title: "dashed border", from: "fill",
        style: { strokeDasharray: "5 3", strokeWidth: 2 } },
      { id: "radius", kind: "action", title: "big radius", from: "dash",
        style: { borderRadius: 28, fill: "#dbeafe", stroke: "#1d4ed8" } },
      { id: "shadow", kind: "action", title: "shadow", from: "radius",
        style: { shadow: true, fill: "#ffffff" } },
      { id: "fade", kind: "action", title: "faded", from: "shadow",
        style: { opacity: 0.4 } }
    ],
    edges: []
  }
);

// 11v. Fan-in slots — 5 sources on top fanning into 1 target below
emit(
  "feature-fanin-slots-tb",
  {
    version: 1, layout: "TB",
    title: "Feature: fan-in slot distribution (vertical)",
    description: "Five sources at the top auto-distribute along the target's top side.",
    nodes: [
      { id: "a", kind: "trigger", title: "Source A" },
      { id: "b", kind: "trigger", title: "Source B" },
      { id: "c", kind: "trigger", title: "Source C" },
      { id: "d", kind: "trigger", title: "Source D" },
      { id: "e", kind: "trigger", title: "Source E" },
      { id: "merge", kind: "ai", title: "Aggregator", from: ["a", "b", "c", "d", "e"], tone: "ai" }
    ],
    edges: []
  }
);

console.log("\nWrote gallery to", OUT);
