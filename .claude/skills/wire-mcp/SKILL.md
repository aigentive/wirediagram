---
name: wire-mcp
description: >
  Use Wire MCP and @aigentive/wire-react to create, edit, validate, render,
  preview, and review canonical Wire workflow diagrams. Use when users ask for
  agent workflow diagrams, MCP flow diagrams, React/hosted Wire editor usage,
  edge handles, diagram JSON, or diagram completeness reviews.
trigger: "wire|diagram|workflow diagram|flowchart|react editor|render diagram|mcp wire|agent workflow"
allowed-tools:
  - wire__*
  - mcp__wire__*
  - Read
  - Grep
argument-hint: "[section: quick-start | tools | json | validation | react | troubleshooting]"
priority: 2
maxTokens: 6000
---

# Wire MCP Skill - Agent Workflow Diagram Playbook

## 1. Boundary

Wire is not raw `xyflow` storage. Wire owns the canonical diagram JSON,
agent-safe mutations, validation, MCP surface, static renderers, and reusable
React editor. `@xyflow/react` is the canvas engine inside `@aigentive/wire-react`.

Use Wire MCP when an agent needs to create, edit, validate, render, or summarize
a diagram as structured data. Use `@aigentive/wire-react` when a React app needs
the same hosted-compatible editor or viewer.

If the Wire MCP server exposes `v1_get_agent_guide`, call it once when no live
guide was injected. The MCP guide is the live API reference; this skill is the
operating playbook.

## 2. Tool Names

Tool names depend on the host and configured MCP server name.

```text
Wire MCP bare method: create_diagram
Server-name prefix: wire__create_diagram
Claude-style prefix in some hosts: mcp__wire__create_diagram
```

Never invent a namespace from this skill name. Do not call `wire-mcp__*`.
Inspect the available tools and use the actual prefix exposed by the host.

## 3. Bootstrap

Before making diagram changes:

1. Confirm the Wire tools are exposed and allowed by the MCP host.
2. If no MCP guide was injected and `v1_get_agent_guide` exists under the host
   prefix, call it once for live tool and schema guidance.
3. For an existing diagram, call `load_diagram` or `get_diagram_json` first,
   then `validate`.
4. For multi-step edits, prefer `apply_actions` so the edit is atomic and
   validation runs once after the coherent change.
5. After edits, call `validate`, then `render_preview` or `render_svg`
   depending on what the user needs to inspect.

## 4. Canonical Model

Wire JSON is the source of truth. Do not hand-edit separate React Flow JSON and
then try to reconcile it back.

Minimum diagram shape:

```json
{
  "version": 1,
  "id": "agent-router",
  "title": "Agent router",
  "layout": "LR",
  "nodes": [],
  "edges": []
}
```

Node concepts to preserve: `id`, `kind`, `title`, `description`, `from`,
`after`, `attachedTo`, `parent`, `position`, `size`, `tone`, `style`, `handles`,
and `data`.

Edge concepts to preserve: `id`, `from`, `to`, `branch`, `label`, `tone`,
`fromHandle`, `toHandle`, `style`, `labelStyle`, `routing`, and `data`.

Use node `from` for normal agent-facing connections. Use explicit edges when the
connection needs a stable edge id, label, branch, custom handles, style, routing,
or non-tree semantics.

## 5. Main Workflows

Create from scratch:

```text
create_diagram({ id, title, layout: "LR" })
apply_actions({
  diagramId,
  actions: [
    { type: "node.add", node: { id: "trigger", kind: "trigger", title: "Webhook fires" } },
    { type: "node.add", node: { id: "classify", kind: "ai", title: "Classify intent", from: "trigger" } },
    { type: "node.add", node: { id: "route", kind: "condition", title: "Route request", from: "classify", branches: ["sales", "support", "other"] } }
  ]
})
validate({ diagramId })
render_preview({ diagramId })
```

Edit an existing diagram:

```text
get_diagram_json({ diagramId })
validate({ diagramId })
apply_actions({ diagramId, actions: [...] })
validate({ diagramId })
summarize_diagram({ diagramId })
```

Render for inspection:

```text
render_preview({ diagramId })  # browser URL, best for human review
render_svg({ diagramId })      # text SVG for docs or embedding
render_png({ diagramId })      # image payload when supported
export_mermaid({ diagramId })  # docs fallback
```

## 6. Required Tool Surface

Expected Wire MCP tools:

```text
create_diagram, load_diagram, save_diagram, patch_diagram, list_diagrams,
add_node, update_node, remove_node, move_node, resize_node,
connect, disconnect, update_edge, remove_edge,
add_note, set_layout, add_group, ungroup, patch_metadata,
apply_actions, validate, get_diagram_json,
render_svg, render_png, render_preview, summarize_diagram, export_mermaid,
v1_get_agent_guide
```

If a tool is missing, continue with the closest safe workflow and report the
gap. For example, if `apply_actions` is missing, use individual mutation tools
and validate after each logical group.

Expected resources and prompts:

```text
wire://diagrams/{id}.json
wire://diagrams/{id}.svg
wire://diagrams/{id}.png
wire://diagrams/{id}.mermaid
wire://diagrams/{id}/preview
wire://templates/
wire://templates/{name}
wire://schemas/wire-diagram

diagram_from_codebase
diagram_from_logs
diagram_from_workflow_description
review_diagram_for_clarity
simplify_diagram
```

## 7. Edge Handles And Action Coverage

Use `from` for ordinary connections. Use explicit edges when a connection needs
a stable id, branch label, handles, style, label style, routing, marker, or
future edge edits.

```text
connect({
  diagramId,
  id: "route-sales",
  from: "route.sales",
  to: "notify-sales",
  label: "sales",
  fromHandle: "right",
  toHandle: "left",
  routing: "smoothstep",
  style: { markerEnd: "arrow", strokeWidth: 2 },
  labelStyle: { background: "#ffffff", fontSize: 12 }
})
```

Allowed handles: `left`, `right`, `top`, `bottom`.
Allowed routing: `bezier`, `smoothstep`, `step`, `straight`.
Allowed edge markers: `arrow`, `circle`, `diamond`, `none`.

Patch explicit edges by id:

```text
update_edge({
  diagramId,
  id: "route-sales",
  patch: {
    fromHandle: "right",
    toHandle: "left",
    routing: "smoothstep",
    style: { markerEnd: "arrow", stroke: "#2563eb" },
    labelStyle: { background: "#eff6ff" }
  }
})
```

Use `disconnect` for node `from` references. Use `remove_edge` for explicit edge
ids. Use `move_node` and `resize_node` for persisted manual layout edits. Use
`patch_diagram` and `patch_metadata` for top-level diagram data. Use `add_group`
and `ungroup` for grouping.

Supported `apply_actions` action types:

```text
diagram.create, diagram.patch, node.add, node.patch, node.remove, node.move,
node.resize, edge.connect, edge.patch, edge.disconnect, edge.remove,
layout.apply, group.add, group.ungroup, note.add, metadata.patch
```

## 8. React And Hosted Apps

For React apps, use the Wire React package instead of copying playground code:

```tsx
import { WireEditor, WireViewer } from "@aigentive/wire-react";

export function Editor({ diagram, onChange }) {
  return <WireEditor diagram={diagram} onChange={onChange} />;
}

export function Preview({ diagram }) {
  return <WireViewer diagram={diagram} fitView />;
}
```

The hosted playground should consume `@aigentive/wire-react` directly. It may
own auth, routing, persistence, sharing links, and billing, but it must not own
node rendering, edge rendering, canvas behavior, mutation semantics, validation
UI primitives, palette behavior, or inspector field behavior.

## 9. Validation Rules

Always validate before presenting a diagram as complete. Treat validation issue
codes as the repair guide, not just a warning list.

Important rules:

- Every user-visible edit should map to a core `WireAction`.
- `wire-core` is the only source of mutation semantics.
- Do not introduce `connectsTo`; use `from` or explicit edges.
- Use stable ids that describe workflow intent, not display order.
- Prefer `layout: "LR"` for agent workflow diagrams unless the user asks for a
  top-down view.
- Preserve `position` and `size` when editing a diagram already arranged by a
  human.

## 10. Configuration Options

Typical stdio MCP config:

```json
{
  "mcpServers": {
    "wire": {
      "command": "node",
      "args": ["/absolute/path/to/wire/packages/wire-mcp/dist/server.js"],
      "env": {
        "WIRE_STORAGE_DIR": "/absolute/path/to/wire-diagrams",
        "WIRE_PREVIEW_BASE": "http://localhost:3870",
        "WIRE_AGENT_ID": "wire-local"
      }
    }
  }
}
```

Typical HTTP MCP config:

```yaml
name: wire
transport: streamable-http
url: https://mcp.example.com/mcp
healthEndpoint: https://mcp.example.com/health
headers:
  # Authorization: Bearer ${WIRE_MCP_TOKEN}
```

Local Docker stack:

```bash
docker compose up -d --build
# MCP: http://localhost:3860/mcp
# Playground: http://localhost:3870
```

Some MCP hosts use a list form:

```yaml
- name: wire
  transport: stdio
  command: node
  args: ["/absolute/path/to/wire/packages/wire-mcp/dist/server.js"]
  env:
    WIRE_STORAGE_DIR: "/absolute/path/to/wire-diagrams"
    WIRE_PREVIEW_BASE: "http://localhost:3870"
```

Useful Wire env vars:

```text
WIRE_STORAGE_DIR      Directory for diagram JSON files
WIRE_PREVIEW_BASE     Base URL for render_preview and preview resources
WIRE_HTTP_PORT        HTTP MCP port when running with --http
WIRE_HTTP_HOST        HTTP MCP host when running with --http
WIRE_AUDIT_LOG        Optional JSONL audit log file
WIRE_DEFAULT_LAYOUT   LR, TB, RL, or BT
WIRE_PNG_ENABLED      Enable PNG rasterization path when supported
WIRE_AGENT_ID         Actor id in Wire audit logs
```

## 11. Troubleshooting

If tools are unavailable, check the configured MCP server name, process logs,
and whether the host exposes the Wire tools under the expected prefix.

If preview URLs point to localhost in production, set `WIRE_PREVIEW_BASE` to the
deployed Wire playground URL.

If edits race or lose changes, use `apply_actions` and keep storage on a backend
that supports per-diagram mutation locking.

If the diagram looks correct in JSON but not in React/playground rendering, validate first,
then render preview and SVG. The same canonical diagram should drive MCP, static
renderers, and `@aigentive/wire-react`.

## 12. Section Dispatch

If `$ARGUMENTS` contains `quick-start`, present Sections 2, 3, and 5.

If `$ARGUMENTS` contains `tools`, present Sections 6 and 7.

If `$ARGUMENTS` contains `json`, present Sections 4 and 9.

If `$ARGUMENTS` contains `validation`, present Section 9.

If `$ARGUMENTS` contains `react`, present Section 8.

If `$ARGUMENTS` contains `troubleshooting`, present Section 11.

If `$ARGUMENTS` is empty or not recognized, use the full skill.
