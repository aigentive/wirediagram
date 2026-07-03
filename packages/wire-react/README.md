# @aigentive/wire-react

JSX facade for Wire diagrams. Author diagrams as React components, compile to canonical Wire JSON.

## Install

```bash
npm install @aigentive/wire-react react react-dom
```

Import the package stylesheet once in your app entry:

```tsx
import "@aigentive/wire-react/styles.css";
```

`<Flow>` renders as inline SVG by default. `<WireCanvas>` provides the native interactive canvas; no separate canvas-engine package is required and no utility-class source scan is required.

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
import "@aigentive/wire-react/styles.css";
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

Most apps should extend the built-in canvas with Wire-level props and keep
`WireDiagram` plus reducer actions as the app contract:

```tsx
import {
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";
import "@aigentive/wire-react/styles.css";

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

Cards, node lists, and canvas clicks emit Wire events such as `node.inspect` and
`edge.click`. `WireInspector` can follow selection or receive explicit `nodeId`
and `edgeId` values, and `WireOptionPanel` can follow selection or receive a
controlled `nodeId`. This keeps card rendering decoupled from sidebars.

## Production component patterns

Controlled editor with the packaged shell:

```tsx
import "@aigentive/wire-react/styles.css";
import { useState } from "react";
import { WireWorkspace, type WireDiagram } from "@aigentive/wire-react";

export function ProductEditor({ initial }: { initial: WireDiagram }) {
  const [diagram, setDiagram] = useState(initial);
  return <WireWorkspace diagram={diagram} onChange={setDiagram} fitView />;
}
```

Custom shell with current components:

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

export function CustomEditor({ diagram, onChange }) {
  return (
    <WireProvider diagram={diagram} onChange={onChange}>
      <WireToolbar />
      <WirePalette />
      <WireCanvas mode="edit" fitView keyboardA11y />
      <WireInspector />
      <WireValidationPanel />
    </WireProvider>
  );
}
```

Read-only viewer:

```tsx
import "@aigentive/wire-react/styles.css";
import { WireViewer } from "@aigentive/wire-react";

export function Preview({ diagram }) {
  return <WireViewer diagram={diagram} fitView colorMode="system" />;
}
```

Theming and design-system integration use current props: `colorMode`,
`unstyled`, `className`, `classNames`, `style`, and CSS variables. Keyboard
navigation, search, connection picking, fit selection, and large-diagram mode are
owned by `WireCanvas`; disable package keyboard handling only with
`keyboardA11y={false}` when your host shell fully replaces it.

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
