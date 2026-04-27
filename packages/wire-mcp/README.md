# @aigentive/wire-mcp

Model Context Protocol server for Wire. Lets any MCP-compatible agent (Claude Desktop, Claude Code, Cursor, local agents, custom CUA) author and edit Wire diagrams as structured graphs — and render them to SVG/PNG.

Supports stdio (local IDE/desktop) and streamable-HTTP (cloud / network) transports out of the box.

## Install

```bash
npm install @aigentive/wire-mcp
# optional — needed only if you want PNG output
npm install @resvg/resvg-js
```

## Run

```bash
# stdio — for Claude Desktop, Cursor, Claude Code, and local MCP clients
node node_modules/@aigentive/wire-mcp/dist/server.js

# streamable HTTP — for cloud agents / network clients
node node_modules/@aigentive/wire-mcp/dist/server.js --http
```

When installed globally:

```bash
wire-mcp           # stdio
wire-mcp --http    # http on port 3860
```

### Environment

| Var | Default | Purpose |
|---|---|---|
| `WIRE_STORAGE_DIR` | `~/.wire/diagrams` | Directory for `*.json` diagram files |
| `WIRE_HTTP_PORT` | `3860` | HTTP transport port |
| `WIRE_HTTP_HOST` | `127.0.0.1` | HTTP transport host |
| `WIRE_AUDIT_LOG` | _(stderr only)_ | JSONL audit log file path |
| `WIRE_DEFAULT_LAYOUT` | `LR` | Default layout direction |
| `WIRE_PREVIEW_BASE` | `http://localhost:3870` | Base URL used by preview URLs |
| `WIRE_PNG_ENABLED` | `false` | Enable PNG rasterization path when supported |
| `WIRE_AGENT_ID` | `wire-mcp` | Audit log actor id |

## Tools

| Tool | Purpose |
|---|---|
| `v1_get_agent_guide` | Return the concise MCP agent operating guide for any client that wants live instructions |
| `create_diagram` | Create a new diagram, optionally seeded from a template (`agent-workflow`, `approval-flow`, `rag-pipeline`) |
| `load_diagram` | Load a stored diagram by id |
| `save_diagram` | Overwrite a diagram with full JSON; validates before write |
| `patch_diagram` | Patch top-level diagram fields (`null` clears a field) |
| `list_diagrams` | List stored diagrams (recency-sorted) |
| `add_node` | Append a node (any kind), optionally wired via `from` / `branch` |
| `update_node` | Patch fields on a node (`null` to clear) |
| `remove_node` | Remove a node and prune incoming refs |
| `move_node` | Persist node position |
| `resize_node` | Persist node size |
| `connect` | Connect two nodes; supports explicit edge ids, branches, labels, handles, style, label style, routing, and data |
| `disconnect` | Remove a connection (branch-aware sweep when `branch` omitted) |
| `update_edge` | Patch an explicit edge by id (`fromHandle`, `toHandle`, `style`, `labelStyle`, `routing`, etc.) |
| `remove_edge` | Remove an explicit edge by id |
| `add_note` | Add an annotation; `attachedTo` for visual association |
| `set_layout` | Change layout direction/engine |
| `add_group` | Add a group node and optionally parent existing children |
| `ungroup` | Clear children/parent links for a group |
| `patch_metadata` | Patch `diagram.metadata` keys |
| `apply_actions` | Apply a batch of `WireAction` mutations atomically |
| `validate` | Run schema + structural validation; returns issue codes + repair hints |
| `get_diagram_json` | Return raw canonical JSON |
| `render_svg` | Server-side SVG render |
| `render_png` | PNG via `@resvg/resvg-js` (falls back to SVG if not installed) |
| `render_preview` | Return a browser preview URL using `WIRE_PREVIEW_BASE` |
| `summarize_diagram` | Plain-text summary (counts by kind, triggers, ends, branches) |
| `export_mermaid` | Convert to Mermaid `flowchart` syntax |

### Edge Handles And Explicit Edges

Use `from` on the target node for ordinary agent-friendly connections. Use an
explicit edge when you need a stable edge id, label, branch, handles, style,
label style, routing, markers, or future edge edits.

```json
{
  "diagramId": "agent-router",
  "id": "route-sales",
  "from": "route.sales",
  "to": "notify-sales",
  "label": "sales",
  "fromHandle": "right",
  "toHandle": "left",
  "routing": "smoothstep",
  "style": { "markerEnd": "arrow", "strokeWidth": 2 },
  "labelStyle": { "background": "#ffffff", "fontSize": 12 }
}
```

Allowed handle values are `left`, `right`, `top`, and `bottom`. Allowed routing
values are `bezier`, `smoothstep`, `step`, and `straight`.

Patch an explicit edge with `update_edge`:

```json
{
  "diagramId": "agent-router",
  "id": "route-sales",
  "patch": {
    "fromHandle": "right",
    "toHandle": "left",
    "style": { "markerEnd": "arrow", "stroke": "#2563eb" }
  }
}
```

Use `disconnect` for node `from` references. Use `remove_edge` for explicit edge
ids.

## Resources

- `wire://diagrams/{id}.json` — canonical JSON
- `wire://diagrams/{id}.svg` — rendered SVG
- `wire://diagrams/{id}.png` — PNG rasterization or SVG fallback
- `wire://diagrams/{id}.mermaid` — Mermaid syntax
- `wire://diagrams/{id}/preview` — browser preview URL
- `wire://templates/` — list templates
- `wire://templates/{name}` — fetch a template
- `wire://schemas/wire-diagram` — JSON schema info

## Prompts

- `diagram_from_codebase` — generate an architecture diagram from a repo
- `diagram_from_logs` — reconstruct a workflow from log lines
- `diagram_from_workflow_description` — convert prose to a diagram
- `review_diagram_for_clarity` — critique an existing diagram
- `simplify_diagram` — refactor for clarity

## Claude Desktop config

```json
{
  "mcpServers": {
    "wire": {
      "command": "node",
      "args": ["/absolute/path/to/wire/packages/wire-mcp/dist/server.js"],
      "env": {
        "WIRE_STORAGE_DIR": "/Users/me/Documents/wire-diagrams"
      }
    }
  }
}
```

## License

MIT
