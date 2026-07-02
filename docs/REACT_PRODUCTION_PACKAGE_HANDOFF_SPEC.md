# React Production Package Handoff Spec

## Objective

Make `@aigentive/wire-react` reusable as a production diagram editor package for
product teams that need workflow, agent, automation, or systems diagrams without
forking the canvas or importing a separate graph editor directly.

The target package should preserve Wire's core contract:

- durable state is canonical `WireDiagram` JSON plus reducer actions;
- React owns composition, editor chrome, runtime controls, and view state;
- consumers can start with a batteries-included editor shell and peel down to
  primitives when building a custom product experience.

This handoff is informed by mature production diagram editor patterns. The
useful lessons are not to copy another implementation, but to match the maturity
pattern: a compact canvas component, controlled-state helpers, provider-scoped
hooks, typed registries, built-in add-ons, documented styling imports,
accessibility contracts, and many runnable examples.

## Patterns Applied

- A compact canvas component with optional mini-map, controls, and background
  add-ons.
- Controlled-state helpers for examples and app-owned editor state.
- Provider-scoped hooks for custom panels and toolbars.
- Typed registries for nodes, edges, handles, and option fields.
- A stable CSS import and theme variable contract for package consumers.
- Accessibility and keyboard behavior as documented public API.

## Current Local Surface

The package already has a useful base.

| Area | Current files | Current capability |
|---|---|---|
| Shell | `packages/wire-react/src/components/WireWorkspace.tsx` | Composes provider, sidebar, canvas, option panel, validation panel. |
| Canvas | `packages/wire-react/src/canvas/WireCanvas.tsx` | Renders diagrams, pan/zoom, fit view, drag, connect, selection, minimap, controls, custom card/group/edge render callbacks. |
| State | `packages/wire-react/src/provider/WireProvider.tsx` | Controlled or uncontrolled diagram, validation, selection, viewport, mode, dirty, undo/redo. |
| Hooks | `packages/wire-react/src/hooks.ts` | Context hooks for diagram, validation, selection, viewport, actions, history, mode, events. |
| Options | `packages/wire-react/src/options.ts` and `components/WireOptionPanel.tsx` | Per-kind option catalogs with text, textarea, number, boolean, select inputs. |
| Docs | `docs/REACT_COMPONENTS.md`, `docs/REACT_EDITOR_ARCHITECTURE.md`, `docs/WIRE_OPTIONS_CATALOG_SPEC.md` | Component reference, editor architecture, initial option catalog spec. |

The main production gap is not the canvas baseline. The gap is the lack of a
stable product integration layer around options, controlled editor state,
registries, theme/styling, accessibility, examples, and package exports.

## Design Direction

### 1. Keep Wire Domain First

Wire should not become a generic graph runtime. Generic graph editors often
center `nodes` and `edges`; Wire should center `WireDiagram`, `WireAction`,
validation, and serializable diagram semantics.

Good API shape:

```tsx
<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  optionCatalog={catalog}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  fitView
/>
```

Avoid exposing graph-canvas internals as the primary contract. Consumers should
only need lower-level canvas details when writing custom renderers or advanced
plugins.

### 2. Offer Progressive Entry Points

Mirror mature diagram-editor package patterns with Wire-native naming:

| Level | Proposed entry point | Purpose |
|---|---|---|
| Full shell | `WireWorkspace` | Product-ready editor with panels, canvas, validation, options, style controls. |
| Canvas primitive | `WireCanvas` | Custom product shells using provider hooks. |
| Provider | `WireProvider` | Shared editor state and action/event dispatch. |
| Hooks | `useWireDiagramState`, `useWireInstance`, `useWireViewport`, `useWireSelection` | Controlled-state helpers and scoped state access. |
| Registries | `nodeTypes`, `edgeTypes`, `handleTypes`, `fieldTypes` | Typed replacement points for product-specific nodes, edges, handles, and option fields. |
| Add-ons | `WireMiniMap`, `WireControls`, `WireBackground`, `WirePanel` | Reusable canvas children with explicit placement and ARIA labels. |

### 3. Make Options A Real Form Schema

The current option spec is good for demos, but production editors need the same
`WireOptionSpec` and `WireOptionCatalog` names to grow into a form schema with
grouping, visibility, validation, permissions, commit behavior, and custom field
rendering.

This must be an in-place package update. Do not introduce versioned option
types, parallel catalog names, or a second React package surface for the same
features.

Recommended in-place additions:

```ts
export type WireOptionInputType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multiSelect"
  | "json"
  | "code"
  | "color"
  | "date"
  | "url"
  | "secret"
  | "array"
  | "object"
  | "custom";

export interface WireOptionSpec {
  key: string;
  label?: string;
  type?: WireOptionInputType;
  storage?: WireOptionStorage;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  group?: string;
  section?: string;
  order?: number;
  width?: "full" | "half" | "third";
  required?: boolean;
  readOnly?: boolean | WireOptionPredicate;
  disabled?: boolean | WireOptionPredicate;
  hidden?: boolean | WireOptionPredicate;
  visibleWhen?: WireOptionCondition;
  options?: WireOptionChoice[] | WireOptionChoiceLoader;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  validate?: WireOptionValidator;
  parse?: (input: unknown, context: WireOptionContext) => unknown;
  format?: (value: unknown, context: WireOptionContext) => unknown;
  commitMode?: "change" | "blur" | "submit";
  debounceMs?: number;
  undoGroup?: string;
  fieldType?: string;
  fields?: WireOptionSpec[];
}
```

Catalog shape stays on the current export name:

```ts
export type WireOptionCatalog = Partial<Record<WireNode["kind"] | "*", WireOptionSpec[]>>;
```

Any helper needed to resolve groups, predicates, validators, or field renderers
should be internal to `@aigentive/wire-react` or passed as additive props on the
current components. Do not create a versioned catalog discriminator.

### 4. Merge Options Into A Production Inspector

`WireInspector` and `WireOptionPanel` should become part of one cohesive
inspector system. Product users expect tabs/sections such as Configure, Style,
Validation, Data, and Events, not a separate one-off panel.

Proposed inspector API:

```tsx
<WireInspector
  nodeId={activeNodeId}
  optionCatalog={catalog}
  tabs={["configure", "style", "validation", "json"]}
  permissions={permissions}
  renderField={renderField}
  renderSection={renderSection}
  onOptionCommit={handleOptionCommit}
/>
```

Required behavior:

- follows current single-node selection by default;
- supports explicit `nodeId`;
- shows grouped option fields with stable order;
- displays field-level validation errors;
- supports read-only and disabled states;
- batches text typing into sensible undo entries;
- supports custom fields without consumers replacing the full inspector;
- emits option-specific events for analytics and autosave.

### 5. Add Controlled State Helpers

Controlled-state helper patterns are valuable because they make examples and
controlled usage obvious. Wire should provide helpers around canonical diagrams,
not graph nodes.

Proposed helpers:

```ts
const [diagram, setDiagram, onWireChange] = useWireDiagramState(initialDiagram);
const [selection, setSelection, onSelectionChange] = useWireSelectionState();
const [viewport, setViewport, onViewportChange] = useWireViewportState();
```

Provider props should support fully controlled editor state:

```ts
export interface WireProviderProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;

  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: WireEvent) => void;

  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: WireEvent) => void;

  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: WireEvent) => void;

  dirty?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}
```

The provider can stay internally managed by default. Production hosts need the
option to wire selection, viewport, mode, dirty state, autosave, and URL state
into their own app shell.

### 6. Add An Instance Hook

Instance hooks are useful for imperative operations that should not re-render
subscribers. Wire needs the same idea with Wire semantics.

```ts
export interface WireInstance {
  getDiagram(): WireDiagram;
  setDiagram(diagram: WireDiagram): void;
  dispatch(action: WireAction): ApplyWireActionResult;
  dispatchMany(actions: WireAction[]): ApplyWireActionResult;
  validate(): WireValidationResult;
  getNode(id: string): WireNode | undefined;
  updateNode(id: string, patch: Partial<WireNode>): ApplyWireActionResult;
  getSelection(): WireSelection;
  setSelection(selection: WireSelection): void;
  getViewport(): WireViewport;
  setViewport(viewport: WireViewport): void;
  fitView(options?: WireFitViewOptions): void;
  zoomIn(options?: WireViewportCommandOptions): void;
  zoomOut(options?: WireViewportCommandOptions): void;
  screenToWorld(point: WirePoint): WirePoint;
  worldToScreen(point: WirePoint): WirePoint;
  serialize(): WireDiagram;
}

export function useWireInstance(): WireInstance;
```

Also add `onInit?: (instance: WireInstance) => void` to `WireCanvas` and
`WireWorkspace` for integrations that want a stable handle.

### 7. Expose A Selector Hook Carefully

Some mature diagram editors expose store hooks while recommending dedicated
hooks for common use cases. Wire should follow that stance.

Proposed API:

```ts
export function useWireStore<T>(
  selector: (state: WireStoreState) => T,
  equalityFn?: (a: T, b: T) => boolean
): T;
```

Guidelines:

- prefer `useWireDiagram`, `useWireSelection`, `useWireViewport`, and
  `useWireInstance`;
- use selector hooks for custom panels, performance-sensitive summaries, and
  large-editor integrations;
- document selector stability and equality functions.

### 8. Add Typed Registries

Current render callbacks work, but production teams need named registries with
consistent typing, stable memoization, and fallback behavior.

Proposed API:

```ts
export type WireNodeTypes = Record<string, WireNodeRenderer>;
export type WireEdgeTypes = Record<string, WireEdgeRenderer>;
export type WireHandleTypes = Record<string, WireHandleRenderer>;
export type WireFieldTypes = Record<string, WireOptionFieldRenderer>;

<WireCanvas
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  handleTypes={handleTypes}
  defaultNodeType="default"
  defaultEdgeType="bezier"
/>
```

Rules:

- encourage defining registry objects outside React render functions;
- warn when a node/edge/field references an unknown type and fall back safely;
- make custom node render context include handles, option specs, validation
  issues, selected/hover/focus state, and connection state.

### 9. First-Class Handles And Ports

Handle-based connection APIs are a key production feature. Wire already routes
edges, but it does not expose a component-level handle/port contract.

Recommended Wire model:

```ts
export interface WirePortSpec {
  id: string;
  type: "source" | "target" | "both";
  side?: Side;
  label?: string;
  accepts?: string[];
  maxConnections?: number;
}
```

Recommended canvas components:

```tsx
<WireHandle id="success" type="source" side="right" label="Success" />
<WireHandle id="error" type="source" side="bottom" label="Error" />
```

Edge data should support `sourcePortId` and `targetPortId`. Connection
validation should be configurable through `isValidConnection`.

### 10. Styling And Theme Contract

The current package depends heavily on Tailwind-generated classes and docs tell
consumers to add `@source`. That is fragile for a reusable npm package.

Ship an explicit CSS export:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  }
}
```

Consumer usage:

```ts
import "@aigentive/wire-react/styles.css";
```

CSS contract:

- `data-wire-theme="light|dark|system"` or a `colorMode` prop;
- CSS variables for surface, text, border, focus, selection, grid, edge,
  minimap, controls, node tones;
- an `unstyled` mode for design-system ownership;
- `classNames` slot map for product teams that need class-level control;
- no required Tailwind scan for npm consumers.

### 11. Accessibility Contract

Production diagrams need keyboard and screen-reader support as a documented
feature, not incidental DOM behavior.

Minimum requirements:

- nodes and edges are focusable when enabled;
- `Enter` or `Space` selects focused node or edge;
- `Escape` clears selection or exits connection mode;
- arrow keys move selected nodes in edit mode;
- delete/backspace removes selected elements when editable;
- focus panning keeps focused nodes visible;
- ARIA labels are configurable and localizable;
- handles expose labels and connection state;
- controls and minimap have explicit ARIA labels;
- reduced-motion mode avoids animated transitions;
- tests cover keyboard movement, selection, deletion, and ARIA attributes.

Proposed props:

```ts
nodesFocusable?: boolean;
edgesFocusable?: boolean;
keyboardA11y?: boolean;
autoPanOnNodeFocus?: boolean;
ariaLabelConfig?: WireAriaLabelConfig;
```

### 12. Package Add-Ons And Examples

Mature diagram packages succeed partly because the docs and examples show every
common workflow. Wire should add examples before adding too many low-level
features.

Needed examples:

- controlled diagram editor;
- custom product shell with `WireProvider` and `WireCanvas`;
- production inspector with grouped options;
- custom node types and custom field types;
- port-based branching node;
- edge labels and edge toolbar;
- save/restore with autosave and dirty state;
- read-only viewer;
- keyboard accessibility;
- theme override and unstyled mode;
- large diagram performance baseline.

## Phased Implementation Plan

### Phase A - Package Styling And Export Foundation

Work:

- build `packages/wire-react/src/styles.css`;
- emit `dist/styles.css` during package build;
- add `./styles.css` export and include CSS in package files;
- convert current Tailwind-dependent component classes into package-owned CSS
  classes or keep Tailwind only inside demos;
- add `unstyled`, `classNames`, and `colorMode` design notes in docs.

Acceptance:

- a new Vite app can import `@aigentive/wire-react` and
  `@aigentive/wire-react/styles.css` with no Tailwind config;
- dark/light mode works through documented variables;
- existing playground still renders correctly;
- package build and React tests pass.

### Phase B - Controlled State And Instance API

Work:

- add controlled provider props for selection, viewport, mode, and dirty;
- add `useWireDiagramState`, `useWireSelectionState`, `useWireViewportState`;
- add `useWireInstance` and `onInit`;
- document controlled and uncontrolled patterns.

Acceptance:

- host apps can persist diagram, selection, viewport, and mode externally;
- `useWireInstance().fitView()` and viewport commands work from custom panels;
- tests cover controlled/uncontrolled transitions and callbacks.

### Phase C - Options And Production Inspector

Work:

- extend the current `WireOptionSpec` and `WireOptionCatalog` exports in place;
- add grouped/ordered sections, field-level validation, hidden/disabled/read-only
  predicates, commit modes, and undo grouping;
- merge `WireOptionPanel` behavior into a richer `WireInspector`;
- keep `WireOptionPanel` as a smaller primitive or compatibility wrapper;
- add custom field renderer registry.

Acceptance:

- current `WireOptionCatalog` continues to work;
- current catalogs can show groups, sections, errors, hidden fields, and custom
  fields;
- typing text does not create one undo entry per keystroke unless requested;
- inspector can be reused in a custom shell without `WireWorkspace`.

### Phase D - Registries, Handles, And Edge Extensions

Work:

- add `nodeTypes`, `edgeTypes`, `handleTypes`, and fallback warnings;
- add `WireHandle` and `WirePortSpec`;
- add `sourcePortId` and `targetPortId` support where the core schema allows it,
  or define the required core schema change first;
- add edge labels, edge toolbar slots, and connection validation callbacks.

Acceptance:

- consumers can build branch nodes with multiple named outputs;
- edge connection can be validated before reducer dispatch;
- unknown custom types fail soft with useful warnings;
- tests cover multiple handles and port-specific edges.

### Phase E - Accessibility And Large Diagram Readiness

Work:

- implement keyboard focus, selection, movement, deletion, and focus panning;
- add configurable ARIA labels;
- add roving-focus or stable tab-order strategy;
- profile rerenders and add selector hook where needed;
- add optional viewport culling or memoization strategy for large diagrams.

Acceptance:

- keyboard-only node selection, movement, deletion, and viewport focus are tested;
- ARIA labels can be localized by host apps;
- a large fixture has a documented render/update budget;
- no common panel re-renders on every pointer move unless it subscribes to that
  state.

### Phase F - Production Docs, Examples, And Release Discipline

Work:

- add examples listed above to the playground or docs app;
- add API reference tables for provider, canvas, inspector, option specs, and
  hooks;
- add visual or browser smoke tests for the main examples;
- consider changesets for package releases and changelog generation;
- document the additive option-field changes on the existing React package API.

Acceptance:

- each public API has at least one runnable example;
- package consumers can follow a docs path from read-only viewer to custom
  production editor;
- changelog entries explain breaking and additive changes per package;
- CI covers build, typecheck, unit tests, and browser smoke tests for the React
  package.

## Proposed Priority Order

1. **CSS export and theme contract**: this removes the biggest npm reuse
   friction.
2. **Controlled state and instance hook**: this lets product shells integrate
   autosave, URL state, and custom toolbars.
3. **Options and inspector**: this turns the current demo-level option panel
   into a real production form system.
4. **Handles/ports and registries**: this unlocks advanced workflow diagrams.
5. **Accessibility and performance**: this hardens the editor for enterprise
   usage.
6. **Examples and release docs**: this makes the package adoptable without
   internal support.

## Non-Goals

- Do not replace the Wire schema with generic graph-editor-style node/edge
  objects.
- Do not make consumer option keys canonical Wire schema fields.
- Do not require Tailwind from npm consumers.
- Do not expose internal canvas geometry as the main public API.
- Do not make custom React component instances serializable or persistent.

## Handoff Tasks

| Task | Owner | Notes |
|---|---|---|
| Decide if CSS output should be handcrafted CSS or compiled from Tailwind | React package owner | Handcrafted CSS gives the cleanest package contract. |
| Define exact `WireOptionSpec` predicate/validator signatures | React package owner + product integrator | Keep predicates serializable only if catalogs will cross network boundaries. |
| Confirm whether core schema needs port fields | Core + React package owners | Avoid adding React-only port metadata if edges must persist it. |
| Choose example app structure | Docs owner | Playground routes are already established and can host examples. |
| Decide release workflow for React package | Maintainer | Changesets are worth considering once packages diverge in maturity. |

## Review Alignment Checklist

- The spec keeps Wire's canonical diagram contract intact.
- The spec treats external diagram-editor packages as product-surface
  inspiration, not runtime dependency requirements.
- The implementation plan is phased and testable.
- The highest-risk user-facing gaps are covered: options, inspector, controlled
  state, styling, handles, accessibility, and examples.
- The package can become production reusable without forcing consumers to adopt
  the playground's app shell.
