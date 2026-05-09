# @aigentive/wire-react

JSX facade for Wire diagrams. Author diagrams as React components, compile to canonical Wire JSON.

## Install

```bash
npm install @aigentive/wire-react react react-dom
```

`<Flow>` renders as inline SVG by default. `<WireCanvas>` provides the native interactive canvas; no separate canvas-engine package is required.

## Use

```tsx
import {
  Flow,
  TriggerNode,
  AINode,
  ConditionNode,
  ActionNode,
  Note
} from "@aigentive/wire-react";

export function Example() {
  return (
    <Flow layout="LR">
      <TriggerNode id="webhook" title="Webhook fires" />
      <AINode id="classify" title="Classify intent" from="webhook" model="gpt-4.1" />
      <ConditionNode
        id="route"
        title="Route request"
        from="classify"
        branches={["sales", "support", "other"]}
      />
      <ActionNode id="notify-sales" title="Notify sales" from="route.sales" tone="success" />
      <ActionNode id="open-ticket" title="Open ticket" from="route.support" tone="warning" />
      <Note id="risk-note" title="Routing risk" attachedTo="classify">
        Check confidence before routing.
      </Note>
    </Flow>
  );
}
```

## Components

| Component | Wire kind |
|---|---|
| `<TriggerNode>` | trigger |
| `<ActionNode>` | action |
| `<AINode>` | ai (props: `model`, `prompt`, `tools`) |
| `<ToolNode>` | tool (`ref`) |
| `<ConditionNode>` | condition (`branches: string[]` required) |
| `<HumanNode>` | human |
| `<MemoryNode>` | memory |
| `<RetrievalNode>` | retrieval |
| `<GuardrailNode>` | guardrail |
| `<EndNode>` | end |
| `<Note>` | note (`body` or `children`, `attachedTo`) |
| `<Group>` | group (children become group members; `parent` auto-set) |

All components accept the common base props: `id`, `title`, `description`, `tone`, `from`, `attachedTo`, `parent`, `data`, `position`, `size`.

## `<Flow>` modes

- `mode="svg"` (default) — server-renderable inline SVG. Works in any React tree (server components, RSC, plain SPA, static export).
- `mode="json"` — invisible. Use with `onCompile` to capture the JSON.

```tsx
<Flow mode="json" onCompile={(d) => console.log(JSON.stringify(d, null, 2))}>
  <TriggerNode id="t" title="Tick" />
</Flow>
```

## Native pan/zoom canvas

For interactive canvases, compile JSX to a Wire diagram and render it through the built-in provider and canvas.

```tsx
"use client";
import {
  Flow,
  TriggerNode,
  AINode,
  useWireDiagram,
  WireProvider,
  WireCanvas
} from "@aigentive/wire-react";

export function MyDiagram() {
  const diagram = useWireDiagram(
    <Flow layout="LR">
      <TriggerNode id="t" title="Tick" />
      <AINode id="plan" title="Plan" from="t" model="gpt-4.1" />
    </Flow>
  );
  return (
    <div className="h-[600px]">
      <WireProvider diagram={diagram}>
        <WireCanvas mode="edit" />
      </WireProvider>
    </div>
  );
}
```

## LLM-friendly editor extensions

Most apps should extend the built-in canvas with Wire-level props instead of
importing a third-party graph canvas directly:

```tsx
import {
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const options: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select", options: ["gpt-4.1", "gpt-4.1-mini"] },
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

Option values are serializable Wire data. Runtime render callbacks are React-only
and are never stored in canonical JSON.

Cards, node lists, and canvas clicks emit Wire events such as `node.inspect`;
the option panel can follow selection or receive a controlled `nodeId`. This
keeps card rendering decoupled from the sidebar.

See the root docs for the full component prop surface:
[`docs/REACT_COMPONENTS.md`](../../docs/REACT_COMPONENTS.md). The playground
routes `/docs` and `/samples/agent-chain` showcase the reusable component
system, docs, and full app sample.

## Manual compilation

```ts
import { compile } from "@aigentive/wire-react";
const diagram = compile(<Flow>...</Flow>);
```

## License

Apache-2.0
