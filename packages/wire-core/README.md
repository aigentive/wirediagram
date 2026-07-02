# @aigentive/wire-core

Canonical Wire schema, validation, normalization, and layout. Zero React; pure TypeScript.

## Install

```bash
npm install @aigentive/wire-core
```

## Quick start

```ts
import {
  parseWireDiagram,
  validate,
  layoutDiagram,
  toMermaid,
  addNode,
  connect,
  emptyDiagram
} from "@aigentive/wire-core";

const diagram = parseWireDiagram({
  layout: "LR",
  nodes: [
    { id: "webhook", kind: "trigger", title: "Webhook fires" },
    { id: "classify", kind: "ai", title: "Classify intent", from: "webhook", model: "gpt-4.1" }
  ]
});

const result = validate(diagram);
if (!result.valid) console.error(result.issues);

const layout = layoutDiagram(diagram);            // dagre-positioned nodes
const mermaid = toMermaid(diagram);               // export as Mermaid string

// Mutations are pure — every editor returns a new diagram.
let d = emptyDiagram({ layout: "LR" });
d = addNode(d, { kind: "trigger", title: "Webhook fires", id: "webhook" }).diagram;
d = addNode(d, { kind: "ai", title: "Classify", from: "webhook", model: "gpt-4.1" }).diagram;
```

## Exports

| Export | Purpose |
|---|---|
| `WireDiagramSchema`, `parseWireDiagram`, `safeParseWireDiagram` | Zod schema + parsers |
| `NodeSchema`, kind-specific schemas (`AINodeSchema`, …) | Per-node Zod schemas |
| `validate(input)` | Structural + reference validation; returns `ValidationIssue[]` with codes + repair hints |
| `normalize(diagram)` | Resolves `from`/`after` into explicit edges + node index |
| `layoutDiagram(diagram, opts?)` | Dagre layout returning `{x,y,width,height}` per node |
| `toMermaid(diagram)` | Export as Mermaid `flowchart` string |
| `addNode`, `updateNode`, `removeNode`, `connect`, `disconnect`, `addNote`, `setLayout`, `emptyDiagram` | Pure immutable editors |
| `generateNodeId(opts)`, `slugify(s)` | ID utilities |
| `splitFromRef(ref)` | Parse `"id.branch"` |

## Schema overview

```ts
type WireDiagram = {
  version: 1;
  id?: string;
  title?: string;
  layout: "LR" | "TB" | "RL" | "BT";   // default LR
  layoutEngine?: "dagre" | "elk"; // "elk" is reserved and currently falls back to dagre.
  nodes: WireNode[];
  edges: WireEdge[];                    // optional explicit edges
  metadata?: Record<string, unknown>;
};

type WireNode = {
  id: string;
  kind: "trigger" | "action" | "ai" | "tool" | "condition" | "human" |
        "memory" | "retrieval" | "guardrail" | "end" | "note" | "group";
  title: string;
  description?: string;
  tone?: "default" | "success" | "warning" | "error" | "info" | "ai";
  from?: string | string[];   // "<sourceId>" or "<sourceId>.<branch>"
  after?: string | string[];  // alias for `from`
  attachedTo?: string;        // notes/annotations only
  parent?: string;            // group nesting
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
  // condition: branches: string[]
  // ai: model?, prompt?, tools?
  // tool: ref?
  // note: body?
  // group: children?
};
```

## Validation codes

| Code | Severity | Meaning |
|---|---|---|
| `schema.*` | error | Zod schema rejection |
| `node.duplicate-id` | error | Two nodes with the same id |
| `node.attached-to-missing` | error | `attachedTo` points to a missing node |
| `node.parent-missing` | error | `parent` points to a missing node |
| `node.parent-not-group` | error | `parent` is not a `group` node |
| `condition.no-branches` | error | Condition without branches |
| `condition.duplicate-branch` | error | Repeated branch name |
| `edge.from-missing` / `edge.to-missing` | error | Source/target node missing |
| `edge.branch-from-non-condition` | error | `id.branch` from a non-condition node |
| `edge.unknown-branch` | error | Branch name not declared on the source condition |
| `node.orphan` | warning | No incoming or outgoing edges |
| `edge.self-loop` | warning | Node references itself |

## License

Apache-2.0
