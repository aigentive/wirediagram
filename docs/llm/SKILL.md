---
name: wire-diagram-authoring
description: Use when an agent needs to create, edit, validate, render, stylize, branch, group, or embed Wire diagrams using canonical WireDiagram JSON, WireAction reducer actions, @aigentive/wire-react, @aigentive/wire-mcp, or @aigentive/wire-cli. Trigger for Wire diagram generation, React embeds, MCP/CLI workflows, and LLM-authored Wire JSON.
---

# Wire Diagram Authoring

## Contract

- Durable state is `WireDiagram` JSON.
- Durable edits are `WireAction` reducer actions or MCP tools that apply those actions.
- Do not make generic graph node/edge objects the app contract.
- Do not invent `V2`, `Next`, `Pro`, alternate package names, or parallel public APIs.
- Keep current names: `@aigentive/wire-react`, `WireProvider`, `WireCanvas`, `WireWorkspace`, `WireInspector`, `WireOptionSpec`, `WireOptionCatalog`, `WireOptionPanel`, `WireEditor`, and `WireViewer`.
- React consumers import `@aigentive/wire-react/styles.css`; they do not need Tailwind. Use CSS variables, `colorMode`, `unstyled`, and `classNames` for styling boundaries.

## Operating Loop

1. Read `/llm/wire-docs.shape.json` or call `v1_get_docs_shape({ task })`.
2. Read `/llm/schema/wire-diagram.json` before producing raw JSON.
3. Create or load a `WireDiagram`.
4. Apply coherent edits with `WireAction` batches or MCP `apply_actions`.
5. Validate after every saved edit.
6. Repair by stable validation code and hint.
7. Render only after validation errors are gone.

## Wire JSON Rules

Use this shape:

```json
{
  "version": 1,
  "id": "support-flow",
  "title": "Support flow",
  "layout": "LR",
  "nodes": [
    { "id": "ticket", "kind": "trigger", "title": "New ticket" },
    { "id": "classify", "kind": "ai", "title": "Classify intent", "from": "ticket" },
    { "id": "resolve", "kind": "action", "title": "Resolve request", "from": "classify" }
  ],
  "edges": []
}
```

Node ids and branch names are slug-like. Node kinds are lowercase:
`trigger`, `action`, `ai`, `tool`, `condition`, `human`, `memory`,
`retrieval`, `guardrail`, `end`, `note`, `group`.

To connect A -> B, set `B.from = "A"`. For condition branches, set
`target.from = "conditionId.branch"` and ensure the condition declares that
branch. Use `edges[]` only for labels, handles, edge style, routing, or stable
edge ids. Do not duplicate the same connection in `from` and `edges[]`.

## Recipes

### Create

- MCP: `create_diagram`, then `apply_actions`, then `validate`.
- CLI: `wire init <id>`, `wire add <kind>`, then `wire validate <id>`.
- Raw JSON: write `version`, `layout`, `nodes`, and `edges`, then validate.

### Edit

Use one batch for related edits:

```json
[
  { "type": "node.add", "node": { "id": "review", "kind": "human", "title": "Review reply", "from": "draft" } },
  { "type": "node.patch", "id": "send", "patch": { "from": "review" } }
]
```

MCP equivalent: `apply_actions({ diagramId, actions })`.

### Validate And Repair

- Run MCP `validate`, CLI `wire validate`, or `validate()` from `@aigentive/wire-core`.
- Treat `error` severity as blocking.
- Repair the smallest field first.
- Re-run validation before render/share/export.

Common repairs:

- `schema.invalid_union_discriminator`: use supported lowercase `kind`.
- `edge.from-missing`: add the source node or change the target `from`.
- `edge.unknown-branch`: add the branch to the condition or use a declared branch.
- `node.forbidden-field`: replace `source`, `target`, `next`, or `connectsTo` with target-side `from`.
- `group.child-parent-mismatch`: align `group.children` and child `parent`.

### Render

- MCP: `validate`, then `render_preview`, `render_svg`, `render_png`, or `export_mermaid`.
- CLI: `wire validate <id>`, then `wire export <id> --format=svg|json|mermaid`.
- SVG, PNG, and Mermaid are exports. `WireDiagram` remains source of truth.

### Style

Persist semantic style in the diagram:

```json
{
  "tone": "info",
  "style": {
    "fill": "#eef6ff",
    "stroke": "#2563eb",
    "borderRadius": 8,
    "shadow": true
  },
  "data": {
    "card": {
      "badges": [{ "label": "SLA", "tone": "info" }],
      "footer": "Auto-routed"
    }
  }
}
```

Use `node.tone`, `node.style`, `edge.style`, `edge.labelStyle`, and `edge.routing`.
Use `data.card` only for serializable card content: `title`, `description`,
`badges`, `meta`, `progress`, and `footer`.

### Branch

```json
[
  { "id": "route", "kind": "condition", "title": "Route?", "branches": ["sales", "support"], "from": "classify" },
  { "id": "sales", "kind": "action", "title": "Create sales lead", "from": "route.sales" },
  { "id": "support", "kind": "action", "title": "Open support ticket", "from": "route.support" }
]
```

Validate for `edge.unknown-branch` and `condition.unused-branch`.

### Group

Use groups for visible parent frames:

```json
{
  "type": "group.add",
  "group": { "id": "knowledge", "kind": "group", "title": "Knowledge retrieval" },
  "children": ["rewrite", "search", "filter"]
}
```

Raw JSON must keep `group.children` and each child `parent` aligned.

### Embed

```tsx
import "@aigentive/wire-react/styles.css";
import { WireViewer } from "@aigentive/wire-react";

export function FlowEmbed({ diagram }: { diagram: WireDiagram }) {
  return <WireViewer diagram={diagram} colorMode="system" />;
}
```

Use `WireViewer` for read-only, `WireEditor` or `WireWorkspace` for editable
embeds, and `WireProvider` plus `WireCanvas` for custom shells. Persist the
`WireDiagram` emitted from `onChange`.

## Guardrails

- Do not output Mermaid as primary state.
- Do not persist adapter nodes/edges from a canvas library.
- Do not put React components, HTML, SVG, or CSS in `data.card`.
- Do not cite unrelated external inspiration as implementation guidance.
- Do not skip validation before render/share/export.
