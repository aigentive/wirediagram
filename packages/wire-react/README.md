# @aigentive/wire-react

JSX facade for Wire diagrams. Author diagrams as React components, compile to canonical Wire JSON.

## Install

```bash
npm install @aigentive/wire-react react react-dom
```

`<Flow>` renders as inline SVG by default — no `@xyflow/react` peer dep needed. For pan/zoom, install `@xyflow/react` and use the `useWireDiagram` hook + `toReactFlow` (see "Pan/zoom with React Flow" below).

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

## Pan/zoom with React Flow

For interactive canvases, install `@xyflow/react` and compose your own component with the `useWireDiagram` hook + `toReactFlow` adapter.

```tsx
"use client";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import { toReactFlow } from "@aigentive/wire-renderers";
import {
  Flow,
  TriggerNode,
  AINode,
  useWireDiagram
} from "@aigentive/wire-react";
import "@xyflow/react/dist/style.css";

export function MyDiagram() {
  const diagram = useWireDiagram(
    <Flow layout="LR">
      <TriggerNode id="t" title="Tick" />
      <AINode id="plan" title="Plan" from="t" model="gpt-4.1" />
    </Flow>
  );
  const { nodes, edges } = toReactFlow(diagram);
  return (
    <div style={{ height: 600 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

## Manual compilation

```ts
import { compile } from "@aigentive/wire-react";
const diagram = compile(<Flow>...</Flow>);
```

## License

MIT
