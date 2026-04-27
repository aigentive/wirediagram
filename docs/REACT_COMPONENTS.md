# React Component Props

This is the props reference for the reusable `@aigentive/wire-react` component
surface. These components are intended for product apps and LLM-authored React
screens. App code should pass Wire diagrams, option catalogs, render callbacks,
and event handlers. It should not need React Flow nodes, hooks, or state.

For design examples, run the playground and open `/components`.

## Tailwind CSS v4

The playground uses Tailwind CSS v4 with `tailwindcss@^4.1.18` and
`@tailwindcss/postcss`. If a consuming app uses Tailwind and imports the
prebuilt Wire React components, include the package in Tailwind's source scan:

```css
@import "tailwindcss";

@source "../node_modules/@aigentive/wire-react";
```

In a monorepo workspace, point `@source` at the package source path instead.

## `WireWorkspace`

`WireWorkspace` is the easiest reusable app shell. It composes a provider, node
list, canvas, option panel, and validation panel.

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

| Prop | Type | Default | Notes |
|---|---|---|---|
| `diagram` | `WireDiagram` | - | Controlled diagram. |
| `defaultDiagram` | `WireDiagram` | - | Uncontrolled initial diagram. |
| `onChange` | `(diagram, event) => void` | - | Receives reducer-backed updates. |
| `onAction` | `(action, result) => void` | - | Called after each dispatched action. |
| `onEvent` | `(event) => void` | - | Receives decoupled UI events. |
| `validateOnChange` | `boolean` | provider default | Revalidates after changes. |
| `history` | `boolean` | provider default | Enables undo/redo state. |
| `optionCatalog` | `WireOptionCatalog` | - | Defines editable node options. |
| `inspectNodeId` | `string` | - | Controlled node shown in the option panel. |
| `defaultInspectNodeId` | `string` | - | Initial uncontrolled inspected node. |
| `onInspectNodeChange` | `(nodeId, event) => void` | - | Called on `node.inspect` and optional pane clear. |
| `clearInspectOnPaneClick` | `boolean` | `false` | Clears inspected node when the canvas pane is clicked. |
| `title` | `ReactNode` | `"Wire"` | Sidebar title. |
| `subtitle` | `ReactNode` | - | Sidebar subtitle. |
| `sidebar` | `ReactNode` | - | Replaces the default node list area. |
| `inspector` | `ReactNode` | - | Replaces default options and validation panels. |
| `showNodeList` | `boolean` | `true` | Hides default node list when false. |
| `showOptions` | `boolean` | `true` | Hides default option panel when false. |
| `showValidation` | `boolean` | `true` | Hides default validation panel when false. |
| `layout` | `"fixed" | "embedded"` | `"fixed"` | Use `embedded` inside docs/product pages. |
| `renderNodeCard` | `WireNodeRenderer` | `WireNodeCardView` | Custom non-group node renderer. |
| `renderGroup` | `WireNodeRenderer` | `WireGroupFrame` | Custom group renderer. |
| `canvasProps` | `WireCanvasProps` subset | - | Passed to `WireCanvas`. |
| `className` | `string` | - | Root classes. |
| `sidebarClassName` | `string` | - | Sidebar classes. |
| `canvasClassName` | `string` | - | Canvas section classes. |
| `inspectorClassName` | `string` | - | Inspector classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

## `WireCanvas`

Use `WireCanvas` when building a custom screen around `WireProvider`.

```tsx
<WireProvider diagram={diagram} onChange={setDiagram}>
  <WireCanvas
    mode="edit"
    optionCatalog={options}
    renderNodeCard={AgentCard}
    renderGroup={StageGroup}
    showMiniMap
  />
</WireProvider>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `"view" | "edit"` | provider mode | Controls edit gestures. |
| `selectOnNodeClick` | `boolean` | `true` | Selects clicked nodes. |
| `inspectOnNodeClick` | `boolean` | `true` | Emits `node.inspect` from node clicks. |
| `clearSelectionOnPaneClick` | `boolean` | `true` | Clears canvas selection on pane click. |
| `fitView` | `boolean` | `true` | Fits diagram in viewport. |
| `fitViewPadding` | `number` | `0.08` | Fit-view padding. |
| `showBackground` | `boolean` | `true` | Shows the dotted background. |
| `showControls` | `boolean` | `true` | Shows zoom controls. |
| `showMiniMap` | `boolean` | `false` | Shows minimap. |
| `optionCatalog` | `WireOptionCatalog` | - | Passed into render context. |
| `renderNodeCard` | `WireNodeRenderer` | default card | Runtime card renderer. |
| `renderGroup` | `WireNodeRenderer` | default group | Runtime group renderer. |
| `nodeTypes` | `NodeTypes` | built-ins | Low-level escape hatch. |
| `edgeTypes` | `EdgeTypes` | - | Low-level edge renderer escape hatch. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

## Cards And Groups

`WireNodeCardView` and `WireGroupFrame` are default renderers. Custom renderers
receive `WireNodeRenderContext`.

```tsx
import type { WireNodeRenderContext } from "@aigentive/wire-react";

function AgentCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid min-h-full w-full rounded-lg border border-slate-200 bg-white p-3">
      <strong>{ctx.node.title}</strong>
      <span>{ctx.kind}</span>
    </div>
  );
}
```

| Context field | Type | Notes |
|---|---|---|
| `node` | `WireNode` | Canonical node. |
| `data` | `WireNodeData` | Canvas data wrapper. |
| `kind` | `WireNode["kind"]` | Node kind. |
| `tone` | `Tone` | Resolved tone. |
| `theme` | `WireNodeTheme` | Default visual colors. |
| `selected` | `boolean` | Selection state. |
| `width` | `number` | Measured or default card width. |
| `height` | `number` | Measured or default card height. |
| `options` | `Record<string, unknown>` | `node.data.options`. |
| `optionSpecs` | `WireOptionSpec[]` | Specs matching the node kind. |

## `WireOptionPanel`

`WireOptionPanel` renders typed controls from a `WireOptionCatalog` and patches
nodes through `node.patch`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `catalog` | `WireOptionCatalog` | required | Option specs by node kind. |
| `nodeId` | `string` | selected node | Explicit node to edit. |
| `title` | `string` | `"Options"` | Panel heading. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

`WireOptionCatalog` keys are node kinds or `"*"`.

```tsx
const options: WireOptionCatalog = {
  "*": [{ key: "owner", storage: "data" }],
  ai: [
    { key: "model", storage: "node", type: "select", options: ["gpt-4.1"] },
    { key: "maxSteps", type: "number", min: 1, max: 20, step: 1 }
  ]
};
```

| Option field | Type | Notes |
|---|---|---|
| `key` | `string` | Stable option key. |
| `label` | `string` | Display label. |
| `type` | `"text" | "textarea" | "number" | "boolean" | "select"` | Inferred when omitted. |
| `description` | `string` | Help text. |
| `placeholder` | `string` | Input placeholder. |
| `options` | `(primitive | { label, value })[]` | Select choices. |
| `defaultValue` | `string | number | boolean` | Display default. |
| `min` / `max` / `step` | `number` | Number input constraints. |
| `storage` | `"data.options" | "data" | "node"` | Write target. Defaults to `data.options`. |

## `WireNodeList`

`WireNodeList` renders a selectable node index and emits Wire events.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `includeGroups` | `boolean` | `false` | Includes group nodes. |
| `inspectOnClick` | `boolean` | `true` | Emits `node.inspect`. |
| `selectOnClick` | `boolean` | `true` | Updates provider selection. |
| `renderItem` | `(context) => ReactNode` | built-in row | Custom row renderer. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

## Events

Events are small and app-level. They decouple card/list clicks from sidebars.

```tsx
<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  onEvent={(event) => {
    if (event.type === "node.inspect") setInspectNodeId(event.nodeId);
  }}
/>;
```

| Event | Shape |
|---|---|
| `node.click` | `{ type, source, nodeId }` |
| `node.inspect` | `{ type, source, nodeId }` |
| `edge.click` | `{ type, source, edgeId }` |
| `pane.click` | `{ type, source }` |
| `selection.change` | `{ type, source, selection }` |

Sources are `"canvas"`, `"node-card"`, `"node-list"`, `"option-panel"`,
`"validation-panel"`, `"workspace"`, or `"api"`.

## Related Docs

- [`REACT_EXTENSIBILITY.md`](./REACT_EXTENSIBILITY.md) explains the extension
  pattern for LLM-ready apps.
- The playground `/components` route shows the component system and style guide.
- The playground `/samples/agent-chain` route shows a full app screen.
