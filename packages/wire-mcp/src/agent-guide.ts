export const WIRE_AGENT_GUIDE = `# Wire MCP Agent Guide

Wire is the workflow diagram layer agents and humans operate together. It gives
MCP agents, React apps, renderers, and hosted playgrounds the same canonical diagram
object, the same mutation layer, and the same rendering semantics.

## Tool Names

Bare Wire MCP method names are used by this server. Host wrappers may prefix
them:

- Wire MCP bare method: create_diagram
- Server-name prefix when configured as "wire": wire__create_diagram
- Claude-style prefix in some hosts: mcp__wire__create_diagram

Never invent a namespace from this guide name. Use the actual server prefix
provided by the host.

## Canonical Model

Wire JSON is the source of truth. Do not hand-edit React Flow JSON as the
primary representation.

Use node "from" for normal agent-facing connections. Use explicit edges when a
connection needs a stable edge id, label, branch, handles, style, routing, or
non-tree semantics.

Core node kinds:
trigger, action, ai, tool, condition, human, memory, retrieval, guardrail, end,
note, group.

Core edge fields:
id, from, to, branch, label, tone, fromHandle, toHandle, style, labelStyle,
routing, data.

Handle values:
left, right, top, bottom.

Routing values:
bezier, smoothstep, step, straight.

Marker values in edge style:
arrow, circle, diamond, none.

## Operating Sequence

Create:
1. create_diagram({ id, title, layout })
2. apply_actions({ diagramId, actions }) for coherent multi-node edits
3. validate({ diagramId })
4. render_preview({ diagramId }) for human/browser review

Edit:
1. get_diagram_json({ diagramId }) or load_diagram({ diagramId })
2. validate({ diagramId })
3. apply_actions({ diagramId, actions }) when changing more than one thing
4. validate({ diagramId })
5. summarize_diagram({ diagramId }) or render_preview({ diagramId })

Review:
1. summarize_diagram({ diagramId })
2. validate({ diagramId })
3. render_svg({ diagramId }) and render_preview({ diagramId }) when visual
   inspection matters.

## Mutation Rules

Every user-visible edit should be represented as a WireAction and applied
through wire-core semantics. Prefer apply_actions for multi-step edits because
it applies atomically and validates once.

Use stable ids that describe workflow intent. Preserve existing position and
size fields when editing a diagram already arranged by a human.

Do not introduce "connectsTo"; use "from" or explicit edges.

## Connection Rules

For a simple unlabeled connection, use node "from" or the connect tool without
edge-only fields:

connect({ diagramId, from: "trigger", to: "classify" })

For a condition branch, use either branch or a dotted source ref:

connect({ diagramId, from: "route", to: "notify-sales", branch: "sales" })
connect({ diagramId, from: "route.sales", to: "notify-sales" })

For handles, labels, routing, marker styles, or any edge you may edit/delete by
id later, create an explicit edge:

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

Use update_edge to patch explicit edges:

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

Use null in patch objects to clear fields. For node "from" references, use
disconnect. For explicit edges, use remove_edge by id.

## Direct Action Tools

Use these direct tools when one user-visible edit maps to one action:

- patch_diagram: top-level diagram fields.
- patch_metadata: diagram.metadata keys.
- add_node, update_node, remove_node.
- move_node: persist a node position.
- resize_node: persist a node size.
- connect and disconnect.
- update_edge and remove_edge for explicit edges.
- add_note.
- add_group and ungroup.
- set_layout.

Use apply_actions when several edits are one logical change or when you need an
action not represented by a direct tool. Supported WireAction types:

diagram.create, diagram.patch, node.add, node.patch, node.remove, node.move,
node.resize, edge.connect, edge.patch, edge.disconnect, edge.remove,
layout.apply, group.add, group.ungroup, note.add, metadata.patch.

## Tool Surface

Main tools:
create_diagram, load_diagram, save_diagram, patch_diagram, list_diagrams,
add_node, update_node, remove_node, move_node, resize_node, connect, disconnect,
update_edge, remove_edge, add_note, set_layout, add_group, ungroup,
patch_metadata, apply_actions, validate, get_diagram_json, render_svg,
render_png, render_preview, summarize_diagram, export_mermaid,
v1_get_agent_guide.

Resources:
wire://diagrams/{id}.json, wire://diagrams/{id}.svg,
wire://diagrams/{id}.png, wire://diagrams/{id}.mermaid,
wire://diagrams/{id}/preview, wire://templates/, wire://templates/{name},
wire://schemas/wire-diagram.

Prompts:
diagram_from_codebase, diagram_from_logs, diagram_from_workflow_description,
review_diagram_for_clarity, simplify_diagram.

## Preview And React

render_preview returns browser and embed URLs. With WIRE_CLOUD_URL and
WIRE_CLOUD_API_KEY configured, it mints Wire Cloud share links and returns
urls.view, urls.svg, urls.png, urls.json, urls.mermaid, and urls.workspace.
Pass scope: "view" for read-only shares or scope: "edit" when public editing is
intended. Pass pinRevision: true for immutable embed links. Otherwise it uses
WIRE_PREVIEW_BASE, falling back to http://localhost:3870 for local development.
render_svg and render_png return inline assets directly from the MCP server.

React apps should consume @aigentive/wire-react. A hosted app may own auth,
workspace routing, persistence, sharing links, and product chrome, but node
rendering, edge rendering, canvas behavior, mutation semantics, validation UI,
palette behavior, and inspector primitives belong in @aigentive/wire-react.

## Hosted Persistence Contract

In hosted deployments, store canonical Wire JSON. The React editor should be controlled by
the diagram object and should persist every accepted edit through onChange.

Current playground flow:
1. WireEditor/WireCanvas emits the next WireDiagram through onChange.
2. POST /api/share validates and canonicalizes the JSON.
3. The JSON is written to wires/{token}.json in Vercel Blob or a local
   filesystem share store.
4. Authenticated share creation mints separate random view/edit tokens.
5. /s/{viewToken} and /s/{viewToken}.svg/.png/.json/.mmd expose public,
   read-only browser and raw asset views.
6. /e/{editToken} opens public edit only when an edit-scope token exists.

Production apps should use stable diagram ids plus revisions:
diagrams(id, current_revision_id, workspace_id, title) and
diagram_revisions(id, diagram_id, blob_key, content_hash, parent_revision_id).
Saves should validate, write a new JSON blob, insert a revision, and reject stale
expectedRevision values instead of overwriting silently.
`;
