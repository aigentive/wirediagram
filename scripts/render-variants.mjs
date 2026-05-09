// Render every node-kind, tone, and layout variant + edge cases.
import { Resvg } from "@resvg/resvg-js";
import { renderToSvg } from "../packages/wire-core/dist/svg.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/wire-variants";
mkdirSync(OUT, { recursive: true });

function go(name, diagram, opts) {
  const svg = renderToSvg(diagram, opts);
  writeFileSync(join(OUT, `${name}.svg`), svg);
  const png = new Resvg(svg).render().asPng();
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`${name.padEnd(28)}  ${String(svg.length).padStart(6)}b svg  ${String(png.length).padStart(6)}b png`);
}

// 1. All 12 node kinds in a single diagram
go("all-kinds", {
  version: 1, layout: "LR",
  nodes: [
    { id: "t", kind: "trigger", title: "Trigger" },
    { id: "ai", kind: "ai", title: "AI plan", from: "t" },
    { id: "tool", kind: "tool", title: "Tool call", from: "ai" },
    { id: "ret", kind: "retrieval", title: "Retrieve docs", from: "tool" },
    { id: "guard", kind: "guardrail", title: "Guardrail check", from: "ret" },
    { id: "cond", kind: "condition", title: "Decide", from: "guard", branches: ["yes", "no"] },
    { id: "human", kind: "human", title: "Human review", from: "cond.yes" },
    { id: "mem", kind: "memory", title: "Memory write", from: "cond.no" },
    { id: "act", kind: "action", title: "Action", from: ["human", "mem"] },
    { id: "end", kind: "end", title: "End", from: "act" },
    { id: "note", kind: "note", title: "Watch latency", attachedTo: "ai", body: "Plan can hit 30s timeouts" }
  ],
  edges: []
});

// 2. All 6 tones, side by side
go("all-tones", {
  version: 1, layout: "TB",
  nodes: [
    { id: "tdef", kind: "action", title: "default", tone: "default" },
    { id: "tsuc", kind: "action", title: "success", tone: "success" },
    { id: "twrn", kind: "action", title: "warning", tone: "warning" },
    { id: "terr", kind: "action", title: "error", tone: "error" },
    { id: "tinf", kind: "action", title: "info", tone: "info" },
    { id: "tai",  kind: "ai",     title: "ai",      tone: "ai" }
  ],
  edges: []
});

// 3. The four layouts
const flowNodes = [
  { id: "a", kind: "trigger", title: "Start" },
  { id: "b", kind: "ai", title: "Plan", from: "a" },
  { id: "c", kind: "action", title: "Do", from: "b" },
  { id: "d", kind: "end", title: "End", from: "c" }
];
for (const dir of ["LR", "TB", "RL", "BT"]) {
  go(`layout-${dir}`, { version: 1, layout: dir, nodes: flowNodes, edges: [] });
}

// 4. The three example diagrams
const examples = [
  "agent-router",
  "refund-approval",
  "rag-pipeline"
];
for (const name of examples) {
  const json = JSON.parse(
    readFileSync(join(ROOT, "examples", `${name}.json`), "utf8")
  );
  go(`example-${name}`, json);
}

// 5. Edge cases — long titles, descriptions
go("long-titles", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "Webhook fires when an external partner POSTs to our event endpoint" },
    { id: "b", kind: "ai", title: "Classify intent and pick the right downstream handler", from: "a", description: "Uses confidence threshold; falls back to router default" },
    { id: "c", kind: "action", title: "Send notification to all subscribed users", from: "b", description: "Batched per channel" }
  ],
  edges: []
});

// 6. Multi-branch condition
go("multi-branch", {
  version: 1, layout: "LR",
  nodes: [
    { id: "in", kind: "trigger", title: "Incoming" },
    { id: "route", kind: "condition", title: "Route", from: "in", branches: ["sales", "support", "billing", "other"] },
    { id: "s", kind: "action", title: "Sales", from: "route.sales", tone: "success" },
    { id: "p", kind: "action", title: "Support", from: "route.support", tone: "warning" },
    { id: "b", kind: "action", title: "Billing", from: "route.billing", tone: "info" },
    { id: "o", kind: "action", title: "Other", from: "route.other" }
  ],
  edges: []
});

// 7. Multiple notes attached to different hosts
go("multi-notes", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "Event" },
    { id: "b", kind: "ai", title: "Plan", from: "a" },
    { id: "c", kind: "action", title: "Execute", from: "b" },
    { id: "n1", kind: "note", title: "Risk", attachedTo: "b", body: "Plan may misroute" },
    { id: "n2", kind: "note", title: "Latency", attachedTo: "c", body: "p99 is 8s" }
  ],
  edges: []
});

// 8. Group with children
go("with-group", {
  version: 1, layout: "LR",
  nodes: [
    { id: "trig", kind: "trigger", title: "Start" },
    { id: "g", kind: "group", title: "Pipeline" },
    { id: "step1", kind: "ai", title: "Step 1", from: "trig", parent: "g" },
    { id: "step2", kind: "action", title: "Step 2", from: "step1", parent: "g" },
    { id: "endn", kind: "end", title: "Done", from: "step2" }
  ],
  edges: []
});

// 9. Multi-from (fan-in)
go("multi-from", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "A" },
    { id: "b", kind: "trigger", title: "B" },
    { id: "c", kind: "trigger", title: "C" },
    { id: "merge", kind: "ai", title: "Merge", from: ["a", "b", "c"] },
    { id: "out", kind: "action", title: "Out", from: "merge" }
  ],
  edges: []
});

// 10. Single-node minimal
go("single-node", {
  version: 1, layout: "LR",
  nodes: [{ id: "only", kind: "trigger", title: "Only node" }],
  edges: []
});

// 11. Title with special chars + xml entities (escape stress test)
go("special-chars", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "User & query <fires>" },
    { id: "b", kind: "ai", title: "Plan: \"smart\" route", from: "a", description: "if x > 0 && y < 100" }
  ],
  edges: []
});

// 12. Custom edge handles — pin specific sides via fromHandle/toHandle
go("custom-handles", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "Start" },
    { id: "b", kind: "ai", title: "Top entry" },
    { id: "c", kind: "ai", title: "Bottom entry" },
    { id: "merge", kind: "action", title: "Merge" }
  ],
  edges: [
    { from: "a", to: "b", toHandle: "top", label: "via top" },
    { from: "a", to: "c", toHandle: "bottom", label: "via bottom" },
    { from: "b", to: "merge" },
    { from: "c", to: "merge" }
  ]
});

// 13. Multiple edges fanning into a single side — slot distribution
go("fanin-slots", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "trigger", title: "A" },
    { id: "b", kind: "trigger", title: "B" },
    { id: "c", kind: "trigger", title: "C" },
    { id: "d", kind: "trigger", title: "D" },
    { id: "merge", kind: "ai", title: "Merge", from: ["a", "b", "c", "d"] }
  ],
  edges: []
});

// 14. Custom edge styles — colors, dashes, marker variants, routing modes
go("custom-edges", {
  version: 1, layout: "LR",
  nodes: [
    { id: "src", kind: "trigger", title: "Source" },
    { id: "p1", kind: "action", title: "Bezier (default)" },
    { id: "p2", kind: "action", title: "Step routing" },
    { id: "p3", kind: "action", title: "Smoothstep" },
    { id: "p4", kind: "action", title: "Straight" },
    { id: "out", kind: "end", title: "End" }
  ],
  edges: [
    { from: "src", to: "p1", style: { stroke: "#16a34a", strokeWidth: 2 } },
    { from: "src", to: "p2", routing: "step", style: { stroke: "#dc2626", strokeDasharray: "6 3" } },
    { from: "src", to: "p3", routing: "smoothstep", style: { stroke: "#9333ea", markerEnd: "circle" } },
    { from: "src", to: "p4", routing: "straight", style: { stroke: "#0891b2", markerEnd: "diamond" } },
    { from: "p1", to: "out" },
    { from: "p2", to: "out" },
    { from: "p3", to: "out" },
    { from: "p4", to: "out" }
  ]
});

// 15. Custom node styles — fill, stroke, dasharray, borderRadius, shadow, opacity
go("custom-styles", {
  version: 1, layout: "LR",
  nodes: [
    { id: "a", kind: "action", title: "Custom fill", style: { fill: "#fef3c7", stroke: "#d97706", textColor: "#78350f" } },
    { id: "b", kind: "action", title: "Dashed border", from: "a", style: { strokeDasharray: "5 3", strokeWidth: 2 } },
    { id: "c", kind: "action", title: "Big radius", from: "b", style: { borderRadius: 28 } },
    { id: "d", kind: "action", title: "With shadow", from: "c", style: { shadow: true, fill: "#ffffff" } },
    { id: "e", kind: "action", title: "Faded", from: "d", style: { opacity: 0.4 } }
  ],
  edges: []
});

// 16. Diagram-level defaults via RenderSvgOptions
go(
  "themed-defaults",
  {
    version: 1, layout: "LR",
    nodes: [
      { id: "a", kind: "trigger", title: "Start" },
      { id: "b", kind: "ai", title: "Plan", from: "a" },
      { id: "c", kind: "action", title: "Do", from: "b" },
      { id: "d", kind: "end", title: "End", from: "c" }
    ],
    edges: []
  },
  {
    nodeStyle: { borderRadius: 20, shadow: true },
    edgeStyle: { stroke: "#6366f1", strokeWidth: 2, strokeDasharray: "4 2" },
    edgeRouting: "smoothstep",
    edgeLabelStyle: { fill: "#1e1b4b", background: "#eef2ff", border: "#6366f1" }
  }
);

console.log("\nWrote", (await import("node:fs")).readdirSync(OUT).length, "files to", OUT);
