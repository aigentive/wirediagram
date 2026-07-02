# MCP Client Setup

Wire works with any MCP-compatible client. The server supports stdio for local
single-machine use and streamable HTTP for shared/network deployments.

## Tool Name Prefixes

Wire registers bare MCP methods such as `create_diagram`, `add_node`,
`connect`, and `validate`. Host applications may expose those names directly or
prefix them with the configured server name.

Common forms:

```text
Wire MCP bare method: create_diagram
Server-name prefix:    wire__create_diagram
Claude-style prefix:   mcp__wire__create_diagram
```

Use the tool names your MCP host actually lists. Do not invent a prefix from the
package name.

## Option 1: stdio

Use stdio when the MCP client runs the server process directly. The npm
package is the default setup; cloning this repo is only needed for local
development.

```bash
npx -y @aigentive/wire-mcp@latest
```

Example MCP server config:

```json
{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_STORAGE_DIR": "/absolute/path/to/wire-diagrams",
        "WIRE_DEFAULT_LAYOUT": "LR",
        "WIRE_PREVIEW_BASE": "http://localhost:3870",
        "WIRE_AGENT_ID": "wire-local"
      }
    }
  }
}
```

For cloud-backed sync with the hosted Wire workspace, generate an API key from
`/wires` -> **Connect local MCP** and add:

```json
{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_CLOUD_URL": "https://wire.example.com",
        "WIRE_CLOUD_API_KEY": "PASTE_WIRE_CLOUD_API_KEY"
      }
    }
  }
}
```

Restart the MCP client after adding the server. Existing Claude Code sessions
do not automatically gain new MCP tools.

With `WIRE_CLOUD_URL` configured, `render_preview` returns Wire Cloud share URLs
for browser viewing and raw embeds: SVG, PNG, JSON, and Mermaid. It accepts
`scope: "view" | "edit"` and `pinRevision: true` for immutable embed links.
`render_svg` and `render_png` return inline assets directly from the MCP server.

Run the playground locally only for local-only development, where
`render_preview` falls back to localhost:

```bash
npm run dev:playground
# http://localhost:3870
```

## Option 2: streamable HTTP

Use HTTP when several agents or machines should share one Wire MCP server.

From npm:

```bash
npx -y @aigentive/wire-mcp@latest --http
# http://127.0.0.1:3860/mcp
# http://127.0.0.1:3860/health
```

Cloud-backed local HTTP:

```bash
WIRE_CLOUD_URL='https://wire.example.com' \
WIRE_CLOUD_API_KEY='PASTE_WIRE_CLOUD_API_KEY' \
npx -y @aigentive/wire-mcp@latest --http
```

Health should show `cloud.enabled: true` when cloud env vars are present.

Repo-local Docker remains available for development:

```bash
docker compose up -d --build wire-mcp
# http://localhost:3860/mcp
# http://localhost:3860/health
```

Example client settings:

```yaml
name: wire
transport: streamable-http
url: https://mcp.example.com/mcp
healthEndpoint: https://mcp.example.com/health
headers:
  # Add auth headers if your gateway requires them.
  # Authorization: Bearer ${WIRE_MCP_TOKEN}
```

The tool surface is identical to stdio. Only the transport changes.

## Required Tool Surface

| Tool | Use it when... |
|---|---|
| `v1_get_agent_guide` | Fetching the concise live operating guide for agents |
| `v1_get_docs_shape` | Fetching compact docs chunks by topic or task before uncertain work |
| `v1_get_capabilities` | Discovering server/docs/schema versions, reducer actions, and implemented vs reserved capabilities |
| `create_diagram` | Starting a new diagram, optionally from a template |
| `load_diagram` / `list_diagrams` | Resuming or discovering existing diagrams |
| `save_diagram` / `patch_diagram` | Replacing or patching top-level diagram JSON |
| `add_node` / `update_node` / `remove_node` | Creating, editing, and deleting nodes |
| `move_node` / `resize_node` | Persisting manual layout changes from an editor |
| `connect` / `disconnect` | Wiring node `from` references or explicit edges |
| `update_edge` / `remove_edge` | Patching or deleting explicit edges by id |
| `add_note` | Adding an annotation node |
| `set_layout` | Switching layout direction; `elk` is reserved and currently falls back to dagre with a validation warning |
| `add_group` / `ungroup` | Grouping existing nodes or clearing group membership |
| `patch_metadata` | Updating `diagram.metadata` without replacing unrelated keys |
| `apply_actions` | Applying a coherent batch of `WireAction` mutations atomically |
| `validate` | Running structural checks and repair hints |
| `get_diagram_json` | Reading canonical JSON |
| `render_svg` / `render_png` | Producing image output |
| `render_preview` | Returning browser and raw asset URLs for visual review |
| `summarize_diagram` | Returning a plain-text summary |
| `export_mermaid` | Converting to Mermaid for docs or chat |

Use `apply_actions` for multi-step changes so validation runs once after the
logical edit.

## Edge Handles And Explicit Edges

Use node `from` for ordinary connections. Use an explicit edge when the
connection needs an id, label, branch, handle pins, style, label style, routing,
or future edge edits.

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

Allowed handles: `left`, `right`, `top`, `bottom`.
Allowed routing: `bezier`, `smoothstep`, `step`, `straight`.
Allowed edge markers: `arrow`, `circle`, `diamond`, `none`.

Use `update_edge` for explicit edge ids, `remove_edge` to delete explicit edges,
and `disconnect` for node `from` references.

## Resources And Prompts

Resources:

```text
wire://diagrams/{id}.json
wire://diagrams/{id}.svg
wire://diagrams/{id}.png
wire://diagrams/{id}.mermaid
wire://diagrams/{id}/preview
wire://templates/
wire://templates/{name}
wire://schemas/wire-diagram
wire://mcp/capabilities
```

Prompts:

```text
diagram_from_codebase
diagram_from_logs
diagram_from_workflow_description
review_diagram_for_clarity
simplify_diagram
```

## Troubleshooting

If tools are unavailable, check the configured MCP server name, process logs,
and whether the host exposes tools from that server.

If `render_preview` URLs point to localhost in production, verify the MCP
process has `WIRE_CLOUD_URL` set or explicitly set `WIRE_PREVIEW_BASE` to your
deployed playground URL.

If HTTP clients fail after reconnecting, check `/health` and server logs. The
HTTP server supports multiple sessions, but a bad volume mount, missing storage
permissions, or a crashed container will still break reconnects.

If validation reports `node.forbidden-field`, the diagram contains non-canonical
fields. Use `from` or explicit `edges`; do not use `connectsTo`.
