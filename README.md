# Wire

> The diagram library agents can reliably create, edit, validate, and explain.

Wire is an LLM-first diagram library with native MCP support. It pairs canonical `WireDiagram` JSON with a shared `WireAction` reducer, reusable React editor/viewer components, static SVG/PNG/Mermaid renderers, and an MCP server so agents can author, validate, edit, and render diagrams as structured data.

## Why Wire

LLMs and agents struggle with diagrams: they emit Mermaid blobs that almost render, JSX trees that go fragile on edit, or PNGs they cannot revise. Wire solves this by giving agents canonical `WireDiagram` JSON they can read, mutate, validate, and re-render — with the same durable model behind React, CLI, and MCP surfaces.

- **Canonical JSON** — `from`, `branch`, `attachedTo`, `tone`, `handles`, style, routing, and metadata semantics designed to be unambiguous to LLMs.
- **Shared actions** — every human, hosted editor, CLI, and MCP edit flows through the `WireAction` reducer in `wire-core`.
- **React library** — `WireEditor`, `WireViewer`, `WireCanvas`, palette, toolbar, inspector, validation panel, and JSX authoring.
- **LLM-friendly React extensibility** — option catalogs, custom node cards, custom edge renderers, and custom group renderers without requiring app code to import a graph-canvas package.
- **Static renderers** — SVG, PNG, Mermaid, and optional canvas-adapter conversion without pulling React into server-only consumers.
- **MCP server** — diagram CRUD, direct action tools, atomic `apply_actions`, resources, prompts, render tools, and `v1_get_agent_guide` over stdio or HTTP.
- **Hosted parity** — the playground/editor uses `@aigentive/wire-react`, stores canonical JSON, and renders from the same model as MCP.

## Packages

| Package | Description |
|---|---|
| [`@aigentive/wire-core`](packages/wire-core) | Schema, validation, IDs, graph normalization, layout, pure `WireAction` reducer |
| [`@aigentive/wire-renderers`](packages/wire-renderers) | Static renderers and adapters: SVG, PNG helpers, Mermaid, optional canvas-adapter conversion |
| [`@aigentive/wire-react`](packages/wire-react) | Reusable React editor/viewer components and JSX authoring facade |
| [`@aigentive/wire-mcp`](packages/wire-mcp) | MCP server (stdio + streamable-HTTP) |
| [`@aigentive/wire-cli`](packages/wire-cli) | `wire` CLI (init, add, validate, export, ls) |
| [`apps/playground`](apps/playground) | Self-hostable Next.js playground, JSON share API, React editor, preview/render service |

## Quick start

```bash
# clone + install
git clone https://github.com/aigentive/wirediagram.git
cd wirediagram
npm install
npm run build
npm test
```

### Use the MCP server locally (stdio)

```bash
# npm package, stdio transport
npx -y @aigentive/wire-mcp@latest

# or HTTP transport (default port 3860)
npx -y @aigentive/wire-mcp@latest --http
```

### Configure a local MCP client

```json
{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_STORAGE_DIR": "/absolute/path/to/diagrams"
      }
    }
  }
}
```

### Use the CLI

```bash
npm install -g @aigentive/wire-cli
wire init my-flow --template=approval-flow
wire add ai --diagram=my-flow --title="Classify" --from=incoming --model=fast-model
wire validate my-flow
wire export my-flow --format=svg --out=my-flow.svg
wire ls
```

### Use from a React app

Controlled editor:

```tsx
import type { WireDiagram } from "@aigentive/wire-core";
import { WireEditor, WireViewer } from "@aigentive/wire-react";
import "@aigentive/wire-react/styles.css";

export function WorkflowEditor({
  diagram,
  onChange
}: {
  diagram: WireDiagram;
  onChange: (diagram: WireDiagram) => void;
}) {
  return <WireEditor diagram={diagram} onChange={onChange} fitView showMiniMap />;
}

export function WorkflowPreview({ diagram }: { diagram: WireDiagram }) {
  return <WireViewer diagram={diagram} fitView />;
}
```

Custom editor surface:

```tsx
import "@aigentive/wire-react/styles.css";
import {
  WireCanvas,
  WireInspector,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";

export function ProductEditor({ diagram, onChange }) {
  return (
    <WireProvider diagram={diagram} onChange={onChange}>
      <WireToolbar />
      <WirePalette />
      <WireCanvas mode="edit" fitView />
      <WireInspector />
      <WireValidationPanel />
    </WireProvider>
  );
}
```

LLM-friendly custom cards and options:

```tsx
import "@aigentive/wire-react/styles.css";
import {
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const options: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select", options: ["careful-model", "balanced-model"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1 }
  ]
};

export function AgentEditor({ diagram, onChange }) {
  return (
    <WireWorkspace
      diagram={diagram}
      onChange={onChange}
      optionCatalog={options}
      title="Agent workflow"
      subtitle={`${diagram.nodes.length} nodes`}
    />
  );
}
```

`WireWorkspace` uses a decoupled event model: card/list clicks emit
`node.inspect` and update selection; option panels can follow selection by
default or receive an explicit `inspectNodeId` for fully controlled sidebars.
The package stylesheet is the supported npm-consumer styling path; no utility
source scan is required for the React package.

See [`docs/REACT_COMPONENTS.md`](docs/REACT_COMPONENTS.md), the playground
route `/docs`, and the playground route `/samples/agent-chain`.

JSX authoring remains supported:

```tsx
import { Flow, TriggerNode, AINode, ConditionNode, ActionNode, Note } from "@aigentive/wire-react";

export function Example() {
  return (
    <Flow layout="LR">
      <TriggerNode id="webhook" title="Webhook fires" />
      <AINode id="classify" title="Classify intent" from="webhook" model="careful-model" />
      <ConditionNode id="route" title="Route request" from="classify" branches={["sales", "support", "other"]} />
      <ActionNode id="notify-sales" title="Notify sales" from="route.sales" tone="success" />
      <ActionNode id="open-ticket" title="Open ticket" from="route.support" tone="warning" />
      <Note id="risk" title="Routing risk" attachedTo="classify">
        Check confidence before routing.
      </Note>
    </Flow>
  );
}
```

## Architecture

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ wire-react editor/UI │───▶│      wire-core       │◀───│  wire-mcp (server)   │
│ WireEditor, Canvas   │    │ schema · validate    │    │ actions, render…     │
└──────────────────────┘    │ normalize · layout   │    └──────────────────────┘
                            │ actions · reducer    │
                            └─────────┬────────────┘                ▲
                                      │                             │
                                      ▼                             │
                            ┌──────────────────────┐                │
                            │   wire-renderers     │                │
                            │ SVG · PNG · Mermaid  │                │
                            └──────────┬───────────┘                │
                                       │                            │
                                       ▼                            │
                            ┌──────────────────────┐                │
                            │  apps/playground     │────────────────┘
                            │ Next.js · Share JSON │   preview/edit/render
                            └──────────────────────┘
```

## Canonical Data And Actions

Wire JSON is the source of truth. The React canvas in `@aigentive/wire-react`
renders directly from that model and emits `WireAction` updates back into it.

Minimum shape:

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

Use node `from` for ordinary connections. Use explicit `edges` when a connection
needs a stable id, label, branch, `fromHandle`, `toHandle`, style, label style,
routing, markers, or future edge edits.

All user-visible edits should become `WireAction` values. Direct MCP tools and
React gestures both map to the same reducer:

```text
node.add, node.patch, node.remove, node.move, node.resize
edge.connect, edge.patch, edge.disconnect, edge.remove
diagram.patch, metadata.patch, layout.apply, group.add, group.ungroup, note.add
```

For multi-step changes, use `apply_actions` so the batch is atomic and validated
once.

## MCP Surface

Wire MCP exposes direct tools for common actions, plus `apply_actions` for any
full reducer action:

```text
v1_get_agent_guide, v1_get_docs_shape
create_diagram, load_diagram, save_diagram, patch_diagram, list_diagrams
add_node, update_node, remove_node, move_node, resize_node
connect, disconnect, update_edge, remove_edge
add_note, set_layout, add_group, ungroup, patch_metadata, apply_actions
validate, get_diagram_json, render_svg, render_png, render_preview
summarize_diagram, export_mermaid
```

Edge handles and styling are first-class:

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

Use `update_edge` to patch explicit edges by id. Use `disconnect` for node
`from` references and `remove_edge` for explicit edge ids.

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
```

Prompts:

```text
diagram_from_codebase
diagram_from_logs
diagram_from_workflow_description
review_diagram_for_clarity
simplify_diagram
```

## Hosted JSON Storage

The playground is intentionally simple and deployment-safe:

1. `WireProvider`/`WireEditor` receives a canonical `WireDiagram`.
2. React edits dispatch core actions and emit the next diagram through
   `onChange`.
3. `POST /api/share` validates and canonicalizes the JSON.
4. The JSON is stored at `wires/{token}.json`, where `token` is a content hash.
   Hosted playground storage uses Turso/libSQL when `TURSO_DATABASE_URL` is
   configured and local SQLite during development. Vercel Blob is used only when
   explicitly selected with `WIRE_CLOUD_BACKEND=blob`.
5. Authenticated shares mint separate random view/edit tokens.
6. `/s/{viewToken}` renders public read-only HTML, and `/s/{viewToken}.svg`,
   `.png`, `.json`, and `.mmd` return raw embeddable assets.
7. `/e/{editToken}` opens public edit only when an edit-scope share exists.

For a production multi-user hosted app, keep JSON blobs revisioned behind stable ids:

```text
diagrams(id, workspace_id, title, current_revision_id, updated_at)
diagram_revisions(id, diagram_id, blob_key, content_hash, parent_revision_id, created_by, created_at)
```

Saves should take `expectedRevision`, write a new JSON blob, insert a revision,
update `current_revision_id`, and return a conflict instead of overwriting stale
work.

## Deployment

- **Local (stdio)** — bundled MCP server runs alongside a local MCP client.
- **Local (HTTP)** — `wire-mcp --http` for network clients on `:3860`.
- **Local (Docker Compose)** — MCP at `http://localhost:3860/mcp` plus playground/editor at `http://localhost:3870`, with local volumes for diagrams and share tokens.
- **Cloud (Docker)** — multi-stage `Dockerfile` deploys MCP to Fly, Render, Cloud Run, or Kubernetes; persistent volume at `/data/diagrams`.
- **Cloud (Vercel)** — `apps/playground` is a Next.js React editor, JSON share API, and renderer/preview surface deployable as a Vercel app with Turso/libSQL storage.

Run the full local Docker stack:

```bash
docker compose up -d --build
# MCP:        http://localhost:3860/mcp
# Playground: http://localhost:3870
```

See [DEPLOY.md](docs/DEPLOY.md) for local Docker, HTTP, and self-hosted Vercel deployment instructions.

## MCP Client Setup

Wire works with any MCP-compatible client. The usual local setup is a stdio
server named `wire`:

```yaml
mcpServers:
  wire:
    command: npx
    args:
      - -y
      - @aigentive/wire-mcp@latest
    env:
      WIRE_STORAGE_DIR: ${HOME}/Documents/wire-diagrams
      WIRE_PREVIEW_BASE: http://localhost:3870
```

For authenticated cloud sync, generate an API key from **Wires -> Connect local
MCP** and add:

```yaml
env:
  WIRE_CLOUD_URL: https://wire.example.com
  WIRE_CLOUD_API_KEY: PASTE_WIRE_CLOUD_API_KEY
```

With cloud sync configured, `render_preview` returns hosted Wire Cloud URLs:
public view, optional edit, SVG, PNG, JSON, Mermaid, and workspace links.
Customers do not need a local playground. `render_svg` and `render_png` still
return inline assets directly from the MCP server.

Some clients expose tools as bare MCP names such as `create_diagram`; others
prefix tools with the server name, such as `wire__create_diagram` or
`mcp__wire__create_diagram`. Full setup examples for stdio, HTTP, tool prefixes,
resources, and prompts are in [MCP_CLIENTS.md](docs/MCP_CLIENTS.md).

## Examples

- [`examples/agent-router.json`](examples/agent-router.json) — webhook → classify → route
- [`examples/refund-approval.json`](examples/refund-approval.json) — threshold-gated refund with human-in-the-loop
- [`examples/rag-pipeline.json`](examples/rag-pipeline.json) — RAG with self-critique + retry loop

## License

Apache-2.0 — see [LICENSE](LICENSE).
