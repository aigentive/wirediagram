# @aigentive/wire-core

Canonical Wire schema, validation, normalization, layout, and `WireAction`
reducers. Zero React; pure TypeScript.

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
  applyWireActions,
  addNode,
  connect,
  emptyDiagram
} from "@aigentive/wire-core";

const diagram = parseWireDiagram({
  layout: "LR",
  nodes: [
    { id: "webhook", kind: "trigger", title: "Webhook fires" },
    { id: "classify", kind: "ai", title: "Classify intent", from: "webhook", model: "intent-classifier" }
  ]
});

const result = validate(diagram);
if (!result.valid) console.error(result.issues);

const layout = layoutDiagram(diagram);            // dagre-positioned nodes
const mermaid = toMermaid(diagram);               // export as Mermaid string

// Mutations are pure — every editor returns a new diagram.
let d = emptyDiagram({ layout: "LR" });
d = addNode(d, { kind: "trigger", title: "Webhook fires", id: "webhook" }).diagram;
d = addNode(d, { kind: "ai", title: "Classify", from: "webhook", model: "intent-classifier" }).diagram;
d = applyWireActions(d, [
  { type: "node.add", node: { id: "review", kind: "human", title: "Review", from: "classify" } }
]).diagram;
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
| `applyWireAction`, `applyWireActions`, `WireAction` | Canonical reducer action contract used by React and MCP |
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
  style?: NodeStyle;
  handles?: { source?: Side[]; target?: Side[] };
  data?: Record<string, unknown>;
  // condition: branches: string[]
  // ai: model?, prompt?, tools?
  // tool: ref?
  // note: body?
  // group: children?
};
```

Connections are target-centric. To connect A -> B, set `B.from = "A"`. To
connect condition branches, set `target.from = "conditionId.branch"` and ensure
the condition node declares that branch. Use `edges[]` only when labels,
handles, edge style, routing, or stable edge ids are required.

## Styling

Persisted styling lives inside `WireDiagram`:

- `node.tone`: semantic visual tone.
- `node.style`: `fill`, `stroke`, `strokeWidth`, `strokeDasharray`,
  `borderRadius`, `opacity`, `shadow`, and `textColor`.
- `node.handles`: allowed source/target handle sides.
- `node.data.card`: serializable card content only: `title`, `description`,
  `badges`, `meta`, `progress`, and `footer`.
- `edge.style`: `stroke`, `strokeWidth`, `strokeDasharray`, markers, and
  `curvature`.
- `edge.labelStyle`: label fill/background/border/font size.
- `edge.routing`: `bezier`, `smoothstep`, `step`, or `straight`.

Do not store React components, HTML, SVG, CSS, or canvas adapter state in
`WireDiagram`.

## WireAction

`WireAction` is the durable reducer action contract. It is shared by
`@aigentive/wire-react` and `@aigentive/wire-mcp`.

Supported action types:

- `diagram.create`, `diagram.replace`, `diagram.patch`, `batch`
- `node.add`, `node.patch`, `node.remove`, `node.move`, `node.resize`
- `edge.connect`, `edge.patch`, `edge.disconnect`, `edge.remove`
- `layout.apply`
- `group.add`, `group.ungroup`
- `note.add`
- `metadata.patch`

Use `applyWireActions(diagram, actions)` for coherent multi-step edits. Do not
introduce versioned action names or use generic graph node/edge objects as the
application contract.

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
| `edge.duplicate-connection` | error | Duplicate connection between the same source/branch and target |
| `group.child-missing` | error | A group lists a missing child id |
| `flow.no-trigger` | warning | Workflow nodes exist without a trigger node |
| `trigger.no-outgoing` | warning | Trigger node has no outgoing connection |
| `end.no-incoming` | warning | End node has no incoming connection |
| `condition.unused-branch` | warning | Declared condition branch has no target |
| `flow.unreachable` | warning | Node is not reachable from any trigger |
| `node.card-invalid` | warning | `data.card` has unsupported or non-serializable shape |
| `node.forbidden-field` | warning | Input used stripped fields such as `source`, `target`, `next`, or `connectsTo` |
| `node.duplicate-from` | warning | Same `from` ref is repeated on one node |
| `node.orphan` | warning | No incoming or outgoing edges |
| `edge.self-loop` | warning | Node references itself |
| `flow.cycle` | warning | A cycle is present in the workflow graph |
| `flow.layout-engine-not-implemented` | warning | `layoutEngine: "elk"` is reserved and falls back to dagre |
| `group.child-parent-mismatch` | warning | Group child and child parent do not agree |

## License

Apache-2.0
