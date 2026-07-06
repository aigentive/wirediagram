# React Component Props

This is the props reference for the reusable `@aigentive/wire-react` component
surface. These components are intended for product apps and LLM-authored React
screens. App code should pass Wire diagrams, option catalogs, render callbacks,
and event handlers. It should not use generic graph node/edge objects as the
application contract.

For design examples, run the playground and open `/docs` or
`/samples/agent-chain`.

## At a glance

| Component | Category | Role |
|---|---|---|
| [`WireWorkspace`](#wireworkspace) | Shell | Editor shell — provider, sidebar, canvas, inspector |
| [`WireCanvas`](#wirecanvas) | Canvas | Canvas primitive — used inside `WireWorkspace` or directly |
| [`WireInspector`](#wireinspector) | Panel | Tabbed node/edge inspector — configure, style, validation, JSON, edge |
| [`WireNodeCardView`](#cards-and-groups) | Renderer | Default node card — kind chip, title, options summary |
| [`WireGroupFrame`](#cards-and-groups) | Renderer | Default group frame — child count and selection ring |
| [`WireOptionPanel`](#wireoptionpanel) | Panel | Typed option form generated from `WireOptionCatalog` |
| [`WireNodeList`](#wirenodelist) | Panel | Selectable node index — emits clicks and selection changes |
| `WireValidationPanel` | Panel | Validation status — reads from provider context |

## Capabilities

| Capability | How |
|---|---|
| Package styling | Import `@aigentive/wire-react/styles.css`; no consumer utility-class scan is required |
| Light, dark, and system theme | Use `colorMode="light" | "dark" | "system"` or override package CSS variables |
| Custom node card | `renderNodeCard={fn}` — receives `WireNodeRenderContext` |
| Custom group frame | `renderGroup={fn}` |
| Structured card content | `node.data.card` — badges, meta, progress, footer |
| Custom list rows | `<WireNodeList renderItem={({ node, selected }) => …} />` |
| Read-only canvas | `<WireCanvas readOnly />` or `<WireCanvas mode="view" />` |
| Controlled runtime state | `selection`, `viewport`, `mode`, and `dirty` props on provider-backed surfaces |
| Controlled inspector | `inspectNodeId`, `inspectEdgeId`, `onInspectNodeChange`, `onInspectEdgeChange` |
| Click behavior | `inspectOnNodeClick`, `inspectOnEdgeClick`, `selectOnNodeClick`, `selectOnEdgeClick`, `clearSelectionOnPaneClick` |
| Validation observer | `<WireValidationPanel />` (or read `useWireValidation()`) |
| Decoupled events | `onEvent={fn}` — node, edge, pane, and selection events listed in [Events](#events) |

## Package CSS

Product apps should import the package stylesheet once near their app root:

```ts
import "@aigentive/wire-react/styles.css";
```

The stylesheet includes package-owned structure, visual styling, focus rings,
handles, controls, minimap styles, panel styles, and CSS variables. Consumers
can still add `className`, slot `classNames`, `unstyled`, and CSS variable
overrides. npm consumers do not need utility-class source scanning.

## `WireWorkspace`

`WireWorkspace` is the easiest reusable app shell. It composes a provider, node
list, canvas, and tabbed inspector.

```tsx
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

| Prop | Type | Default | Notes |
|---|---|---|---|
| `diagram` | `WireDiagram` | - | Controlled diagram. |
| `defaultDiagram` | `WireDiagram` | - | Uncontrolled initial diagram. |
| `onChange` | `(diagram, event) => void` | - | Receives reducer-backed updates. |
| `onAction` | `(action, result) => void` | - | Called after each dispatched action. |
| `onEvent` | `(event) => void` | - | Receives decoupled UI events. |
| `validateOnChange` | `boolean` | provider default | Revalidates after changes. |
| `history` | `boolean` | provider default | Enables undo/redo state. |
| `selection` / `defaultSelection` | `WireSelection` | provider state | Controlled or initial selected node/edge ids. |
| `onSelectionChange` | `(selection, event) => void` | - | Receives normalized selection plus `selection.change` metadata. |
| `viewport` / `defaultViewport` | `WireViewport` | provider state | Controlled or initial pan/zoom. |
| `onViewportChange` | `(viewport, event) => void` | - | Receives source, cause, previous viewport, and intent metadata. |
| `mode` / `defaultMode` | `WireMode` | `"edit"` | Controlled or initial runtime mode. |
| `onModeChange` | `(mode, event) => void` | - | Receives source and cause metadata. |
| `dirty` / `defaultDirty` | `boolean` | `false` | Controlled or initial dirty state. |
| `onDirtyChange` | `(dirty, event) => void` | - | Fires after durable edits or clean resets. |
| `optionCatalog` | `WireOptionCatalog` | - | Defines editable node options. |
| `readOnly` | `boolean` | `false` | Locks built-in inspector mutations. |
| `colorMode` | `"light" | "dark" | "system"` | - | Applies `data-wire-theme` and `wire-theme-*` classes to owned surfaces. |
| `unstyled` | `boolean` | `false` | Preserves structure, ARIA, and data attributes while omitting package visual classes on owned surfaces. |
| `classNames` | object | - | Slot classes for root, header, sidebar, canvas region, canvas, inspector, node list, option panel, and validation panel. |
| `inspectNodeId` | `string` | - | Controlled node shown in the inspector. |
| `defaultInspectNodeId` | `string` | - | Initial uncontrolled inspected node. |
| `onInspectNodeChange` | `(nodeId, event) => void` | - | Called on `node.inspect` and optional pane clear. |
| `inspectEdgeId` | `string` | - | Controlled edge shown in the inspector. |
| `defaultInspectEdgeId` | `string` | - | Initial uncontrolled inspected edge. |
| `onInspectEdgeChange` | `(edgeId, event) => void` | - | Called on edge inspection and optional pane clear. |
| `clearInspectOnPaneClick` | `boolean` | `false` | Clears inspected node when the canvas pane is clicked. |
| `title` | `ReactNode` | `"Wire"` | Sidebar title. |
| `subtitle` | `ReactNode` | - | Sidebar subtitle. |
| `sidebar` | `ReactNode` | - | Replaces the default node list area. |
| `inspector` | `ReactNode` | - | Replaces the default inspector. |
| `showNodeList` | `boolean` | `true` | Hides default node list when false. |
| `showOptions` | `boolean` | `true` | Hides default configure/style/edge/JSON inspector tabs when false. |
| `showValidation` | `boolean` | `true` | Hides default validation inspector tab when false. |
| `layout` | `"fixed" | "embedded"` | `"fixed"` | Use `embedded` inside docs/product pages. |
| `renderNodeCard` | `WireNodeRenderer` | `WireNodeCardView` | Custom non-group node renderer. |
| `renderGroup` | `WireNodeRenderer` | `WireGroupFrame` | Custom group renderer. |
| `canvasProps` | `WireCanvasProps` subset | - | Passed to `WireCanvas`. |
| `inspectorProps` | `WireInspectorProps` subset | - | Passed to the owned `WireInspector`. |
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
| `mode` | `"view" | "edit"` | provider mode | Controls edit gestures. View mode still emits click events. |
| `selectOnNodeClick` | `boolean` | `true` in edit, `false` in view | Selects clicked nodes. |
| `selectOnEdgeClick` | `boolean` | `true` in edit, `false` in view | Selects clicked edges. |
| `inspectOnNodeClick` | `boolean` | `true` | Emits `node.inspect` from node clicks. |
| `inspectOnEdgeClick` | `boolean` | `true` | Emits `edge.click` with `intent: "inspect"`. |
| `clearSelectionOnPaneClick` | `boolean` | `true` in edit, `false` in view | Clears canvas selection on pane click. |
| `fitView` | `boolean` | `true` | Fits diagram in viewport. |
| `fitViewPadding` | `number` | `0.2` | Shared Fit view and Fit selection padding. |
| `panOnDrag` | `boolean` | `true` | Enables canvas drag panning in view and edit mode. |
| `zoomOnScroll` | `boolean` | `true` | Enables wheel/trackpad zoom in view and edit mode. |
| `zoomStep` | `number` | `1.1` | Zoom multiplier used by wheel gestures and controls. |
| `minZoom` | `number` | `0.15` | Lower zoom bound. |
| `maxZoom` | `number` | `4` | Upper zoom bound. |
| `showBackground` | `boolean` | `true` | Shows the dotted background. |
| `showControls` | `boolean` | `true` | Shows zoom controls. |
| `showMiniMap` | `boolean` | `false` | Shows minimap. |
| `readOnly` | `boolean` | `false` | Disables canvas-originated durable mutations while preserving focus, selection, pan, and zoom. |
| `colorMode` | `"light" | "dark" | "system"` | - | Applies theme attributes/classes to the canvas root. |
| `unstyled` | `boolean` | `false` | Omits package visual classes while keeping geometry, ARIA, focus, and `data-wire-*` hooks. |
| `classNames` | object | - | Slot classes for root, viewport, background, node, group, edge, handle, controls, minimap, status, search, and connection picker. |
| `keyboardA11y` | `boolean` | `true` | Enables managed root-scoped keyboard behavior. |
| `nodesFocusable` | `boolean` | `true` | Includes node shells in roving focus. |
| `edgesFocusable` | `boolean` | `true` | Includes edge shells in roving focus. |
| `autoPanOnNodeFocus` | `boolean` | `true` | Pans focused nodes into view when measured canvas size is available. |
| `optionCatalog` | `WireOptionCatalog` | - | Passed into render context. |
| `renderNodeCard` | `WireNodeRenderer` | default card | Runtime card renderer. |
| `renderGroup` | `WireNodeRenderer` | default group | Runtime group renderer. |
| `renderEdge` | `WireEdgeRenderer` | default edge | Runtime edge renderer. |
| `edgeStyle` | `EdgeStyle` | default stroke | Diagram-level edge style override. |
| `edgeRouting` | `EdgeRouting` | `bezier` | Diagram-level edge routing override. |
| `ariaLabelConfig` | object | package defaults | Localizes canvas, node, edge, minimap, handle, status, and control labels. |
| `isValidConnection` | `(context) => boolean | string` | - | Rejects pointer connections before dispatch and announces the reason. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

When selection is non-empty, the built-in controls add `Fit selection`. It uses
the current `fitViewPadding`, emits viewport metadata with
`intent: "fit-selection"`, keeps focus on a selected item when possible, and
announces the fitted item count through the canvas status region.

Large-diagram mode activates when the rendered diagram exceeds 1,000 nodes or
1,200 edges. It keeps nodes, edges, selection, search, keyboard connection,
skip-to-inspector, and Fit selection available; it marks the root with
`data-wire-large-diagram="true"`, disables nonessential package motion, defers
nonessential measurement work, and simplifies the minimap to viewport and
selection bounds.

Keyboard behavior is scoped to the focused canvas root or managed node/edge
shells. `Enter`/`Space` select and inspect the focused item, `Escape` clears
selection, Delete/Backspace remove the selected item in edit mode, arrow keys
nudge selected/focused nodes in edit mode, and `n`/`p`/`e` traverse managed
node/edge focus. The first tab stop after the canvas root is a skip control with
the label `Skip to inspector and controls`.

## `WireInspector`

`WireInspector` is the built-in production inspector. It follows the current
single selection by default, or accepts explicit `nodeId` and `edgeId`.
Explicit `nodeId` wins when both ids are supplied.

```tsx
<WireInspector
  nodeId={activeNodeId}
  edgeId={activeEdgeId}
  optionCatalog={options}
  tabs={["configure", "style", "validation", "json", "edge"]}
  onOptionCommit={({ option, action }) => audit(option.key, action)}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `nodeId` | `string` | selected node | Explicit node to inspect. |
| `edgeId` | `string` | selected edge | Explicit edge to inspect when no node is active. |
| `optionCatalog` | `WireOptionCatalog` | - | Drives Configure tab fields. |
| `tabs` | array | applicable defaults | Any of `configure`, `style`, `validation`, `json`, `edge`. |
| `defaultTab` | tab name | first applicable | Initial tab when applicable. |
| `readOnly` | `boolean` | `false` | Prevents title, style, option, JSON, and edge mutations. |
| `renderField` | function | - | Custom option field inside the package field wrapper. |
| `renderSection` | function | - | Custom option section wrapper. |
| `onOptionCommit` | function | - | Called after option fields dispatch a `node.patch`. |
| `ariaLabelConfig` | object | defaults | Optional tab/field/section label overrides. |
| `colorMode` | `"light" | "dark" | "system"` | - | Applies theme attributes/classes to the inspector root. |
| `unstyled` | `boolean` | `false` | Keeps structure/ARIA while omitting package visual classes. |
| `classNames` | object | - | Slot classes for root, tabs, tab, panel, field, section, validation, JSON, and edge. |

Edge inspection edits only explicit persisted edges with ids. Derived edges from
node relationships are shown read-only. Phase 3A editable edge fields are
`label`, `tone`, and `routing`; style, label style, data, endpoint, branch, and
handle facts are read-only summaries.

## Cards And Groups

`WireNodeCardView` and `WireGroupFrame` are default renderers. The default card
can render serializable custom content from `node.data.card`:

```json
{
  "id": "review-mode",
  "kind": "human",
  "title": "Review default",
  "data": {
    "card": {
      "title": "Switch default to reviewed mode and make QA fail-closed",
      "description": "Change default reviewMode from fast to reviewed.",
      "badges": [{ "label": "Regular" }],
      "progress": { "value": 1, "max": 1, "steps": 8, "showPercent": true }
    }
  }
}
```

`node.data.card` is optional and intentionally small:

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | Overrides display title without changing `node.title`. |
| `description` | `string` | Body copy below the title. |
| `badges` | `(string | { label, tone })[]` | Inline chips. Tone is `default`, `info`, `success`, `warning`, or `error`. |
| `meta` | `(primitive | { label, value })[]` | Small facts rendered as text rows. |
| `progress` | `number | { value, max, label, steps, showPercent }` | Bar plus optional step dots and percent. |
| `footer` | `string` | Short text after card content. |

React-only composition can pass `content`, `children`, or `footer` to
`WireNodeCardView` from a custom `renderNodeCard` callback:

```tsx
function AgentCard(ctx: WireNodeRenderContext) {
  return (
    <WireNodeCardView {...ctx} content={<RuntimeStatus nodeId={ctx.node.id} />} />
  );
}
```

For fully custom surfaces, render callbacks receive `WireNodeRenderContext`.

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

`WireNodeCardView` accepts `unstyled` and `classNames` slots for `root`,
`content`, `badge`, `meta`, `progress`, and `footer`. `WireGroupFrame` accepts
`unstyled` and `classNames` slots for `root`, `header`, `title`, and `count`.

## `WireOptionPanel`

`WireOptionPanel` renders typed controls from a `WireOptionCatalog` and patches
nodes through `node.patch`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `catalog` | `WireOptionCatalog` | required | Option specs by node kind. |
| `nodeId` | `string` | selected node | Explicit node to edit. |
| `title` | `string` | `"Options"` | Panel heading. |
| `readOnly` | `boolean` | `false` | Prevents option mutations. |
| `renderField` | function | - | Custom option field inside the package field wrapper. |
| `renderSection` | function | - | Custom option section wrapper. |
| `onOptionCommit` | function | - | Called after an option field dispatches. |
| `unstyled` | `boolean` | `false` | Preserves structure/ARIA and omits package visual classes. |
| `classNames` | object | - | Slot classes for root, field, section, and validation. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

`WireOptionCatalog` keys are node kinds or `"*"`.

```tsx
const options: WireOptionCatalog = {
  "*": [{ key: "owner", storage: "data" }],
  ai: [
    { key: "model", storage: "node", type: "select", options: ["careful-model"] },
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
| `group`, `section`, `order`, `width` | metadata | Ordering and grouped layout hints. |
| `required`, `readOnly`, `disabled`, `hidden` | boolean or predicate | Runtime field state. |
| `validate`, `parse`, `format` | functions | Runtime-only validation and value conversion. |
| `commitMode` | `"change" | "blur" | "submit"` | Controls when `node.patch` dispatches. |
| `debounceMs` | `number` | Debounces change-mode commits. |

## `WireNodeList`

`WireNodeList` renders a selectable node index and emits Wire events.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `includeGroups` | `boolean` | `false` | Includes group nodes. |
| `inspectOnClick` | `boolean` | `true` | Emits `node.inspect`. |
| `selectOnClick` | `boolean` | `true` | Updates provider selection. |
| `renderItem` | `(context) => ReactNode` | built-in row | Custom row renderer. |
| `unstyled` | `boolean` | `false` | Preserves structure and omits package visual classes. |
| `classNames` | object | - | Slot classes for root, item, and empty state. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

## `WireValidationPanel`

`WireValidationPanel` renders the provider validation result.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `unstyled` | `boolean` | `false` | Preserves structure and omits package visual classes. |
| `classNames` | object | - | Slot classes for root, header, list, issue, and empty state. |
| `className` | `string` | - | Root classes. |
| `style` | `CSSProperties` | - | Root inline styles. |

## `WireToolbar` And `WirePalette`

Standalone tools can be mounted inside any `WireProvider`.

| Component | Styling props |
|---|---|
| `WireToolbar` | `unstyled`, `classNames.root`, `classNames.group`, `classNames.button`, `className`, `style` |
| `WirePalette` | `unstyled`, `classNames.root`, `classNames.item`, `className`, `style` |

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
| `node.click` | `{ type, source, nodeId, input? }` |
| `node.inspect` | `{ type, source, nodeId, input? }` |
| `edge.click` | `{ type, source, edgeId, input?, intent? }` |
| `pane.click` | `{ type, source }` |
| `selection.change` | `{ type, source, selection, previousSelection?, cause? }` |

Source labels are `"canvas"`, `"node-card"`, `"node-list"`, `"option-panel"`,
`"validation-panel"`, `"workspace"`, or `"api"`. Built-in components currently
emit from `canvas` (`WireCanvas`) and `node-list` (`WireNodeList`). The other
labels are reserved for app-owned wrappers, custom panels, workspace-level
handlers, or programmatic integrations.

## Related Docs

- The playground `/docs` route is the canonical component guide.
- The playground `/docs/customize/cards` route shows custom renderer variants.
- The playground `/docs/listen` route shows event recipes and source labels.
- The playground `/samples/agent-chain` route shows a full app screen.
- The package README (`packages/wire-react/README.md`) covers the JSX facade
  (`<Flow>`, node components) and package CSS import.
