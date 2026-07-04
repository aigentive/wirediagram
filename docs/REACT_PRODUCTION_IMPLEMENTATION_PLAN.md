# React Production Implementation Plan

> Status: archived implementation planning. Do not use this file as the
> current public API reference. Current implemented behavior lives in
> [REACT_COMPONENTS.md](REACT_COMPONENTS.md),
> [REACT_EDITOR_ARCHITECTURE.md](REACT_EDITOR_ARCHITECTURE.md), and
> [WIRE_OPTIONS_CATALOG_SPEC.md](WIRE_OPTIONS_CATALOG_SPEC.md).

## Executive Summary

This plan hardens the existing `@aigentive/wire-react` package in place. The
winning path is the lowest-risk incremental plan, grafted with the strongest
adoption, styling, accessibility, edge-inspector, and documentation requirements
from the other candidate plans.

The core rule is unchanged: durable state is `WireDiagram`, and durable edits
flow through `WireAction` reducers. React state, viewport state, focused item
state, render callbacks, and form widgets remain runtime concerns.

The implementation order is:

1. Lock the public contract and remove docs drift.
2. Ship package-owned CSS and a `styles.css` export.
3. Add controlled provider state for selection, viewport, mode, and dirty state.
4. Establish the performance harness before inspector and canvas expansion.
5. Merge catalog-driven options into `WireInspector` using current option names.
6. Harden `WireCanvas` accessibility, keyboard behavior, edge editing, and
   current render callbacks.
7. Add docs, examples, package smoke tests, and release gates.

The plan deliberately avoids a second React package, alternate option catalog,
provider-level catalog fallback, versioned option names, generic graph state as
the app contract, and npm consumer dependence on utility-class source scanning.

## Convergence Summary

### Research

Seven analyst passes inspected the handoff spec, current React docs, option
catalog docs, package source, provider, hooks, canvas, inspector, package
metadata, and tests.

Key findings:

- `WireOptionSpec` and `WireOptionCatalog` are already the public option names in
  `packages/wire-react/src/options.ts` and are exported from
  `packages/wire-react/src/index.ts`.
- `optionCatalog` is currently a view-layer prop on `WireWorkspace` and
  `WireCanvas`; `WireOptionPanel` uses `catalog`. `WireProvider` does not accept
  a catalog.
- `WireInspector` currently edits title, description, and appearance only. It
  does not accept `nodeId` or `optionCatalog`.
- `WireOptionPanel` dispatches `node.patch` on every input change, which is
  compatible but noisy for undo history.
- `WireProvider` controls only `diagram`; selection, viewport, mode, dirty,
  undo, and redo are internal.
- `WireCanvas` has useful internal handles, controls, minimap, drag, pan, zoom,
  and connection behavior, but no public add-on or registry contract.
- Current keyboard behavior is incomplete and delete handling is window-scoped.
- Package metadata exposes only `.` and `./compile`; there is no package CSS
  export, while docs still describe utility-class source scanning for consumers.
- Current tests cover core React behavior, but release gates need package CSS
  smoke, controlled-state tests, keyboard tests, and browser examples.

### Design

Three candidate plans were produced:

- Plan A: lowest-risk incremental plan with contract lock, package CSS,
  controlled state, options/inspector convergence, canvas hardening, docs, and
  release gates.
- Plan B: most complete plan with broader schema and provider changes.
- Plan C: fastest useful adoption plan with strong CSS and keyboard focus but
  lighter contract and documentation coverage.

### Judge Outcome

All three judges selected Plan A as the winner.

Required grafts:

- From Plan C: keep adoption scope tight, include keyboard hardening, and defer
  new store, instance, add-on, port, and culling APIs.
- From Plan B: include comprehensive CSS coverage, accessibility acceptance
  criteria, edge inspector support through current actions, and complete docs.

Rejected from Plan B:

- A provider-level catalog fallback.
- Named port/schema work in the first implementation.
- Broad action/schema expansion bundled with React package adoption work.

## Strict Non-Goals

- Do not create a second React package.
- Do not create alternate option catalog names or versioned option names.
- Do not add a catalog prop to the provider.
- Do not make generic graph node/edge objects the app contract.
- Do not persist React components, render callbacks, viewport state, focus state,
  drag state, or catalog functions.
- Do not require utility-class source scanning from npm consumers.
- Do not add named port schema or new canonical edge endpoint fields in this
  plan.
- Do not add public store, instance, or add-on component APIs in this plan.
- Do not remove existing exports, hooks, props, or render callbacks.

## Exact Current API Names To Extend

Extend only these current names:

- `@aigentive/wire-react`
- `Flow`
- `FlowComponentProps`
- `LayoutDirection`
- `ReactNode`
- `useCompiledWireDiagram`
- `compile`
- `FlowProps`
- `flattenChildren`
- JSX marker exports: `TriggerNode`, `ActionNode`, `AINode`, `ToolNode`,
  `ConditionNode`, `HumanNode`, `MemoryNode`, `RetrievalNode`,
  `GuardrailNode`, `EndNode`, `Note`, `Group`, `TriggerProps`,
  `ActionProps`, `AIProps`, `ToolProps`, `ConditionProps`, `HumanProps`,
  `MemoryProps`, `RetrievalProps`, `GuardrailProps`, `EndProps`, `NoteProps`,
  and `GroupProps`
- `WireWorkspace`
- `WireWorkspaceProps`
- `WireEditor`
- `WireEditorProps`
- `WireViewer`
- `WireViewerProps`
- `WireToolbar`
- `WireToolbarProps`
- `WirePalette`
- `WirePaletteProps`
- `WireNodeList`
- `WireNodeListProps`
- `WireNodeListRenderContext`
- `WireValidationPanel`
- `WireValidationPanelProps`
- `WireCanvas`
- `WireCanvasProps`
- `WireProvider`
- `WireProviderProps`
- `WireContext`
- `EMPTY_SELECTION`
- `DEFAULT_VIEWPORT`
- `assertWireContext`
- `WireDiagram`
- `WireAction`
- `WireContextValue`
- `WireActions`
- `WireSelection`
- `WireViewport`
- `WireMode`
- `WireEventSource`
- `WireEvent`
- `WireChangeEvent`
- `WireHistoryState`
- `WireHistoryActions`
- `WireSelectionActions`
- `WireViewportActions`
- `WireEventActions`
- `WireReactState`
- `WireInspector`
- `WireInspectorProps`
- `WireOptionPanel`
- `WireOptionPanelProps`
- `WireOptionSpec`
- `WireOptionCatalog`
- `WireOptionInputType`
- `WireOptionStorage`
- `WireOptionPrimitive`
- `WireOptionChoice`
- option helpers: `wireOptionSpecsForNode`, `wireNodeOptions`,
  `readWireOption`, `patchWireOption`, `optionChoiceLabel`,
  `optionChoiceValue`, `optionChoiceKey`, `inferOptionType`
- `WirePosition`
- `WireCanvasPosition`
- `SIDE_TO_POSITION`
- `POSITION_TO_SIDE`
- `asSide`
- `WireNodeTheme`
- `WireNodeRenderContext`
- `WireNodeRenderer`
- `WireNodeData`
- `WireNodeCardProps`
- `createWireNodeRenderContext`
- `WireNodeCard`
- `DEFAULT_NODE_RENDERERS`
- `WireEdgeRenderContext`
- `WireEdgeRenderer`
- `WireCanvasInteractionOptions`
- `WireCanvasInteraction`
- `miniMapViewportRect`
- `resolveWireCanvasInteraction`
- `wireActionsFromCanvasDragCommit`
- `WireNodeCardView`
- `WireNodeCardViewProps`
- `WireGroupFrame`
- `WireGroupFrameProps`
- `WireCardBadgeTone`
- `WireCardBadge`
- `WireCardMetaItem`
- `WireCardProgress`
- `WireCardContent`
- `cardStyleForNode`
- `wireCardContentForNode`
- current primitives exported from `packages/wire-react/src/primitives/index.ts`:
  `KindChip`, `Eyebrow`, `Ref`, `InlineCode`, `CodeBlock`, `StatusPill`,
  `Edge`, `DotGrid`, `GroupFrame`, `NodeCard`, `kindChipKey`,
  `kindChipLabel`, `KindChipProps`, `EyebrowProps`, `RefProps`,
  `InlineCodeProps`, `CodeBlockProps`, `StatusPillProps`, `StatusPillKind`,
  `EdgeProps`, `DotGridProps`, `GroupFrameProps`, `NodeCardProps`,
  `WireKindChipKey`, and `WireNodeKind`
- existing hooks: `useWireContext`, `useWireDiagram`, `useWireValidation`,
  `useWireSelection`, `useWireViewport`, `useWireActions`, `useWireHistory`,
  `useWireMode`, `useWireDispatch`, `useWireEvents`

Do not add provider catalog state. After implementation, catalog entry points
are:

- `WireWorkspace optionCatalog`
- `WireCanvas optionCatalog`
- `WireInspector optionCatalog`
- `WireOptionPanel catalog`

`WireEditor` and `WireViewer` continue their current `WireCanvasProps`
pass-through behavior. If their current inherited props include
`WireCanvas optionCatalog`, that remains a canvas-level pass-through rather than
a new catalog owner. Do not add catalog storage, lookup, or fallback behavior to
the wrappers.

The proposed TypeScript snippets may reference these current core type names
already exposed through existing React package declaration signatures:
`WireNode`, `ApplyWireActionResult`, `EdgeStyle`, `EdgeRouting`, and `Side`.
They are not new `@aigentive/wire-react` root exports, and this plan must not
add root re-exports for them.

The snippets may also reference React's ambient declaration types such as
`React.ReactNode` and `React.CSSProperties`. These are external React type
references, not new `@aigentive/wire-react` public names.

## Proposed TypeScript Shapes

These are additive shapes on current public names. Do not export helper type
names for predicates, validators, ARIA labels, class slots, connection
validation, or field renderers in this implementation. If implementation helper
types are useful internally, keep them module-private or inline them into the
current public interfaces shown below. `WireSelectionActions`,
`WireViewportActions`, `WireContextValue`, and related provider/context names
shown below are existing root exports from the current package; the plan extends
their current method signatures in place and does not introduce replacement
action containers.

### Options

```ts
export type WireOptionInputType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select";

export interface WireOptionSpec {
  key: string;
  label?: string;
  type?: WireOptionInputType;
  description?: string;
  placeholder?: string;
  options?: WireOptionChoice[];
  defaultValue?: WireOptionPrimitive;
  min?: number;
  max?: number;
  step?: number;
  storage?: WireOptionStorage;
  group?: string;
  section?: string;
  order?: number;
  width?: "full" | "half" | "third";
  required?: boolean;
  readOnly?: boolean | ((context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) => boolean);
  disabled?: boolean | ((context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) => boolean);
  hidden?: boolean | ((context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) => boolean);
  validate?: (context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) =>
    | { message: string; severity?: "error" | "warning" | "info" }
    | Array<{ message: string; severity?: "error" | "warning" | "info" }>
    | null
    | undefined;
  parse?: (input: unknown, context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) => unknown;
  format?: (value: unknown, context: {
    node: WireNode;
    diagram: WireDiagram;
    value: unknown;
    option: WireOptionSpec;
  }) => unknown;
  commitMode?: "change" | "blur" | "submit";
  debounceMs?: number;
}

export type WireOptionCatalog =
  Partial<Record<WireNode["kind"] | "*", WireOptionSpec[]>>;
```

Rules:

- Existing catalogs remain valid.
- Default `commitMode` remains `"change"` for compatibility.
- Phase 3A keeps the published `WireOptionInputType` union to the current five
  input types plus grouping, ordering, visibility, validation, and commit
  behavior.
- Deferred post-release field-type expansion extends the same
  `WireOptionInputType` name one literal at a time only when that field type
  ships with UX, keyboard, ARIA, parsing, formatting, serialization,
  persistence-safety, and tests. Deferred literals must not appear in emitted
  declarations before their implementation ships.
- The planned in-place field-type queue is `multiSelect`, `json`, `code`,
  `color`, `date`, `url`, `secret`, `array`, `object`, and `custom`; this queue
  is not a public contract until each literal is implemented.
- `defaultValue` stays `WireOptionPrimitive` in Phase 3A. Any later support for
  non-primitive defaults must be introduced only with compatibility fixtures that
  prove existing consumers reading primitive defaults still typecheck.
- `commitMode: "submit"` renders explicit Apply and Revert controls. Enter
  commits single-line fields, Ctrl+Enter or Cmd+Enter commits multiline fields,
  Escape reverts the pending value, and selection change or unmount discards
  uncommitted pending values with a polite status announcement. `onOptionCommit`
  fires only after Apply or the defined keyboard commit path.
- For debounced fields, `debounceMs` schedules a pending commit for the current
  inspected node only. Blur flushes a valid pending value. Selection change,
  inspected item change, unmount, read-only toggle, disabled toggle, or parse
  invalid state cancels the pending timer and discards the uncommitted value
  with a polite status announcement. No stale debounced commit may dispatch
  after the inspected item changes.
- Parse exceptions, invalid numbers, empty required values, and parse-invalid
  pending values are local non-mutating field errors. They set `aria-invalid`,
  attach the error text with `aria-describedby`, keep Apply disabled for submit
  mode, do not call `onOptionCommit`, and do not dispatch `node.patch` or
  `edge.patch`. Blur/change commit modes keep the last committed value until the
  field parses successfully.
- `parse` output must be JSON-serializable and valid for the target storage
  before dispatch. Non-serializable values, functions, React nodes, symbols, and
  invalid canonical node patches are treated as local non-mutating field errors.
- `hidden`, `disabled`, `readOnly`, and `validate` can be functions only in
  runtime React catalogs. Persisted diagrams must not serialize these functions.
- `storage: "node"` must continue to patch top-level node fields through
  `node.patch`; invalid canonical patches must surface validation errors.

### Inspector

```ts
export interface WireInspectorProps {
  nodeId?: string;
  edgeId?: string;
  optionCatalog?: WireOptionCatalog;
  tabs?: Array<"configure" | "style" | "validation" | "json" | "edge">;
  defaultTab?: "configure" | "style" | "validation" | "json" | "edge";
  readOnly?: boolean;
  renderField?: (context: {
    fieldId: string;
    labelId: string;
    descriptionId?: string;
    errorId?: string;
    describedBy?: string;
    node: WireNode;
    diagram: WireDiagram;
    option: WireOptionSpec;
    value: unknown;
    disabled: boolean;
    readOnly: boolean;
    required: boolean;
    issues: Array<{ message: string; severity?: "error" | "warning" | "info" }>;
    onChange(value: unknown): void;
    onCommit?(value: unknown): void;
  }) => React.ReactNode;
  renderSection?: (context: {
    section: string;
    options: WireOptionSpec[];
    children: React.ReactNode;
  }) => React.ReactNode;
  onOptionCommit?: (context: {
    node: WireNode;
    option: WireOptionSpec;
    value: unknown;
    action: WireAction;
  }) => void;
  ariaLabelConfig?: {
    tab?: (tab: "configure" | "style" | "validation" | "json" | "edge") => string;
    optionField?: (option: WireOptionSpec) => string;
    section?: (section: string) => string;
  };
  colorMode?: "light" | "dark" | "system";
  unstyled?: boolean;
  classNames?: {
    root?: string;
    tabs?: string;
    tab?: string;
    panel?: string;
    field?: string;
    section?: string;
    validation?: string;
    json?: string;
    edge?: string;
  };
  className?: string;
  style?: React.CSSProperties;
}
```

Rules:

- If both `nodeId` and `edgeId` are supplied to `WireInspector`, explicit
  `nodeId` wins, edge-only controls are suppressed, and the `edgeId` value is
  ignored for that render.
- If `nodeId` is omitted, the inspector follows single-node selection.
- If `edgeId` is omitted and a single edge is selected, edge inspection is
  available.
- Configure uses `WireOptionCatalog`.
- Style preserves all current node appearance controls.
- Edge inspection uses existing edge fields and `edge.patch` / `edge.remove`.
- `readOnly` disables all mutating controls, including title, description,
  Configure, Style, JSON, Edge controls, and custom `renderField` callbacks.
- Inspector `ariaLabelConfig` entries are optional overrides. Missing, empty, or
  whitespace-only tab, option-field, and section labels fall back to deterministic
  defaults. Tab defaults are `Configure`, `Style`, `Validation`, `JSON`, and
  `Edge`; option-field defaults use the option label, then option key; section
  defaults use the section name, then `Options`; tests must cover omitted and
  empty or whitespace-only override values.
- Inspector tabs use `tablist`, `tab`, and `tabpanel` semantics, including
  `aria-controls`, `aria-labelledby`, roving `tabIndex`, selected state,
  automatic activation on horizontal ArrowLeft/ArrowRight navigation, Home/End
  navigation, focus retention, and deterministic initial panel focus.
  ArrowLeft/ArrowRight wrap within the applicable tab set; Home moves to the
  first applicable tab; End moves to the last applicable tab. ArrowUp/ArrowDown
  are ignored unless a vertical tab orientation is added later in the same
  `WireInspector` API with matching tests.
- Tab enters the inspector tablist at the active tab when focus approaches from
  the previous inspector control, then the next Tab moves into the active
  panel's first focusable control or panel heading when no control is focusable.
  Shift+Tab from the active panel returns to the active tab, and Shift+Tab from
  the active tab moves to the previous focusable control outside the tablist.
  The roving inactive tabs remain out of the sequential tab order. `readOnly`
  keeps tab navigation, panel headings, help text, validation text, read-only
  summaries, and copyable values reachable; only mutating controls become
  disabled, read-only, or no-op according to the field rules.
- If explicit or selected inspection is edge-only, the initial tab is `edge`.
  If `defaultTab` is not applicable to the inspected item, the inspector falls
  back to the first applicable tab. The active tab resets when the inspected
  node or edge changes.
- If `tabs` is supplied as an empty array, or if all supplied tabs are invalid or
  inapplicable for the inspected item, `WireInspector` renders a labelled,
  non-mutating empty state without a `tablist`; focus lands on the inspector root
  or empty-state heading. If `tabs` is omitted, the default applicable tab set is
  used.
- If the focused tab disappears after node, edge, or mixed-selection changes,
  focus moves to the newly active applicable tab, the tab panel heading receives
  a polite status announcement, and hidden or inapplicable tabs are removed from
  the roving tab order.
- The JSON tab is read-only in Phase 3A. It shows the inspected node JSON for
  node inspection and the inspected edge JSON for edge inspection. Mixed
  selection has no editable JSON body. If editable JSON ships later, parse
  errors must be non-mutating, node edits must dispatch only `node.patch`, and
  edge edits must dispatch only `edge.patch`.
- Generated option fields in `WireInspector` and `WireOptionPanel` must use
  stable ids, `label`/`htmlFor` or equivalent `aria-label`, description and
  validation linkage through `aria-describedby`, `aria-invalid` for errors,
  required semantics, and `fieldset`/`legend` or labelled group semantics for
  sections.
- Custom `renderField` output is always hosted inside a package-owned field
  wrapper that supplies stable ids, label text, description text, error text,
  required markers, disabled/read-only state, and `data-wire-*` attributes.
  Custom renderers must attach the provided `fieldId`, `labelId`,
  `describedBy`, and `errorId` to their focusable control or return a control
  that is labelled by the wrapper. Acceptance tests must include custom fields
  that preserve label, description, error, required, invalid, disabled, and
  read-only semantics.
- `disabled` fields use native `disabled` where available, `aria-disabled` plus
  removed sequential tab stops for non-native controls, hide field-level
  validation unless a durable diagram issue already exists, and receive no-op
  `onChange` and `onCommit` callbacks in custom renderers.
- `readOnly` fields remain focusable and copyable, use native `readOnly` or
  `aria-readonly`, keep help and validation text visible, and receive no-op
  mutating callbacks in custom renderers.
- If a field resolves to both disabled and read-only, disabled wins for focus,
  mutation, and validation visibility semantics. Parent `WireWorkspace readOnly`
  cannot make a disabled field focusable; it only makes otherwise enabled fields
  read-only. Tests must cover field-level disabled plus field-level read-only,
  parent read-only plus field-level disabled, and parent read-only plus
  field-level read-only.
- Edge controls appear only when exactly one edge is selected or `edgeId` is
  supplied. Explicit `nodeId` wins over selection. Mixed node+edge selection
  renders a non-mutating summary.
- Edge inspection Phase 3A edits only primitive edge fields that have accessible
  controls with the current option input types: `label`, `tone`, and `routing`.
  `style`, `labelStyle`, and `data` are shown as read-only summaries until the
  matching object/json/code field support ships with parsing, validation, and
  accessibility tests. `from`, `to`, `branch`, `fromHandle`, and `toHandle` are
  shown as read-only connection facts and are changed only by existing canvas
  connection workflows. Editable edge fields are available only for explicit
  edges present in `diagram.edges` with an id that can be patched. Synthesized
  edges derived from node `from` relationships are inspectable but read-only and
  use deterministic runtime-only ids with the reserved prefix
  `wire-derived-edge:` followed by a base64url-encoded canonical JSON tuple:
  `[sourceNodeId, targetNodeId, branch ?? null, fromHandle ?? null,
  toHandle ?? null, relationshipIndex]`. The tuple fields are emitted in that
  exact order; `relationshipIndex` is the zero-based index in the canonical
  relationship-owner node's normalized `from` relationship array. In this plan,
  the relationship-owner node is the node whose `from` relationship produces the
  derived edge. Absent optional values are canonical `null`, strings are not
  concatenated directly, and the encoded payload is decoded only by the
  synthesized-edge lookup. Explicit edges always take lookup precedence by exact id,
  including explicit persisted edge ids that already start with the reserved
  runtime prefix. The synthesized-edge lookup is consulted only after no explicit
  edge with the requested id exists. These ids are rebuilt from the current
  `WireDiagram` on render, never enter persisted state, never dispatch
  `edge.patch` or `edge.remove`, and resolve only through the inspector's
  synthesized-edge lookup. If the source relationship disappears, the stale
  synthesized id renders the same non-mutating empty state as a missing explicit
  edge. New explicit edge ids created by React package UI must not use this
  reserved runtime prefix. Synthesized edges expose an affordance to create an
  explicit edge if that workflow ships later. Invalid edge patch input is blocked
  before dispatch when it can be parsed locally, and reducer validation errors
  are shown in the field summary plus Validation tab after dispatch.
- Phase 3A edge fields use built-in controls only. `renderField`,
  `renderSection`, and `onOptionCommit` apply to node option fields, not Edge
  tab fields. Edge field customization is deferred until a current-name,
  edge-aware renderer contract is specified.
- `WireOptionPanel` remains a smaller primitive and shares field-rendering
  helpers with `WireInspector`.

```ts
export interface WireOptionPanelProps {
  catalog: WireOptionCatalog;
  nodeId?: string;
  title?: string;
  readOnly?: boolean;
  renderField?: WireInspectorProps["renderField"];
  renderSection?: WireInspectorProps["renderSection"];
  onOptionCommit?: (context: {
    node: WireNode;
    option: WireOptionSpec;
    value: unknown;
    action: WireAction;
  }) => void;
  unstyled?: boolean;
  classNames?: {
    root?: string;
    field?: string;
    section?: string;
    validation?: string;
  };
  className?: string;
  style?: React.CSSProperties;
}
```

### Provider

```ts
export type WireEventSource =
  | "canvas"
  | "node-card"
  | "node-list"
  | "option-panel"
  | "validation-panel"
  | "workspace"
  | "api";

export type WireEvent =
  | { type: "node.click"; source: WireEventSource; nodeId: string; input?: "pointer" | "keyboard" }
  | { type: "node.inspect"; source: WireEventSource; nodeId: string; input?: "pointer" | "keyboard" }
  | { type: "edge.click"; source: WireEventSource; edgeId: string; input?: "pointer" | "keyboard"; intent?: "select" | "inspect" }
  | { type: "pane.click"; source: WireEventSource }
  | { type: "selection.change"; source: WireEventSource; selection: WireSelection; previousSelection?: WireSelection; cause?: "node" | "edge" | "pane" | "keyboard" | "api" };

export interface WireProviderProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
  onEvent?: (event: WireEvent) => void;
  validateOnChange?: boolean;
  history?: boolean;

  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (
    selection: WireSelection,
    event: Extract<WireEvent, { type: "selection.change" }>
  ) => void;

  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }) => void;

  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: {
    source: WireEventSource;
    mode: WireMode;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }) => void;

  dirty?: boolean;
  defaultDirty?: boolean;
  onDirtyChange?: (dirty: boolean, event: {
    source: WireEventSource;
    dirty: boolean;
    previousDirty?: boolean;
    cause?: "edit" | "undo" | "redo" | "reset" | "api";
  }) => void;

  children: React.ReactNode;
}

export interface WireSelectionActions {
  setSelection(selection: WireSelection, event?: {
    source?: WireEventSource;
    previousSelection?: WireSelection;
    cause?: "node" | "edge" | "pane" | "keyboard" | "api";
  }): void;
  clearSelection(event?: {
    source?: WireEventSource;
    previousSelection?: WireSelection;
    cause?: "node" | "edge" | "pane" | "keyboard" | "api";
  }): void;
}

export interface WireViewportActions {
  setViewport(viewport: WireViewport, event?: {
    source?: WireEventSource;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }): void;
}

export interface WireContextValue extends WireReactState {
  actions: WireActions;
  selectionActions: WireSelectionActions;
  viewportActions: WireViewportActions;
  eventActions: WireEventActions;
  historyActions: WireHistoryActions;
  setMode(mode: WireMode, event?: {
    source?: WireEventSource;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }): void;
  markClean(event?: {
    source?: WireEventSource;
    previousDirty?: boolean;
    cause?: "reset" | "api";
  }): void;
}
```

Rules:

- Controlled selection, viewport, mode, and dirty state mirror editor runtime
  state only.
- `WireDiagram` remains the only persisted diagram state.
- `dispatch` and `dispatchMany` remain the mutation path for durable edits.
- `WireSelectionActions.setSelection`, `WireSelectionActions.clearSelection`,
  `WireViewportActions.setViewport`, and `setMode` keep their existing call
  shape and accept an optional event metadata argument. Existing one-argument
  calls keep working. `markClean` is additive on current `WireContextValue`; it
  is not a replacement action container and does not introduce a reducer action.
- `WireEventSource` keeps the current published literal set shown in the
  provider shape: `canvas`, `node-card`, `node-list`, `option-panel`,
  `validation-panel`, `workspace`, and `api`. Do not add source literals in this
  implementation.
- Source mapping uses the current literals consistently: canvas root, handles,
  minimap, controls, and canvas keyboard actions use `canvas`; node card
  interactions use `node-card`; node list interactions use `node-list`;
  `WireOptionPanel` and option-driven `WireInspector` fields use `option-panel`;
  standalone `WireInspector` built-in title, description, style, JSON, tab, and
  edge controls use `workspace`; standalone `WireToolbar` and `WirePalette`
  interactions use `workspace`; workspace-owned toolbar, palette, inspector-tab,
  layout, shell, and focus-transfer actions use `workspace`; validation panel
  interactions use `validation-panel`; host calls through exposed actions without
  explicit metadata use `api`.
- `WireEvent["type"]` does not expand in the initial production implementation.
  Node inspection keeps `node.inspect`; edge inspection uses existing
  `edge.click` with `intent: "inspect"`. Selection keeps existing
  `selection.change`. Viewport, mode, and dirty callbacks receive the inline
  metadata objects shown above and do not emit `onEvent`.
- Runtime-state callbacks receive the exact metadata shape for the state being
  changed. If no metadata is supplied, the provider creates metadata with
  `source: "api"` and `cause: "api"`.
- Setter arguments are the only source of truth for next selection, viewport, and
  mode values. Setter metadata accepts only `source`, `cause`, and previous-state
  hints; it must not include duplicate next-state values. The provider constructs
  callback metadata by combining the authoritative setter argument with those
  hints.
- Fit view and Fit selection both report viewport callbacks with
  `cause: "fit-view"` to keep the existing cause literal set. They differ by
  `intent: "fit-view"` or `intent: "fit-selection"` metadata. Tests must cover
  omitted and explicit `fitViewPadding` values for both intents and prove same
  resulting viewport values still suppress callbacks.
- Same-value controlled runtime updates are no-ops: they do not emit
  `onSelectionChange`, `onViewportChange`, `onModeChange`, `onDirtyChange`, or
  `onEvent`.
- Same-value checks are deterministic. `WireSelection` equality compares sorted
  unique `nodeIds` and sorted unique `edgeIds`. `WireViewport` equality compares
  finite `x`, `y`, and `zoom` values with `Object.is` after normalizing `-0` to
  `0`; non-finite viewport values are invalid and rejected before state update.
  `WireMode` and dirty equality are direct scalar comparisons. Diagram structural
  equality uses the same canonical stable JSON representation used for dirty
  baseline comparison after reducer normalization.
- Stored and callback `WireSelection` values are normalized to sorted unique
  `nodeIds` and `edgeIds`; setter input order and duplicate ids are not preserved.
- Dirty state has an explicit clean baseline. Initial `diagram` or
  `defaultDiagram` establishes the baseline. `defaultDirty` initializes only the
  uncontrolled dirty flag and notification state; it does not make the initial
  diagram dirty relative to a different baseline. When `defaultDirty={true}`,
  undo/redo still compare against the initial diagram baseline until the first
  durable edit or `markClean`. Successful durable edits set dirty true; undo/redo
  compare canonical stable JSON for the current diagram to canonical stable JSON
  for the baseline. `WireContextValue.markClean` records the resolved current
  diagram as the new clean baseline and sets dirty false. In controlled dirty
  mode it invokes `onDirtyChange(false, ...)` when dirty was true; when controlled
  dirty is already false it still updates the provider's baseline without
  emitting a same-value dirty callback. In uncontrolled mode it updates internal
  dirty state and baseline directly. Host apps can also reset dirty by changing
  controlled dirty state from true to `dirty={false}`; that transition records the
  resolved current diagram as the new clean baseline, matching `markClean`. In
  controlled diagram mode, the resolved current diagram is the current `diagram` prop. In uncontrolled
  mode, it is the provider's internal current diagram; `defaultDiagram` is read
  only at initialization and is not re-read for reset. The provider tracks the
  canonical result of provider-originated controlled edits after `onChange`; when
  the host echoes that same diagram back through the controlled `diagram` prop,
  the echo does not reset the clean baseline and dirty remains true unless the
  host also controls `dirty={false}` or calls `markClean`. A controlled `diagram`
  prop change that does not match a pending provider-originated edit is treated as
  an external diagram replacement and becomes the new clean baseline unless the
  host also supplies `dirty={true}`. No new reducer action is introduced for dirty
  reset.
- `dispatch` and `dispatchMany` apply reducer actions first. If the resulting
  diagram is referentially or structurally unchanged, they return the reducer
  result without calling `onAction`, `onChange`, changing dirty state, or adding
  history.
- For successful durable edits, callback order is `onAction`, then `onChange`,
  then dirty-state update notification, then `onEvent` if an event is emitted
  for the same user interaction.
- `dispatchMany` calls `onChange` once with `{ actions, result }` and calls
  `onAction` for each input action in input order with the aggregate result.
  Tests must document this ordering.
- Edge inspection emits existing `edge.click` with `intent: "inspect"` from
  pointer and keyboard inspection paths when inspection is enabled. Workspace
  edge-inspection state listens to that event, not to a generic graph event.
- Provider implementation must use internal helpers instead of concentrating all
  controlled runtime logic inside `WireProvider.tsx`. The provider owns the
  public context and callback wiring; internal helper modules own selection and
  viewport equality, canonical diagram snapshots, dirty clean baselines,
  provider-originated controlled edit echo detection, same-value no-op checks,
  callback metadata construction, and `dispatchMany` transaction ordering. These
  helpers are package-private and are not exported from `packages/wire-react/src/index.ts`.

### Canvas

```ts
export interface WireCanvasProps {
  mode?: "view" | "edit";
  selectOnNodeClick?: boolean;
  selectOnEdgeClick?: boolean;
  inspectOnNodeClick?: boolean;
  inspectOnEdgeClick?: boolean;
  clearSelectionOnPaneClick?: boolean;
  fitView?: boolean;
  fitViewPadding?: number;
  panOnDrag?: boolean;
  zoomOnScroll?: boolean;
  zoomStep?: number;
  minZoom?: number;
  maxZoom?: number;
  showBackground?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  readOnly?: boolean;
  optionCatalog?: WireOptionCatalog;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  renderEdge?: WireEdgeRenderer;
  edgeStyle?: EdgeStyle;
  edgeRouting?: EdgeRouting;
  keyboardA11y?: boolean;
  nodesFocusable?: boolean;
  edgesFocusable?: boolean;
  autoPanOnNodeFocus?: boolean;
  colorMode?: "light" | "dark" | "system";
  unstyled?: boolean;
  classNames?: {
    root?: string;
    viewport?: string;
    background?: string;
    node?: string;
    group?: string;
    edge?: string;
    handle?: string;
    controls?: string;
    minimap?: string;
    status?: string;
  };
  ariaLabelConfig?: {
    canvas?: string;
    node?: (node: WireNode) => string;
    edge?: (edge: WireEdgeRenderContext["edge"]) => string;
    handle?: (context: { node: WireNode; side: Side; role: "source" | "target" }) => string;
    search?: string;
    connectionTarget?: string;
    connectionSourceSide?: string;
    connectionTargetSide?: string;
    connectionSuccess?: (context: {
      sourceNode: WireNode;
      targetNode: WireNode;
      sourceSide: Side;
      targetSide: Side;
      edgeId?: string;
    }) => string;
    minimap?: string;
    validationStatus?: string;
	  controls?: {
	    zoomIn?: string;
	    zoomOut?: string;
	    fitView?: string;
	    fitSelection?: string;
	  };
  };
  isValidConnection?: (context: {
    sourceNode: WireNode;
    targetNode: WireNode;
    sourceSide: Side;
    targetSide: Side;
    diagram: WireDiagram;
  }) => boolean | string;
  className?: string;
  style?: React.CSSProperties;
}
```

Rules:

- Keyboard behavior is scoped to the focused or active canvas root, not the
  window.
- Defaults: `keyboardA11y`, `nodesFocusable`, `edgesFocusable`, and
  `autoPanOnNodeFocus` default to `true` in edit mode and to focusable but
  non-mutating behavior in view mode.
- When `keyboardA11y={false}`, the canvas does not install package keyboard
  shortcuts, roving item traversal, search shortcut, or keyboard connection
  picker. The labelled canvas root remains a sequential tab stop and ordinary
  focusable host content inside custom renderers still follows normal browser
  focus order, but package-managed node and edge shells receive no package
  `tabIndex` and no roving active item exists. `nodesFocusable` and
  `edgesFocusable` cannot re-enable managed shell focus while `keyboardA11y` is
  false; pointer selection and inspection still work when their pointer props are
  enabled. When `nodesFocusable={false}` or `edgesFocusable={false}` and
  `keyboardA11y` is true, that item kind is omitted from the roving managed-item
  set and keyboard traversal skips it; the item can still be selected by pointer
  if pointer selection is enabled. When `autoPanOnNodeFocus={false}`, keyboard
  focus can move to off-viewport managed items without automatically changing
  viewport. Tests must cover each false prop separately and combined.
- `ariaLabelConfig` entries are optional overrides. Missing, empty, or
  whitespace-only string overrides fall back to package defaults. Function
  overrides that return empty or whitespace-only strings also fall back to
  defaults. Defaults are deterministic and tested: canvas defaults to
  `Wire diagram canvas`; node labels use node title, kind, and id fallback; edge
  labels use explicit label or source/target ids; handle labels include node
  label, side, and source/target role; search defaults to `Search diagram items`;
  connection target defaults to `Choose connection target`; side controls default
  to `Choose source side` and `Choose target side`; connection success announces
  source label, target label, source side, target side, and edge id when available;
  minimap defaults to `Diagram minimap`; validation status defaults to
  `Validation status`; controls default to `Zoom in`, `Zoom out`, and `Fit view`.
  Fit-selection control labels default to `Fit selection`.
- A canvas becomes active on focus within its root, pointer down inside its root,
  or programmatic focus. It loses keyboard-command ownership on any focusout
  where the next focused element is outside the canvas root, including host UI
  and inspector UI, and on pointer interaction outside the root. Moving focus
  into the inspector relinquishes canvas keyboard-command ownership until focus
  returns to the canvas root. Text fields, controls, host controls, links,
  buttons, selects, contenteditable regions, and inspector fields must not leak
  keyboard actions to inactive canvases.
- Pointer down on a node or edge moves DOM focus to that managed shell before
  selection/inspection side effects run when `keyboardA11y` is true and the item
  kind is focusable. When `keyboardA11y` is false, pointer down on a node or edge
  keeps package focus on the canvas root and does not create a managed shell
  `tabIndex`; `nodesFocusable` and `edgesFocusable` cannot restore shell focus in
  that mode. Pointer down on the pane focuses the canvas root. This keeps
  subsequent root-scoped keyboard commands attached to the visible active canvas.
  Tests cover pointer selection and inspection with `keyboardA11y={false}` and
  both node/edge focus flags true.
- Canvas status messages use one package-owned status element inside the canvas
  root with `role="status"` and polite live-region behavior. The element has a
  stable id used by described-by relationships for connection rejection,
  keyboard search, fit-selection, large-diagram mode, slow-render feedback, and
  focus-recovery messages. Repeated identical announcements update a monotonic
  status key so assistive technology receives the repeat without creating
  multiple competing live regions.
- Focused nodes and edges use DOM roving focus with one active managed item. The
  canvas root is a labelled `role="region"` entry point. Exactly one managed
  node or edge shell has `tabIndex=0`, inactive managed shells have
  `tabIndex=-1`, and keyboard handlers run from the focused shell or bubbled
  events inside the canvas root. Custom renderers must leave the outer focusable
  shell and `data-wire-*` attributes intact.
- Canvas keyboard handlers ignore events whose composed path contains native
  interactive elements (`input`, `textarea`, `select`, `button`, `a[href]`,
  `summary`), `[contenteditable]`, any enabled focusable descendant that is not
  the managed node/edge shell itself, any descendant with an interactive ARIA
  role, or an element marked `data-wire-keyboard="ignore"`. Interactive ARIA
  roles include at least `button`, `link`, `menuitem`, `checkbox`, `radio`,
  `switch`, `slider`, `spinbutton`, `combobox`, `listbox`, `textbox`, `searchbox`,
  `tab`, `option`, `treeitem`, `gridcell`, `menu`, `menubar`, `tablist`, `grid`,
  `tree`, and `dialog`. Custom node and edge renderers can use that data
  attribute for non-focusable interactive regions without changing the outer
  managed shell.
- If the active managed item is deleted, hidden, filtered out, or becomes
  unfocusable, roving focus moves to the next item of the same kind in diagram
  order, then the previous item of the same kind, then the first item of the other
  kind. If no managed items remain, the canvas root becomes the sole `tabIndex=0`
  entry point and the status region announces that no diagram items are focusable.
- Roving traversal is deterministic and separate from node movement: `n` moves
  focus to the next node in diagram order, `p` moves to the previous node, `e`
  moves to the next edge, Shift+E moves to the previous edge, Home/End move to
  the first/last item in the active item kind, and `/` opens a canvas search box
  that filters by node or edge title/id and moves roving focus to the chosen
  result without mutating the diagram.
- Canvas search is labelled by `ariaLabelConfig.search` or the default
  `Search diagram items` and owns its own composite result semantics while open.
  The input uses a labelled `role="combobox"` pattern with `aria-expanded`,
  `aria-controls` pointing at the result popup, a `role="listbox"` result popup,
  `role="option"` results, `aria-selected` on the active result, and
  `aria-activedescendant` only for the active search result inside that popup; the
  canvas roving-focus model remains DOM focus based. A polite status announces
  result count, active result label, and no-result states. ArrowDown/ArrowUp move
  through results, Home/End move to the first/last result, Enter moves DOM roving
  focus to the active result and closes search. If there are zero results, or if
  the active result becomes stale while search is open, Enter leaves focus in the
  search input, keeps the diagram unchanged, and announces that no result is
  selected. Pointer result selection happens on pointer down before blur cleanup,
  Escape closes search and restores focus to the previously focused canvas item,
  blur closes search without changing focus selection, and canvas shortcuts are
  suspended while the search input owns focus except for search navigation,
  Escape, and Enter.
- Enter and Space select and inspect the focused node or edge when inspection is
  enabled. Node inspection emits `node.inspect`; edge inspection emits existing
  `edge.click` with `intent: "inspect"`.
- Shift+Enter moves focus to the inspector only inside `WireWorkspace`'s owned
  canvas/inspector pair. Standalone `WireCanvas` leaves focus in place after
  emitting the inspect event. Custom inspector owners handle focus from
  `onEvent`.
- Alt+Shift+Enter is handled by the owned `WireWorkspace` inspector container,
  not by standalone `WireCanvas`. It returns DOM focus to the currently inspected
  or previously focused canvas shell through the shared workspace inspection and
  canvas-focus helpers. If that item was deleted, hidden, filtered out, or became
  unfocusable while inspector focus was active, the normal roving-focus recovery
  order chooses the replacement target. If no managed item remains, focus returns
  to the canvas root and the status region announces that no diagram items are
  focusable.
- Arrow-key movement dispatches `node.move` in edit mode. If selected nodes
  exist, it moves all selected nodes; otherwise it moves the focused node and
  selects it first. Default nudge is 8 diagram units, Shift+Arrow is 32 units,
  Alt+Arrow is 1 unit, and Ctrl/Meta do not change the default movement
  contract.
- Delete and Backspace dispatch existing delete actions.
- Connection validation blocks dispatch and communicates rejection through
  a live status region, `aria-invalid` where relevant, and described-by linkage
  that is cleared when the rejection no longer applies.
- `isValidConnection` returns `true` to allow dispatch, `false` to reject with a
  default message, or a string to reject with that message. Rejection state is
  applied to the active handle/connection target and cleared on successful
  connection, connection cancel, pointer leave from the target, Escape, or a new
  connection attempt.
- Keyboard connection mode opens a labelled target picker instead of using
  unstructured global typing. Pressing `c` on a focused node opens a target
  picker with a combobox input labelled by `ariaLabelConfig.connectionTarget` or
  the default `Choose connection target`, `aria-expanded`, `aria-controls`, a
  listbox popup, option rows with `aria-selected`, and `aria-activedescendant` for
  the active target. Typing filters eligible targets; ArrowDown/ArrowUp/Home/End
  move the active target; side selection is exposed as labelled source-side and
  target-side controls; Tab and Shift+Tab follow normal focus order through the
  picker controls and never cycle candidates or dispatch connections. Enter
  dispatches the existing connect action for the active target, closes the picker,
  moves DOM focus to the new or existing edge shell when that shell is focusable
  and otherwise to the source node shell, and announces the successful connection
  through the status region. If the filtered target list is empty or the active
  target becomes stale while the picker is open, Enter does not dispatch, leaves
  focus in the target picker, keeps connection mode active, and announces that no
  valid target is selected. Escape cancels and restores focus to the source node,
  and focus leaving the picker cancels connection mode unless the next focus
  target is the visible connection status or the source node.
- Side handles remain the only persisted handle model in this plan.
- `readOnly` disables canvas-originated durable mutations, including drag,
  connect, keyboard move, delete, and style-affecting commands, while keeping
  focus, selection, inspection, pan, zoom, and copyable text available.

Additive render context fields:

```ts
export interface WireNodeRenderContext {
  focused?: boolean;
  hovered?: boolean;
  connecting?: boolean;
  connectionRole?: "source" | "target" | null;
  validationState?: "valid" | "warning" | "error" | "unknown";
}

export interface WireEdgeRenderContext {
  focused?: boolean;
  hovered?: boolean;
  connectionPreview?: boolean;
  validationState?: "valid" | "warning" | "error" | "unknown";
}
```

### Wrappers

```ts
export interface WireWorkspaceProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
  onEvent?: (event: WireEvent) => void;
  validateOnChange?: boolean;
  history?: boolean;

  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: Extract<WireEvent, { type: "selection.change" }>) => void;
  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }) => void;
  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: {
    source: WireEventSource;
    mode: WireMode;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }) => void;
  dirty?: boolean;
  defaultDirty?: boolean;
  onDirtyChange?: (dirty: boolean, event: {
    source: WireEventSource;
    dirty: boolean;
    previousDirty?: boolean;
    cause?: "edit" | "undo" | "redo" | "reset" | "api";
  }) => void;

  optionCatalog?: WireOptionCatalog;
  readOnly?: boolean;
  inspectNodeId?: string;
  defaultInspectNodeId?: string;
  onInspectNodeChange?: (nodeId: string | undefined, event: Extract<WireEvent, { type: "node.inspect" | "edge.click" | "pane.click" }>) => void;
  inspectEdgeId?: string;
  defaultInspectEdgeId?: string;
  onInspectEdgeChange?: (edgeId: string | undefined, event: Extract<WireEvent, { type: "node.inspect" | "edge.click" | "pane.click" }>) => void;
  clearInspectOnPaneClick?: boolean;

  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  sidebar?: React.ReactNode;
  inspector?: React.ReactNode;
  showNodeList?: boolean;
  showOptions?: boolean;
  showValidation?: boolean;
  layout?: "fixed" | "embedded";
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  canvasProps?: Omit<WireCanvasProps, "mode" | "optionCatalog" | "renderNodeCard" | "renderGroup">;
  inspectorProps?: Omit<WireInspectorProps, "nodeId" | "edgeId" | "optionCatalog">;
  colorMode?: "light" | "dark" | "system";
  unstyled?: boolean;
  classNames?: {
    root?: string;
    header?: string;
    sidebar?: string;
    canvasRegion?: string;
    canvas?: string;
    inspector?: string;
    nodeList?: string;
    optionPanel?: string;
    validationPanel?: string;
  };
  className?: string;
  sidebarClassName?: string;
  canvasClassName?: string;
  inspectorClassName?: string;
  style?: React.CSSProperties;
}

export interface WireEditorProps extends Omit<WireCanvasProps, "mode"> {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
  onEvent?: (event: WireEvent) => void;
  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: Extract<WireEvent, { type: "selection.change" }>) => void;
  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }) => void;
  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: {
    source: WireEventSource;
    mode: WireMode;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }) => void;
  dirty?: boolean;
  defaultDirty?: boolean;
  onDirtyChange?: (dirty: boolean, event: {
    source: WireEventSource;
    dirty: boolean;
    previousDirty?: boolean;
    cause?: "edit" | "undo" | "redo" | "reset" | "api";
  }) => void;
}

export interface WireViewerProps extends Omit<WireCanvasProps, "mode"> {
  diagram: WireDiagram;
  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: Extract<WireEvent, { type: "selection.change" }>) => void;
  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }) => void;
  onEvent?: (event: WireEvent) => void;
}
```

Rules:

- `WireWorkspace` passes provider props to `WireProvider`, option props to the
  canvas and inspector, and inspection props to its owned inspector state. Its
  built-in canvas and inspector are the only pair that participates in
  Shift+Enter focus transfer.
- `WireWorkspace` treats inspected node and inspected edge as one runtime target.
  A `node.inspect` event sets the inspected node and clears the inspected edge,
  calling `onInspectNodeChange(nodeId, event)` and
  `onInspectEdgeChange(undefined, event)`. An `edge.click` event with
  `intent: "inspect"` sets the inspected edge and clears the inspected node,
  calling `onInspectEdgeChange(edgeId, event)` and
  `onInspectNodeChange(undefined, event)`. A pane click with
  `clearInspectOnPaneClick` clears both. Controlled hosts must mirror both
  callbacks; if both controlled ids are still supplied, `inspectNodeId` wins for
  compatibility.
- Workspace, inspector, and canvas focus-transfer paths must share one internal
  inspected-target resolver. That resolver applies the precedence once:
  explicit inspector `nodeId`, explicit inspector `edgeId`, controlled or
  uncontrolled workspace inspected node, controlled or uncontrolled workspace
  inspected edge, single selected node, single selected edge, then empty or mixed
  summary. `WireInspector`, `WireWorkspace`, and focus-return logic consume the
  resolver result instead of each reimplementing precedence locally.
- `WireWorkspace readOnly` atomically locks the built-in canvas, inspector,
  option panel, toolbar, palette, and validation-affecting controls. Custom
  `inspector` content remains host-owned and must enforce its own lock.
- Top-level `WireWorkspace` props dominate nested props for owned surfaces:
  `readOnly` cannot be weakened by `canvasProps.readOnly` or
  `inspectorProps.readOnly`; provider runtime `mode`/`defaultMode`/`onModeChange`
  on `WireWorkspace` own runtime mode state, and `canvasProps.mode` is omitted so
  nested props cannot create a second mode source. If `mode` is supplied it is
  authoritative; otherwise `defaultMode` initializes runtime mode; otherwise the
  workspace defaults runtime mode to `edit`. Canvas render mode is `view` only
  when the resolved provider mode is `view`; all other current provider modes
  render the canvas in `edit` mode, with mutating commands still gated by
  `readOnly` and the specific mode's command rules. `colorMode` and `classNames`
  merge top-level workspace slots first and nested component slots second for
  component-specific slots only. `unstyled` is monotonic: if `WireWorkspace`
  receives `unstyled={true}`, owned child surfaces omit visual classes even when
  nested props set `unstyled={false}`; nested `unstyled={true}` can opt out a child
  when the workspace is styled.
- With new props omitted, `WireWorkspace` preserves the current visible defaults:
  `title`, `subtitle`, `sidebar`, custom `inspector`, `showNodeList`,
  `showOptions`, `showValidation`, `layout`, render callbacks, legacy class-name
  props, and `style` keep their existing behavior. The built-in inspector can
  share internals with `WireOptionPanel`, but `showOptions` and `showValidation`
  must preserve legacy visibility semantics.
- `WireEditor` passes controlled provider props, including `mode`,
  `defaultMode`, and `onModeChange`, into `WireProvider`. It defaults runtime mode
  to `edit` when no mode props are supplied. Canvas render mode is `view` only
  when the resolved provider mode is `view`; all other current provider modes
  render the canvas in `edit` mode, with mutating commands still gated by
  `readOnly` and the specific mode's command rules. `canvasProps.mode` is omitted
  from `WireEditorProps` and cannot override the resolved provider mode.
- `WireViewer` passes view-safe runtime props into `WireProvider` with
  `history={false}` and all canvas props into `WireCanvas` with `mode="view"`.
  It does not enable mutating keyboard commands.

### Styling

Additive props by component:

- `WireWorkspace`: `colorMode`, `unstyled`, and `classNames` slots `root`,
  `header`, `sidebar`, `canvasRegion`, `canvas`, `inspector`, `nodeList`,
  `optionPanel`, and `validationPanel`.
- `WireCanvas`: `colorMode`, `unstyled`, and `classNames` slots `root`,
  `viewport`, `background`, `node`, `group`, `edge`, `handle`, `controls`,
  `minimap`, and `status`.
- `WireInspector`: `colorMode`, `unstyled`, and `classNames` slots `root`,
  `tabs`, `tab`, `panel`, `field`, `section`, `validation`, `json`, and
  `edge`.
- `WireOptionPanel`: `unstyled` and `classNames` slots `root`, `field`,
  `section`, and `validation`.
- `WireToolbar`: `unstyled` and `classNames` slots `root`, `group`, and
  `button`.
- `WirePalette`: `unstyled` and `classNames` slots `root` and `item`.
- `WireNodeList`: `unstyled` and `classNames` slots `root`, `item`, and
  `empty`.
- `WireValidationPanel`: `unstyled` and `classNames` slots `root`, `issue`, and
  `empty`.
- `WireNodeCardView` and `WireGroupFrame`: `unstyled` and `classNames` slots
  `root`, `content`, `badge`, `meta`, `progress`, and `footer`.
- Exported primitives keep their current `className`/`style` props. Package CSS
  must cover them, but this plan does not add slot maps to primitives.

Apply these only where the current component owns styling. Required `data-wire-*`
attributes, ARIA attributes, geometry, and interaction handlers must not be
removed by styling overrides.

Slot class precedence: required package structural classes are applied first,
component `className` props are appended to the root slot, and `classNames`
entries are appended to their matching internal slot. `unstyled` removes visual
package classes but never removes structural classes, inline geometry, data
attributes, or ARIA attributes. Parent `unstyled={true}` is monotonic for owned
child surfaces and cannot be re-enabled by nested props.

Class taxonomy:

- Structural classes and `data-wire-*` attributes identify parts, preserve
  geometry hooks, and stay present in all modes. Structural part classes use the
  plain `.wire-<part>` form, such as `.wire-workspace`, `.wire-canvas`,
  `.wire-node`, `.wire-edge`, `.wire-inspector`, and `.wire-option-field`.
  Package CSS may target structural classes only for required layout, geometry,
  hit testing, and accessibility mechanics.
- Package visual classes opt into package CSS colors, spacing, borders, focus
  rings, handles, controls, and panel styling. Visual classes use the paired
  `.wire-<part>--styled` form or a `.wire-theme-*` class. Package CSS visual
  rules must target these visual classes, not the structural class alone.
- Runtime state styling uses `data-wire-state-*` and existing ARIA attributes
  rather than new public class names. Required selectors cover focused, hovered,
  connecting, preview, validation severity, disabled, and read-only states; these
  attributes remain present when `unstyled` is true so host CSS can target them.
- Retained legacy utility classes stay in default rendered markup for the first
  non-major release so existing utility-class source-scanning consumers keep
  current visuals.
- `unstyled={true}` omits package visual classes and retained legacy utility
  classes for that component subtree, while preserving structural classes,
  `data-wire-*` attributes, ARIA, inline geometry, and event handlers. The
  legacy utility fixture covers default rendering, not `unstyled` rendering.
- `colorMode="system"` renders stable markup for server and client output and
  relies on CSS media queries for the initial theme so hydration does not rewrite
  the tree. Operating-system preference changes must update colors without
  remounting components or losing focus. Forced-colors/high-contrast mode uses
  system colors, preserves visible focus indicators, keeps handles and controls
  distinguishable, and never conveys required state by color alone.
- `prefers-reduced-motion: reduce` disables or shortens nonessential transitions
  for pan/zoom affordances, minimap viewport movement, drag previews, hover
  emphasis, tab/field reveal effects, and status feedback while preserving
  visible state changes, focus rings, live-region announcements, and layout
  stability. Under reduced motion, named package transitions and animations on
  workspace, canvas, node, edge, handle, controls, minimap, inspector tab, field,
  and status slots must either be removed or have transition duration, animation
  duration, and delay <= 50 ms, animation iteration count <= 1, and total active
  animation time <= 50 ms. Tests assert computed duration, delay, iteration count,
  and total active-time thresholds.

## Phased Implementation Roadmap

### Phase 0 - Contract Lock And Drift Cleanup

Goal: ensure docs, tests, and package exports describe only current names and
planned in-place extensions.

Work:

- Audit `docs/REACT_COMPONENTS.md`, `docs/REACT_EDITOR_ARCHITECTURE.md`, and
  `docs/WIRE_OPTIONS_CATALOG_SPEC.md`.
- Mark proposed-only behavior as planned unless it ships in the same phase.
- Add type/export guards for existing root exports.
- Keep catalog flow on `WireWorkspace`, `WireCanvas`, `WireInspector`, and
  `WireOptionPanel`; do not add provider catalog state.

Acceptance:

- Docs no longer imply provider-level catalog ownership.
- Docs no longer imply `WireInspector` renders catalog fields until the
  inspector phase ships.
- Export guard tests pass.

### Phase 1 - Package CSS Export And Theme Contract

Goal: make `@aigentive/wire-react` usable from npm without utility-class source
scanning.

Work:

- Add `packages/wire-react/src/styles.css`.
- Add paired structural and visual package classes such as `.wire-workspace` plus
  `.wire-workspace--styled`, `.wire-canvas` plus `.wire-canvas--styled`,
  `.wire-node` plus `.wire-node--styled`, `.wire-inspector` plus
  `.wire-inspector--styled`, and `.wire-option-field` plus
  `.wire-option-field--styled`, while keeping existing utility classes in markup
  for the first non-major release. Do not require consumer utility-class source
  scanning for new consumers, but do not break existing consumers that followed
  the previous scanning guidance. Removing legacy utility classes is deferred
  outside this non-major plan.
- Add a package-local build helper, for example
  `packages/wire-react/scripts/build.mjs`, that removes `dist` with `fs.rm`,
  runs `tsc`, and copies the authored CSS to
  `packages/wire-react/dist/styles.css`. Do not depend on POSIX-only `rm` or
  `cp` behavior inside package scripts.
- Add `./styles.css` to `packages/wire-react/package.json` exports.
- Ensure package `files` includes the emitted stylesheet.
- Move reusable Wire CSS variables and component classes into package CSS.
- Keep playground-only layout and marketing styles in the playground app.
- Add `colorMode`, `unstyled`, and `classNames` to current components where
  needed.
- Add the packed CSS-only consumer fixture and the legacy utility-scanning
  consumer fixture in this phase so CSS compatibility can be closed before later
  documentation and release-gate wiring.
- Update `packages/wire-react/README.md`, `docs/REACT_COMPONENTS.md`, and
  install docs to import `@aigentive/wire-react/styles.css`.

Acceptance:

- `npm run build --workspace @aigentive/wire-react` emits `dist/styles.css`.
- `npm pack --workspace @aigentive/wire-react --dry-run` includes the CSS file.
- A clean build removes stale `dist` before emitting JS, declarations, and CSS.
- A minimal React consumer can render `WireWorkspace`, `WireCanvas`,
  `WireInspector`, `WireOptionPanel`, `WireEditor`, `WireViewer`,
  `WireToolbar`, `WirePalette`, `WireNodeList`, `WireValidationPanel`, and the
  exported primitives with only the package CSS import.
- The packed CSS-only consumer fixture must assert the same concrete computed
  style gates as the legacy utility fixture: non-transparent backgrounds for
  authored surfaces, visible text and icon colors, normal-text contrast of at
  least 4.5:1, large/icon-state contrast of at least 3:1, visible focus outline
  or focus ring, nonzero layout dimensions for every rendered surface, node-card
  padding and minimum hit area, handles at least 8 px by 8 px, controls at least
  32 px by 32 px, and no text/control overlap in smoke screenshots.
- A legacy utility-scanning consumer fixture can render the same current
  surfaces without the new package CSS import and retain baseline computed
  styles. Pass/fail assertions must cover non-transparent backgrounds for
  authored surfaces, visible text and icon colors, normal-text contrast of at
  least 4.5:1, large/icon-state contrast of at least 3:1, visible focus outline
  or focus ring, nonzero layout dimensions for every rendered surface, node-card
  padding and minimum hit area, handles at least 8 px by 8 px, controls at least
  32 px by 32 px, and no text/control overlap in smoke screenshots. If this gate
  cannot pass, this non-major plan stops until compatibility is preserved or a
  separate breaking-release plan is approved.
- Existing playground pages still render.
- `unstyled` keeps interaction and data attributes intact.
- Computed-style smoke tests cover inspector, option fields, focus states,
  handles, controls, theme selectors, every exported component, and every
  exported primitive.
- Theme smoke tests cover light, dark, system preference changes, server/client
  hydration stability for system mode, and forced-colors/high-contrast rendering.

### Phase 2 - Controlled Runtime State

Goal: allow product apps to own runtime editor state without changing persisted
diagram state.

Work:

- Extend `WireProviderProps` with controlled and default selection, viewport,
  mode, and dirty props.
- Pass these props through `WireWorkspace`, `WireEditor`, and view-safe runtime
  props through `WireViewer` exactly as defined in the wrapper shapes.
- Preserve current hook names and return shapes.
- Extend current context action methods with optional event metadata while
  preserving one-argument calls.
- Use provider-owned setters for selection, viewport, and mode so callbacks fire
  from one place instead of duplicating canvas event logic.
- Add callback ordering tests for selection, viewport, mode, and dirty.
- Document that controlled state mirrors runtime editor state only.

Acceptance:

- Controlled and uncontrolled modes both work.
- Controlled callbacks fire exactly once per logical change.
- Controlled selection callbacks receive the matching `WireEvent` variant.
  Controlled viewport, mode, and dirty callbacks receive their inline metadata
  objects. All controlled callbacks preserve `source`, `cause`, previous state,
  and next state as defined in their metadata shape.
- Same-value controlled runtime updates do not fire callbacks or events.
- Reducer exceptions propagate without state updates, dirty updates, history
  writes, `onAction`, `onChange`, or `onEvent`.
- `dispatchMany` remains one transaction for undo/redo.
- `dispatchMany` calls `onChange` once and `onAction` once per input action in
  order.
- For successful edits, `onAction`, `onChange`, dirty notification, and
  interaction events follow the ordering defined in the provider rules.
- Dirty can be controlled, initialized, set true after edits, and reset by host
  apps.
- `WireWorkspace`, `WireEditor`, and `WireViewer` pass-through behavior is
  covered by prop-forwarding tests.

### Phase 2.5 - Performance Harness Baseline

Goal: put measurable render and interaction instrumentation in place before
inspector and canvas expansion.

Work:

- Add deterministic fixture builders for 500-node/600-edge,
  1,000-node/1,200-edge, and 2,000-node/2,400-edge diagrams.
- Add the production-build browser harness, warmup/measured-run protocol,
  artifact capture, and current-baseline reporting.
- Add the root `test:performance` script in this phase so the baseline gate can
  run before inspector and canvas expansion.
- Record advisory current-baseline numbers before Phase 3 and Phase 4 changes
  land. These advisory numbers do not block Phase 2.5 unless the harness cannot
  run, but later phases must compare against them when they change inspector,
  canvas, focus, search, minimap, or edge rendering paths.
- Add the large-diagram mode detector using the documented node and edge count
  thresholds, but keep release-blocking UX and timing thresholds in Phase 5.

Acceptance:

- `npm run test:performance` can run against a production React build and emits
  median, p95, raw samples, and fixture metadata artifacts.
- Fixture generation is deterministic from checked-in seeds.
- Baseline artifacts are committed for Phase 3 and Phase 4 comparison. The
  machine-readable baseline JSON is committed to the repo; review attachments
  can supplement it with raw browser traces or screenshots.
- Baseline JSON is append-only by fixture and interaction key. Each entry records
  fixture name, node count, edge count, interaction name, path owner, commit SHA,
  schema version, CI runner identity, browser engine/version, sample count,
  median, p95, large-diagram mode flag, and whether the path is advisory or
  release-blocking. New-path baselines add entries without replacing existing
  Phase 2.5 entries.
- The 2,000-node/2,400-edge fallback fixture can render, focus the canvas root,
  run existing selection and viewport smoke interactions, and report whether the
  large-diagram mode detector activated. Search, keyboard roving traversal, and
  keyboard connection picker checks are added later when those paths ship.

### Phase 3 - Inspector And Options Convergence

Goal: make the inspector the cohesive production surface for node configuration,
style, validation, JSON, and edge details.

Work:

- Implement Phase 3 as mergeable slices with separate tests and rollback
  boundaries:
- Slice 3.1: extend `WireOptionSpec` in place with grouping, ordering,
  visibility, validation, read-only/disabled, and commit behavior while keeping
  the current five input types. Keep `WireOptionCatalog` as the only catalog
  name.
- Slice 3.2: add shared option field rendering helpers used by both
  `WireOptionPanel` and `WireInspector`; prove `WireOptionPanel` compatibility
  before wiring the inspector.
- Slice 3.3: establish `inspectionState.ts` resolver ownership for explicit
  node inspection and single-selection fallback, then extend `WireInspectorProps`
  with `nodeId`, `optionCatalog`, tabs, field/section renderers, and option
  commit callback; preserve current title, description, and appearance controls;
  add Configure, Style, Validation, and read-only JSON tab behavior.
- Slice 3.4: add explicit `edgeId` inspection, primitive Edge tab editing, and
  synthesized-edge lookup by extending the shared inspected-target resolver. Edge
  fields patch through current reducer actions only.
- Slice 3.5: update `WireWorkspace` to share field-rendering and
  inspected-target resolver behavior while preserving custom `inspector`,
  `showOptions`, and `showValidation` semantics. Add `inspectEdgeId`,
  `defaultInspectEdgeId`, and `onInspectEdgeChange` to `WireWorkspaceProps`.
  `inspectNodeId` wins over edge inspection when explicitly provided.
- Slice 3.6: add `inspectOnEdgeClick` to `WireCanvasProps`; it emits existing
  `edge.click` with `intent: "inspect"`, uses workspace state, and does not add a
  provider catalog or external graph state.
- Document the deferred field-type queue for after the initial production
  release: `multiSelect`, `json`, `code`, `color`, `date`, `url`, `secret`,
  `array`, `object`, and `custom`. Do not emit a literal in
  `WireOptionInputType` until that literal's complete behavior ships with
  keyboard, ARIA, parsing, formatting, validation, serialization, and tests.
- Phase 3 covers pointer edge inspection and explicit `edgeId` inspection.
  Keyboard edge inspection lands in Phase 4 with focusable edge shells and the
  root-scoped keyboard contract.
- Keep `WireOptionPanel` as a compatibility primitive.
- Add or update the legacy runtime fixture in this phase so old default provider,
  workspace, canvas, inspector, and option panel flows with new props omitted can
  be closed before release wiring.

Acceptance:

- Each Phase 3 slice can land with its own focused tests while keeping the public
  package build green; later slices must not rewrite completed earlier slices
  except through reviewed helper contracts.
- Slices 3.3, 3.4, 3.5, and 3.6 must run `npm run test:performance` and compare
  affected inspector render, workspace inspector render, edge inspection, and
  canvas edge-click paths against the committed Phase 2.5 baseline before
  landing. If a path is new and has no Phase 2.5 measurement, the slice records
  and commits the first baseline in the same baseline artifact format and Phase 5
  turns that path into a threshold.
- Existing simple catalogs render unchanged.
- `WireInspector nodeId` works without selection.
- `WireWorkspace optionCatalog` drives canvas render context and inspector
  fields.
- Inspection precedence is explicit: explicit `nodeId`, explicit `edgeId`,
  controlled workspace inspected node, controlled workspace inspected edge,
  single selected node, single selected edge, empty or mixed summary.
- If both explicit `nodeId` and explicit `edgeId` are supplied to
  `WireInspector`, `nodeId` wins and edge-only controls are unavailable for that
  render.
- Configure fields patch through `node.patch`.
- Edge fields patch through `edge.patch`.
- Edge inspection exposes editable `label`, `tone`, and `routing` in Phase 3A.
  `style`, `labelStyle`, `data`, endpoint fields, branch, and handles are
  read-only until their complete accessible editor support ships.
- Stale or deleted `edgeId` renders a non-mutating empty state.
- Edge inspection is driven by `edge.click` with `intent: "inspect"` for pointer
  paths in Phase 3 and keyboard paths in Phase 4.
- Inspector `readOnly` prevents all title, description, Configure, Style, JSON,
  Edge, and custom field mutations.
- The JSON tab is read-only in Phase 3A and never mutates the diagram.
- Inspector tabs satisfy keyboard and ARIA tablist behavior, including roving
  tab stop, automatic activation, and applicable-tab fallback.
- Edge-only inspection opens the Edge tab by default and resets the active tab
  when the inspected edge changes.
- Option fields and sections satisfy label/id, description, validation,
  required, invalid, and grouping semantics in both `WireInspector` and
  `WireOptionPanel`.
- Text input can use blur, submit, or debounce commit behavior to avoid noisy
  undo history.
- Submit-mode option fields have Apply/Revert controls, defined Enter/Escape
  behavior, pending-value cleanup on selection change or unmount, and unsaved
  change announcements.
- With new props omitted, `WireWorkspace` keeps legacy visible defaults:
  `showOptions` still governs the option/style area, `showValidation` still
  governs validation visibility, custom `inspector` still overrides the built-in
  inspector area, and the legacy runtime fixture must pass.

### Phase 4 - Canvas Accessibility And Interaction Hardening

Goal: make canvas keyboard and screen-reader behavior an explicit package
contract while retaining current pointer workflows.

Work:

- Implement Phase 4 as mergeable slices with helper ownership:
- Slice 4.1: move keyboard ownership from window scope to the active canvas root,
  add core accessible label defaults and fallback helpers for canvas, nodes,
  edges, handles, and base controls, add focusable node and edge shells, and keep
  pointer workflows unchanged. The minimal active-item and `tabIndex` resolver is
  created in `packages/wire-react/src/canvas/focus.ts` in this slice and extended
  in Slice 4.2.
- Slice 4.2: add deterministic roving focus, focus recovery, and
  inspector-to-canvas focus return through internal canvas-focus helpers.
- Slice 4.3: add keyboard select, inspect, clear, delete, movement, and command
  guards through internal keyboard-command helpers.
- Slice 4.4: add minimap labels, side-control labels, connection success
  announcements, and canvas status/live-region helpers. Search and connection
  picker labels are implemented and tested in the slices that introduce those
  widgets.
- Slice 4.5: add canvas search with labelled combobox/listbox semantics and
  root-scoped shortcut suspension while search owns focus.
- Slice 4.6: add keyboard connection target picker, connection validation
  feedback, retry/cancel behavior, and target-handle fallback fixes so preview
  and dispatch use the correct target side and point.
- Slice 4.7: extend render contexts with focus, hover, connection, and validation
  state as additive fields, then run performance comparison against the Phase 2.5
  baseline.
- Add visible focus styles through package CSS.
- Add connection validation callback on current `WireCanvasProps`.
- `WireCanvas.tsx` orchestrates these helpers, but focus ownership, keyboard
  command guards, search state, connection picker state, label construction, and
  status messages must live in package-private modules with focused tests.

Acceptance:

- Each Phase 4 slice can land independently with targeted tests and must compare
  affected render or interaction paths against the Phase 2.5 baseline before the
  next slice starts. If a path did not exist in Phase 2.5, such as canvas search
  or keyboard connection picker, the slice that introduces it records the first
  measured baseline in the same artifact format, commits that baseline JSON under
  the shared performance baseline path, and Phase 5 turns that path into a
  release-blocking threshold.
- Slice 4.1 acceptance includes a non-empty accessible name for every canvas
  root, node shell, edge shell, handle, or base control that can receive focus or
  `tabIndex=0`; focusable shells must not land before their label helper
  fallback tests pass. If Slice 4.1 lands before deterministic roving traversal
  in Slice 4.2, it must still preserve the one-managed-tab-stop invariant:
  exactly one managed shell has `tabIndex=0`, inactive managed shells have
  `tabIndex=-1`, and the active shell is chosen deterministically from selection
  first, then diagram order.
- Enter and Space select focused nodes/edges and emit the matching inspection
  event when inspection is enabled: `node.inspect` for nodes and `edge.click`
  with `intent: "inspect"` for edges. Shift+Enter moves focus to the active tab
  in the owning `WireWorkspace` inspector. Alt+Shift+Enter moves focus back to
  the active canvas item. Shift+Enter focus target resolution is ordered: active
  tab, first focusable control in the active panel, active panel heading,
  empty-state heading, then inspector root. Empty or all-inapplicable tab states
  therefore remain valid focus-transfer targets without fields.
- Focus transfer into the inspector releases canvas keyboard-command ownership
  until focus returns to the canvas root.
- Escape clears selection or exits connection mode.
- Arrow keys move selected nodes in edit mode by 8 diagram units, Shift+Arrow by
  32 units, and Alt+Arrow by 1 unit. If no nodes are selected, the focused node
  is selected and moved. Edge focus never triggers node movement.
- Keyboard connection creation uses the current side-handle model. Pressing `c`
  on a focused node enters keyboard connection mode with the default source side
  and moves focus to the labelled target picker. Typing filters eligible target
  nodes by title or id, ArrowDown/ArrowUp/Home/End move through the filtered
  result set ordered by distance from the source then diagram order, labelled
  side controls choose source/target sides, the status region announces result
  count and active target position, Enter dispatches the existing connect action
  only when the active target is still valid, closes the picker, moves focus to
  the new or existing edge shell when focusable and otherwise to the source node
  shell, and announces success. If there is no active valid target, Enter keeps
  focus in the picker, keeps connection mode active, and announces that no valid
  target is selected. Escape cancels and restores focus to the source node, Tab
  follows normal focus order within the picker controls, and focus leaving the
  picker cancels connection mode unless focus returns to the source node or status
  region.
  Keyboard reconnect for existing edges is deferred until endpoint preservation,
  explicit/synthesized edge behavior, and undo transaction shape are specified.
- Delete and Backspace remove selected items only when the canvas owns focus and
  editing is enabled.
- Any focusout from the canvas root to host UI, inspector UI, or document body
  releases canvas keyboard-command ownership. Text fields, interactive custom
  renderer controls, and elements marked `data-wire-keyboard="ignore"` never
  trigger canvas keyboard actions.
- Interactive descendants in custom node and edge renderers, including generic
  focusable descendants and ARIA widget roles, never trigger canvas Enter, Space,
  Arrow, Delete, Backspace, search, or connection shortcuts while they own focus.
- Missing, empty, and whitespace-only `ariaLabelConfig` overrides fall back to
  deterministic defaults for every labelled canvas control and announcement.
- Multiple canvases do not compete for keyboard actions.
- Read-only mode remains non-mutating.
- Connection rejections are announced and cleared through accessible status
  semantics, with `false` using a default message and string returns using that
  string as the message, for both pointer and keyboard connection workflows.
  Feedback must be visible near the canvas connection target and mirrored in the
  live region; a visually hidden status-only implementation is not sufficient.
- After a connection rejection, focus remains on the source handle or keyboard
  connection target, connection mode stays active for retry, and the user can
  choose another target or press Escape to cancel. Repeating the same rejected
  target re-announces the message by updating a monotonically increasing status
  key so assistive technology receives the repeat.
- Canvas search has accessible combobox/listbox semantics, a visible and
  programmatic label, `aria-expanded`, `aria-controls`, active descendant,
  selected-option state, no-results announcement, pointer result selection before
  blur cleanup, deterministic result order, Enter-to-focus, Escape and blur
  cleanup, focus restoration to the prior canvas item, and shortcut suppression
  while the search field owns focus.

### Phase 5 - Performance Baseline And Render Stability

Goal: set measurable performance expectations before adding heavier public
extension APIs.

Work:

- Extend the Phase 2.5 large-diagram fixtures and committed baseline metrics for
  drag preview, minimap, focus recovery, search, connection picker, and
  fit-selection; do not replace the Phase 2.5 fixture seeds or baseline artifact.
- Memoize stable node/edge render work where safe.
- Avoid full layout work during transient drag overlays where possible.
- Reduce measurement churn from observing every node on every diagram update.
- Document render/update budgets with numeric thresholds.
- Add large-diagram UX checks for orientation, focus recovery, minimap
  usefulness, and slow-render feedback.
- Extend the existing 2,000-node / 2,400-edge fallback fixture to validate the
  documented fallback activation policy and keyboard/search/navigation usability
  above the measured budget fixtures.
- Add a package-owned Fit selection control to the existing canvas controls when
  selection is non-empty. Keyboard users reach it through normal focus order; it
  does not add a global shortcut. Activating it fits selected items with the
  current `fitViewPadding` value, or the internal `DEFAULT_FIT_VIEW_PADDING = 0.2`
  constant when that prop is omitted. The same constant must be used by Fit view
  and Fit selection. Tests must cover omitted `fitViewPadding`, explicit
  `fitViewPadding`, and shared Fit view/Fit selection default behavior. The
  control preserves DOM focus on the active selected item when it remains visible,
  otherwise moves focus to the first selected focusable item in diagram order,
  and announces the fitted item count in the status region.
- Define large-diagram mode as an internal render mode that activates when node
  count exceeds 1,000 or edge count exceeds 1,200. In that mode the canvas keeps
  node and edge rendering, selection, roving focus, search, visible selection,
  connection cancellation, and fit-selection behavior; package CSS disables
  nonessential motion, nonessential measurement work is deferred, and minimap
  rendering is simplified to viewport bounds plus selection bounds. The status
  region announces large-diagram mode once per diagram load and again when the
  mode changes.
- Defer viewport culling until measured budgets prove it is needed.

Acceptance:

- Large fixture budgets are documented for at least 500 nodes / 600 edges and
  1,000 nodes / 1,200 edges.
- Metrics include initial render time, selection update time, viewport update
  time, drag-preview frame budget, minimap on/off cost, roving focus traversal,
  search/filter latency, focus recovery, and auto-pan-on-focus timing.
- Benchmarks run against a production React build, not development mode, with
  three warmup runs and seven measured runs. Report median and p95.
- Initial release thresholds:

  | Fixture | Initial render median | Selection p95 | Viewport p95 | Drag p95 | Minimap p95 | Focus/search p95 |
  |---|---:|---:|---:|---:|---:|---:|
  | 500 nodes / 600 edges | <= 1,500 ms | <= 80 ms | <= 80 ms | <= 24 ms | <= 250 ms | <= 80 ms |
  | 1,000 nodes / 1,200 edges | <= 3,000 ms | <= 140 ms | <= 120 ms | <= 32 ms | <= 450 ms | <= 140 ms |

- CI allows at most 20% variance over the threshold before failing. Threshold
  changes require benchmark evidence in the implementation review.
- Large-diagram UX remains usable: fit-to-selection works for keyboard and
  pointer selection, auto-pan keeps focused nodes visible without stealing
  focus, minimap viewport reflects pan/zoom accurately at both fixture sizes,
  the canvas exposes a skip-to-inspector/control path, roving focus prevents
  thousands of Tab stops, and slow initial render shows non-blocking progress
  feedback after 250 ms with `aria-busy` on the canvas region and a polite
  `role="status"` announcement.
- Large-diagram UX checks are release-blocking: fit-to-selection must reveal
  every selected item with the configured padding, focus recovery must restore
  the active item after pan/zoom/search within the focus/search p95 budget,
  minimap viewport error must stay within 2 px of scaled viewport bounds, the
  skip control must be the next Tab stop after the canvas root with label
  "Skip to inspector and controls", and slow-render feedback must appear by
  250 ms and clear when rendering completes.
- If timing budgets fail, the implementation must either improve the measured
  path or ship a documented fallback such as disabling minimap by default above
  the failing size. Any fallback for diagrams larger than the measured fixtures
  activates deterministically when node count exceeds 1,000 or edge count exceeds
  1,200, and must be verified against the 2,000-node / 2,400-edge fallback
  fixture. The fallback must preserve keyboard selection, roving focus, search,
  skip-to-inspector, visible selection, connection cancellation, and non-mutating
  slow-render feedback; it must use the large-diagram mode behavior above and
  may not remove fit-selection or inspector focus transfer. Do not add viewport
  culling as a public contract until this evidence exists.
- Drag preview does not relayout the full diagram unnecessarily.
- Selection and viewport updates have explicit pass/fail thresholds recorded in
  tests or benchmark snapshots.
- Performance fixtures are generated deterministically from a checked-in seed
  and run in the repo browser automation harness against the current CI runtime
  and a production build. The harness uses browser performance marks around
  scripted interactions, records raw samples as artifacts, and fails only after
  the warmup and measured-run rules above.

### Phase 6 - Docs, Examples, And Release Readiness

Goal: make the implementation adoptable and releasable.

Work:

- Update `docs/REACT_COMPONENTS.md` as the current props reference.
- Update `docs/REACT_EDITOR_ARCHITECTURE.md` with controlled runtime state and
  inspector behavior.
- Update `docs/WIRE_OPTIONS_CATALOG_SPEC.md` to match implemented inspector
  behavior.
- Add package README examples for CSS import, controlled editor, custom shell,
  inspector options, edge inspection, read-only viewer, theming, and keyboard
  behavior.
- Add playground docs examples for options, controlled state, custom shell,
  package CSS, and accessibility.
- Update root `README.md`, machine-readable docs under `apps/playground/app/llm`,
  and `packages/wire-mcp/src/docs-shape.ts` if they describe React package
  usage.
- Remove stale or missing route references.
- Add a docs link checker, markdown snippet typecheck, packed-consumer smoke,
  publish dry-run, version bump, and lockfile/workspace dependency sync to the
  release checklist. The docs checker must also reject external inspiration
  source names, external inspiration package names, URLs, and documentation paths
  in React package docs, examples, and implementation plans.
- Ensure root `package.json` scripts exist for the release gates introduced here;
  `test:performance` is added in Phase 2.5 and re-used by this release wiring:
  `test:consumer-pack`, `test:api-compat`, `test:docs-links`,
  `test:docs-source-names`, `test:legacy-runtime`, `test:docs-snippets`,
  `test:persistence`, `test:performance`, `test:release-notes`,
  `test:legacy-utility-consumer`, `check:semver`, `check:registry-version`,
  `check:workspace-ranges`, `check:lockfile`, `check:api-diff`, and
  `release:wire-react:dry-run`.
- Add `scripts/check-docs-source-names.mjs` and
  `scripts/docs-source-name-denylist.json`. The script scans `README.md`,
  `docs/**/*.md`, `packages/wire-react/README.md`,
  `packages/wire-react/src/**/*.{ts,tsx,md,mdx}`,
  `apps/playground/app/**/*.{md,mdx,ts,tsx}`, and
  `packages/wire-mcp/src/docs-shape.ts`. It excludes dependency folders,
  package output folders, coverage output, local framework output, local browser
  test output, and static preview output by category; exact exclusion tokens live
  only in the checked-in script and its tests, not in this plan. Files marked
  with `@generated` are excluded only when they are not checked-in public docs
  surfaces; checked-in generated public docs must be scanned directly, or their
  checked-in source template must be scanned in the same run. The script checks
  file contents and relative file paths, normalizes path separators, lowercases
  text, strips punctuation boundaries for token matching, rejects external URL
  patterns, and checks case-insensitive matches from the checked-in denylist. The
  denylist is the source of truth for external inspiration source names, external
  inspiration package names, and external documentation paths, and the plan must
  not print those blocked tokens.
- Wire the Phase 1 packed-consumer fixture under
  `tests/fixtures/wire-react-consumer` into root scripts and CI, and add API
  compatibility fixtures under `tests/fixtures/wire-react-api-compat`.
- Wire the Phase 3 legacy runtime fixture under
  `tests/fixtures/wire-react-legacy` into root scripts and CI to render old
  default behavior with all new props omitted.
- Wire the Phase 1 legacy utility-scanning consumer fixture under
  `tests/fixtures/wire-react-utility-legacy`.
- Add historical persisted diagram fixtures under
  `tests/fixtures/wire-diagrams-historical`.
- Keep `.github/workflows/ci.yml` and `.github/workflows/release.yml` aligned
  with the new gates before publishing.

Acceptance:

- Every public API change has a runnable example.
- Example coverage is feature-specific: CSS export, controlled runtime state,
  inspector options, edge inspection, canvas keyboard accessibility, theming,
  `WireEditor`, `WireViewer`, custom renderers, and read-only mode each have at
  least one runnable package README or playground example.
- Docs never describe unimplemented APIs as current.
- Root README, package README, markdown docs, playground docs, and
  machine-readable docs agree.
- Stale route and broken internal link checks pass.
- `npm run test:docs-source-names` rejects external inspiration source names,
  external inspiration package names, URLs, and documentation paths in React
  package docs, examples, and implementation plans.
- Markdown code snippets compile or are explicitly marked non-runnable.
- Package release can be validated with the documented command set.
- The packed-consumer fixture covers `WireEditor`, `WireViewer`, all current
  package components, and exported primitives.
- The packed-consumer fixture runs install, typecheck, and production build
  against the packed tarball and `@aigentive/wire-react/styles.css`.
- The legacy runtime fixture proves omitted new props preserve old default
  behavior for provider, workspace, canvas, inspector, and option panel flows.
- Registry version uniqueness is checked before publish.

## File-By-File Implementation Notes

| Path | Notes |
|---|---|
| `package.json` | Add root release-gate scripts for packed consumer, API compatibility, legacy runtime, docs links, docs source-name guard, docs snippets, persistence, performance, semver, registry uniqueness, workspace ranges, lockfile sync, API diff, and release dry-run; `test:performance` is owned by Phase 2.5 and remains part of PR CI and release dry-run. |
| `packages/wire-react/package.json` | Add `./styles.css` export, include CSS in files, add CSS side-effect metadata so bundlers preserve the stylesheet import, add a `clean` script, and update the build script to call the package-local build helper. |
| `packages/wire-react/scripts/build.mjs` | Cross-platform clean/build/copy helper using runtime filesystem APIs for `dist` and CSS emission. |
| `packages/wire-react/src/styles.css` | New package-owned CSS variables, theme selectors, focus styles, controls, minimap, inspector, option fields, cards, handles. |
| `packages/wire-react/src/index.ts` | Preserve the current root export names exactly. Do not add new root export names; the only new export surface is the `./styles.css` subpath. |
| `packages/wire-react/src/options.ts` | Keep `WireOptionInputType` to current literals in Phase 3A; extend `WireOptionSpec`, helpers, predicate evaluation, validation, grouping, field ordering, and commit helpers. |
| `packages/wire-react/src/components/optionFields.tsx` | Package-private shared field renderer used by `WireOptionPanel` and `WireInspector`; owns wrapper semantics, labels, descriptions, errors, disabled/read-only behavior, custom renderer hosting, pending values, and commit modes. |
| `packages/wire-react/src/components/inspectionState.ts` | Package-private inspected-target resolver, synthesized-edge lookup, stale target handling, and workspace/inspector precedence rules. |
| `packages/wire-react/src/components/WireOptionPanel.tsx` | Refactor field rendering into shared helpers; preserve current props and behavior. Add optional renderers and commit behavior. |
| `packages/wire-react/src/components/WireInspector.tsx` | Add `nodeId`, `edgeId`, `optionCatalog`, tabs, Configure/Style/Validation/JSON/Edge views, field renderers, and edge patch controls. |
| `packages/wire-react/src/components/WireWorkspace.tsx` | Pass controlled runtime props to provider; share improved inspector internals while preserving current default visibility and custom inspector override; define node/edge inspection precedence. |
| `packages/wire-react/src/components/WireEditor.tsx` | Pass through controlled runtime props where the component wraps provider/workspace behavior. |
| `packages/wire-react/src/components/WireViewer.tsx` | Accept package styling props and keep view-only behavior non-mutating. |
| `packages/wire-react/src/components/WireToolbar.tsx` | Replace utility-only styling with package classes while preserving current props and command behavior. |
| `packages/wire-react/src/components/WirePalette.tsx` | Replace utility-only styling with package classes and keep drag/add behavior unchanged. |
| `packages/wire-react/src/components/WireNodeList.tsx` | Replace utility-only styling with package classes and preserve selection/render-item behavior. |
| `packages/wire-react/src/components/WireValidationPanel.tsx` | Replace utility-only styling with package classes and preserve validation rendering. |
| `packages/wire-react/src/primitives/*` | Ensure package CSS covers current primitives without changing their exports. |
| `packages/wire-react/src/canvas/WireCanvas.tsx` | Orchestrate package-private canvas helpers; add root-scoped keyboard handling, focusable nodes/edges, ARIA labels, connection validation, focus styles, and target-handle fix without concentrating all behavior in this file. |
| `packages/wire-react/src/canvas/focus.ts` | Package-private roving focus, active canvas ownership, focus recovery, auto-pan-on-focus, inspector return target resolution, and large-diagram focus behavior. |
| `packages/wire-react/src/canvas/keyboard.ts` | Package-private keyboard command mapping, composed-path guards, edit/read-only gating, movement/delete behavior, and shortcut suppression while nested widgets own focus. |
| `packages/wire-react/src/canvas/accessibility.ts` | Package-private ARIA label defaults, override fallback handling, status/live-region message construction, reduced-motion hooks, and forced-colors state coverage. |
| `packages/wire-react/src/canvas/search.tsx` | Package-private canvas search input, result ordering, combobox/listbox semantics, stale-result behavior, focus restoration, and status announcements. |
| `packages/wire-react/src/canvas/connectionPicker.tsx` | Package-private keyboard connection picker, side controls, validation rejection state, retry/cancel behavior, success focus, and connection announcements. |
| `packages/wire-react/src/canvas/performance.ts` | Package-private fixture-size detection, large-diagram mode flags, nonessential measurement deferral, and minimap simplification switches. |
| `packages/wire-react/src/canvas/nodeTypes.tsx` | Extend render context fields without replacing current render callbacks. |
| `packages/wire-react/src/canvas/geometry.ts` | Keep side-handle behavior; support performance baseline changes without schema expansion. |
| `packages/wire-react/src/provider/types.ts` | Add controlled runtime state props, callback types, and optional metadata fields on existing `WireEvent` variants and current action methods; do not add new `WireEvent["type"]` or `WireEventSource` literals. |
| `packages/wire-react/src/provider/context.ts` | Extend context only for current controlled runtime state and current action helpers. |
| `packages/wire-react/src/provider/runtimeState.ts` | Package-private controlled/uncontrolled selection, viewport, mode, and dirty resolution; same-value no-op checks; metadata construction; and callback ordering helpers. |
| `packages/wire-react/src/provider/dirtyState.ts` | Package-private canonical stable JSON snapshots, clean baseline management, `markClean` behavior, controlled edit echo detection, and external diagram replacement handling. |
| `packages/wire-react/src/provider/WireProvider.tsx` | Wire provider props and context to package-private runtime helpers; keep reducer dispatch, history, and callback wiring visible at the provider boundary. |
| `packages/wire-react/src/hooks.ts` | Preserve current hook names and return shapes. Do not add store or instance hooks in this plan. |
| `packages/wire-react/src/provider/WireProvider.controlled.test.tsx` | Controlled/uncontrolled selection, viewport, mode, dirty, same-value no-ops, callback metadata, dirty reset, reducer exception, and `dispatchMany` ordering coverage. |
| `packages/wire-react/src/provider/runtimeState.test.ts` | Direct helper coverage for selection normalization, viewport finite-value validation, viewport equality, mode equality, same-value callback suppression, event metadata construction, and callback ordering. |
| `packages/wire-react/src/provider/dirtyState.test.ts` | Canonical snapshot equality, clean baseline reset, controlled edit echo, external replacement, and `markClean` helper coverage. |
| `packages/wire-react/src/components/optionFields.test.tsx` | Shared field renderer wrapper, labels, descriptions, errors, required state, disabled/read-only semantics, pending values, custom renderers, and commit modes. |
| `packages/wire-react/src/components/inspectionState.test.ts` | Direct resolver coverage for explicit node, explicit edge, workspace node, workspace edge, single selection fallback, mixed/empty summary, stale targets, synthesized-edge lookup, and focus-return target choice. |
| `packages/wire-react/src/components/WireInspector.test.tsx` | Node/edge explicit inspection, tabs, Configure/Style/Validation/JSON/Edge behavior, read-only non-mutation, custom fields, edge patch controls, stale edge state, and tab focus behavior. |
| `packages/wire-react/src/components/WireWorkspace.inspection.test.tsx` | Workspace inspected-target resolver, node/edge precedence, callbacks, pane clear, custom inspector compatibility, and wrapper prop pass-through. |
| `packages/wire-react/src/canvas/focus.test.ts` | Roving focus, active canvas ownership, deletion/filter recovery, inspector return focus, auto-pan-on-focus, large-diagram focus, and multi-canvas isolation. |
| `packages/wire-react/src/canvas/keyboard.test.ts` | Root-scoped shortcuts, movement/delete gating, interactive descendant guards, read-only behavior, search/connection shortcut suppression, and keyboard inspection events. |
| `packages/wire-react/src/canvas/search.test.tsx` | Search combobox/listbox semantics, deterministic result order, no-result and stale-result Enter behavior, pointer selection, Escape/blur cleanup, and focus restoration. |
| `packages/wire-react/src/canvas/connectionPicker.test.tsx` | Keyboard connection picker semantics, side selection, validation rejection/retry/cancel, repeated rejection announcements, success focus, and target-handle fallback. |
| `packages/wire-react/src/canvas/accessibility.test.ts` | ARIA label fallbacks, status messages, reduced-motion behavior, forced-colors state coverage, and connection success announcements. |
| `packages/wire-react/src/canvas/performance.test.ts` | Large-diagram mode threshold detection, minimap simplification flags, nonessential measurement deferral, and fit-selection focus/status behavior. |
| `tests/e2e/wire-react-css-consumer.spec.ts` | Packed CSS-only consumer smoke, computed-style assertions, and package resolution from fixture dependencies. |
| `tests/e2e/wire-canvas-keyboard.spec.ts` | Keyboard-only canvas selection, inspection, movement, delete, search, connection, rejection recovery, focus transfer, and large-diagram fallback smoke. |
| `tests/e2e/wire-react-docs-examples.spec.ts` | Runnable docs examples for CSS import, controlled state, inspector options, edge inspection, theming, read-only viewer, and accessibility. |
| `tests/performance/wire-react-fixtures.ts` | Deterministic fixture builders and checked-in seeds for 500-node/600-edge, 1,000-node/1,200-edge, and 2,000-node/2,400-edge diagrams. |
| `tests/performance/wire-react-performance.spec.ts` | Production-build browser harness for render, selection, viewport, drag preview, minimap, focus/search when available, large-diagram mode, and raw sample artifacts. |
| `tests/performance/baselines/wire-react-current.json` | Advisory Phase 2.5 baseline artifact and later release-threshold comparison data; entries are append-only by fixture and interaction key so later search, connection picker, edge inspection, and focus baselines do not replace earlier render/selection/viewport data. |
| `tests/fixtures/wire-react-consumer/*` | From a temporary directory outside the monorepo workspace, install the packed tarball, import package CSS, typecheck, production-build, assert package resolution comes from fixture `node_modules`, not repo workspaces or symlinks, and run computed-style assertions against packaged CSS. |
| `tests/fixtures/wire-react-api-compat/*` | Typecheck legacy imports, props, hooks, catalogs, render callbacks, and diagram fixtures against built declarations. |
| `tests/fixtures/wire-react-legacy/*` | Runtime-render old default provider, workspace, canvas, inspector, and option panel flows with new props omitted. |
| `tests/fixtures/wire-react-utility-legacy/*` | Render current package surfaces through the previous utility-scanning setup without importing package CSS and assert the concrete computed-style gates from Phase 1. |
| `tests/fixtures/wire-diagrams-historical/*` | Historical persisted `WireDiagram` JSON fixtures from prior releases that render, validate, and round-trip without migration. |
| `scripts/check-docs-source-names.mjs` | CI script for the docs source-name guard; scans the documented React package docs/example globs, rejects external URLs, and checks tokens from the denylist without printing the blocked token list in this plan. |
| `scripts/docs-source-name-denylist.json` | Checked-in source of truth for blocked external inspiration source names, package names, and documentation paths. |
| `.github/workflows/ci.yml` | PR CI runs build, typecheck, unit tests, React tests, React coverage, e2e tests, playground build, docs checks, docs source-name guard, docs snippets, release-notes check, packed consumer, API compatibility, legacy runtime, legacy utility-scanning consumer, workspace range, lockfile, API diff, semver check, persistence tests, and the performance gate. It does not run registry lookup or publish dry-run. |
| `.github/workflows/release.yml` | Release-candidate and publish workflows require successful same-SHA PR CI, then run only `npm run release:wire-react:dry-run` for release validation before publish. |
| `docs/*.md` | Align current docs with implemented API and planned roadmap; include root README and machine-readable docs surfaces. |
| `apps/playground/app/docs/*` | Add runnable examples and remove npm consumer utility-scanning requirement after CSS export ships. |

## Test Matrix

| Area | Tests |
|---|---|
| Package export | Clean build emits CSS; packed package includes CSS; root, compile, and CSS imports resolve; package manifest preserves stylesheet side-effect metadata for authored and emitted CSS paths. |
| CSS-only consumer | Install the packed tarball into an isolated fixture outside workspace resolution, import `@aigentive/wire-react/styles.css`, typecheck, production-build, assert package resolution from fixture `node_modules`, and render `WireWorkspace`, `WireCanvas`, `WireInspector`, `WireOptionPanel`, `WireEditor`, `WireViewer`, `WireToolbar`, `WirePalette`, `WireNodeList`, `WireValidationPanel`, controls, minimap, cards, handles, and exported primitives with package CSS only. This isolated fixture must run computed-style assertions for package CSS, not only workspace tests. |
| Legacy utility-scanning consumer | Render current surfaces with the old utility-scanning setup and no package CSS import; computed-style smoke asserts backgrounds, colors, contrast, focus outlines, dimensions, handle/control hit areas, and no overlap. If it fails, this non-major plan stops until compatibility is preserved or a separate breaking-release plan is approved. |
| Styling | Light/dark/system themes, `unstyled`, slot `classNames`, focus-visible styles, computed styles for every exported component and primitive, inspector/options/handles/controls coverage, data attributes retained. |
| Provider | Controlled/uncontrolled diagram, selection, viewport, mode, dirty; same-value no-ops; reducer exceptions; callback ordering; dirty reset; history on/off. |
| Actions/history | `dispatch`, `dispatchMany`, multi-node drag undo, multi-select delete undo, edge disconnect undo, group ungroup undo. |
| Options | Existing catalogs, all current input types, storage targets, grouping, ordering, hidden, disabled, read-only, validation, parse/format, commit modes; declaration tests prove deferred input literals are absent until implemented; each additional input type has its own UX/a11y test before shipping. |
| Inspector | Node selection, explicit `nodeId`, explicit `edgeId`, both ids supplied with node winning, mixed selection summary, Configure/Style/Validation/JSON/Edge tabs, read-only JSON in Phase 3A, primitive edge-field editing, read-only edge object/endpoint fields, edge-only default tab, tab reset on inspected item change, read-only non-mutation, tablist keyboard behavior. |
| Option panel compatibility | Current `WireOptionPanel` tests continue to pass; shared field renderer behaves the same for simple catalogs. |
| Canvas pointer | Drag, pan, zoom, fit view, connect, select, edge click, custom `renderEdge` hit path. |
| Canvas keyboard | Roving focus for nodes/edges, focus recovery after deletion/filtering/empty diagrams, accessible canvas search, Enter/Space select and inspect, Shift+Enter inspector focus transfer with Alt+Shift+Enter return, Escape clear/cancel, arrow movement, semantic keyboard connection target picker, Delete/Backspace delete, text-entry and interactive-custom-content guards, multi-canvas scoping. |
| Accessibility | ARIA labels and fallback defaults, `aria-selected`, DOM roving focus order, control labels, handle labels, canvas search combobox/listbox semantics and status announcements, connection target picker semantics, option field label/id/description/error/required semantics for generated and custom-rendered fields, tablist roving tab stop and panel labels, empty/all-inapplicable inspector tabs, live region for pointer and keyboard connection rejection, reduced motion, forced-colors/high-contrast behavior. |
| Performance | `npm run test:performance` runs the deterministic browser production-build harness for 500-node/600-edge and 1,000-node/1,200-edge fixture render, selection, viewport, drag preview, minimap on/off budgets with the numeric thresholds above, plus fallback checks that preserve keyboard/search/navigation usability on the 2,000-node/2,400-edge fixture; committed baseline JSON validates append-only entries, schema version, path owner, commit SHA, CI runner identity, browser engine/version, sample count, median, and p95. |
| Persistence safety | Serialize after inspector/options/controlled-state workflows and assert no React callbacks, selection, viewport, mode, dirty, inspected node/edge ids, focus, drag, or catalog functions enter `WireDiagram`; render, validate, and round-trip historical persisted `WireDiagram` JSON fixtures from prior releases without migration. |
| Compatibility fixtures | Typecheck legacy import, prop, hook, catalog, render callback, and diagram fixtures against the built package; run a full emitted declaration/API diff against the last published package; include exhaustive `WireEvent` and `WireEventSource` switch fixtures for semver validation; runtime-render legacy defaults with all new props omitted. |
| Docs/examples | Playground docs build, examples render, package CSS examples run, feature-specific root/package markdown snippets typecheck, internal links pass. |

Required local gates:

```bash
npm run clean --workspace @aigentive/wire-react
npm run build --workspace @aigentive/wire-react
npm run build
npm run build --workspace @aigentive/wire-playground
npm run typecheck
npm test
npm run test:react
npm run test:react:coverage
npm run test:e2e
npm run test:consumer-pack
npm run test:api-compat
npm run test:legacy-runtime
npm run test:legacy-utility-consumer
npm run test:docs-links
npm run test:docs-source-names
npm run test:docs-snippets
npm run test:persistence
npm run test:performance
npm run test:release-notes
npm run check:semver
npm run check:workspace-ranges
npm run check:lockfile
npm run check:api-diff
```

Add these scripts to root `package.json` and gate them in PR CI:

```bash
npm run clean --workspace @aigentive/wire-react
npm run build --workspace @aigentive/wire-react
npm run build
npm run build --workspace @aigentive/wire-playground
npm run typecheck
npm test
npm run test:react
npm run test:react:coverage
npm run test:e2e
npm run test:consumer-pack
npm run test:api-compat
npm run test:legacy-runtime
npm run test:legacy-utility-consumer
npm run test:docs-links
npm run test:docs-source-names
npm run test:docs-snippets
npm run test:persistence
npm run test:performance
npm run test:release-notes
npm run check:semver
npm run check:workspace-ranges
npm run check:lockfile
npm run check:api-diff
```

Release-candidate CI and release publish must require same-SHA PR CI success and
then run this release-only aggregate:

```bash
npm run release:wire-react:dry-run
```

## Docs And Examples Matrix

| Doc/example | Required update |
|---|---|
| `packages/wire-react/README.md` | Runnable CSS import, controlled editor, inspector options, edge inspection, custom shell, read-only viewer, theming, and keyboard behavior examples. |
| Root `README.md` | Package install, CSS import, current docs routes, no stale sample links. |
| `docs/REACT_COMPONENTS.md` | Current props reference for CSS, provider controlled state, inspector, options, canvas accessibility. |
| `docs/REACT_EDITOR_ARCHITECTURE.md` | Runtime state ownership, controlled state, catalog flow, inspector model, persistence rules. |
| `docs/WIRE_OPTIONS_CATALOG_SPEC.md` | Current catalog behavior, in-place option additions, inspector integration. |
| `apps/playground/app/docs/install/page.tsx` | Replace consumer utility-scanning requirement with package CSS import. |
| `apps/playground/app/docs/examples/_shared.tsx` | Shared runnable diagrams, catalogs, controlled-state helpers, and example shell used by feature-specific routes. |
| `apps/playground/app/docs/examples/package-css/page.tsx` | Show a minimal npm-style consumer import path and package CSS-only styling coverage. |
| `apps/playground/app/docs/examples/custom-shell/page.tsx` | Show current wrapper and render-callback customization without alternate package or option names. |
| `apps/playground/app/docs/examples/options/page.tsx` | Show implemented `WireOptionCatalog`, `WireInspector optionCatalog`, `WireOptionPanel catalog`, and storage targets. |
| `apps/playground/app/docs/examples/controlled-state/page.tsx` | Show host-owned selection, viewport, mode, dirty, and diagram. |
| `apps/playground/app/docs/examples/edge-inspection/page.tsx` | Show `edge.click` with `intent: "inspect"`, `inspectEdgeId`, read-only endpoints, and current `edge.patch` controls. |
| `apps/playground/app/docs/examples/accessibility/page.tsx` | Show keyboard-only node/edge selection, movement, deletion, labels, connection rejection recovery, and focus transfer. |
| `apps/playground/app/docs/examples/theming/page.tsx` | Show CSS variables, `colorMode`, `unstyled`, and `classNames`. |
| `apps/playground/app/docs/examples/wrappers/page.tsx` | Show `WireWorkspace`, `WireEditor`, and `WireViewer` pass-through behavior. |
| `apps/playground/app/docs/examples/read-only-inspector/page.tsx` | Show that `WireWorkspace readOnly` locks built-in surfaces while host-owned custom inspector content must enforce its own non-mutating behavior. |
| `apps/playground/app/llm/*` docs | Keep React package shape aligned with current APIs. |
| `packages/wire-mcp/src/docs-shape.ts` | Keep generated guidance aligned with current APIs. |
| Docs source-name guard | `npm run test:docs-source-names` rejects external inspiration source names, external inspiration package names, URLs, and documentation paths in React package docs, examples, implementation plans, checked-in generated public docs, and checked-in source templates for generated docs. |
| `scripts/docs-source-name-denylist.json` | Checked-in source of truth for blocked external inspiration tokens used by `npm run test:docs-source-names`; keep blocked tokens out of this implementation plan. |

Public-addition example coverage:

| Public addition | Required runnable coverage |
|---|---|
| `WireOptionSpec commitMode`, `debounceMs`, `parse`, `format`, `validate`, `hidden`, `disabled`, and `readOnly` | Package README or playground options example with typechecked snippets and form interaction tests. |
| `WireInspector onOptionCommit`, `renderField`, `renderSection`, `tabs`, `nodeId`, `edgeId`, and `readOnly` | Inspector options and read-only examples showing node fields, edge details, and non-mutating custom renderers. |
| `WireCanvas isValidConnection`, keyboard connection target picker, search labels, and `ariaLabelConfig` additions | Accessibility example covering pointer rejection, keyboard rejection/retry, successful connection focus, search, and configurable labels. |
| `colorMode`, `unstyled`, and per-component `classNames` slots | Theming example covering workspace, canvas, inspector, option panel, toolbar, palette, node list, validation panel, node card view, and group frame slots. |
| Controlled `selection`, `viewport`, `mode`, `dirty`, and inspected edge/node state | Controlled-state example showing host mirroring, dirty reset, and diagram persistence safety. |

## Migration And Compatibility Notes

- Existing consumers can keep importing from `@aigentive/wire-react`.
- Existing `WireOptionCatalog` objects remain valid.
- Existing `WireOptionPanel` usage remains valid.
- Existing `WireWorkspace optionCatalog` and `WireCanvas optionCatalog` remain
  valid.
- Existing `renderNodeCard`, `renderGroup`, and `renderEdge` callbacks remain
  valid.
- Existing hooks keep their names and return shapes.
- Existing diagrams do not require migration.
- Existing public props are covered by compatibility fixtures.
- Consumers can keep their own styling, but npm consumers get a first-class CSS
  file and no longer need utility-class source scanning.
- Existing consumers that followed the previous utility-scanning guidance must
  keep baseline computed styles in the first non-major release. The legacy
  utility-scanning consumer fixture proves this with concrete style, contrast,
  focus, dimension, hit-area, and overlap assertions. If the implementation
  cannot preserve that path and requires adding `@aigentive/wire-react/styles.css`,
  the non-major release must stop until compatibility is restored or a separate
  breaking-release plan is approved.
- Controlled runtime state is optional and does not change persisted diagram
  shape.
- Serialization tests prove runtime-only state and catalog functions never enter
  persisted `WireDiagram` JSON.

## Release And Package Export Notes

Package export target:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./compile": {
      "types": "./dist/compile.d.ts",
      "default": "./dist/compile.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": [
    "./dist/styles.css",
    "./src/styles.css"
  ]
}
```

Build requirements:

- `npm run build --workspace @aigentive/wire-react` must emit JS, declarations,
  and CSS.
- `npm run clean --workspace @aigentive/wire-react` must exist and remove only
  `packages/wire-react/dist`.
- Preserve top-level package metadata used by older tooling, including `main`
  and `types`, while adding `./styles.css` to `exports`.
- Add CSS side-effect metadata for the authored and emitted stylesheet paths so
  consumer bundlers do not tree-shake the package CSS import.
- `npm pack --workspace @aigentive/wire-react --dry-run` must show CSS in the
  package.
- `npm publish --dry-run --workspace @aigentive/wire-react` must pass.
- A packed-consumer fixture must install the tarball and import
  `@aigentive/wire-react/styles.css`.
- CSS export and additive React props require a minor version bump for
  `@aigentive/wire-react` because this plan avoids exported `WireEvent`
  discriminant expansion. Docs-only or bugfix-only follow-up work can use a
  patch bump. Any breaking runtime behavior is out of scope for this plan.
- `npm run check:semver` validates patch/minor expectations and runs exhaustive
  `WireEvent` and `WireEventSource` fixtures to prove the event discriminant
  sets did not expand.
- `npm run check:api-diff` compares emitted declarations and root export names
  against the last published `@aigentive/wire-react` package. Any removed export,
  narrowed prop, incompatible type change, or unexpected new root export blocks
  a minor release.
- Before publish, `npm view @aigentive/wire-react@<version> version
  --registry=<publishConfig registry>` must fail with a registry not-found
  response for the candidate version, proving registry uniqueness against the
  same registry used by `publishConfig`. Network, auth, rate-limit, mirror, or
  registry availability errors are hard failures. `npm run
  check:registry-version` is the root script for this check.
- Package version changes must follow the repo release process, update the
  package lockfile, and keep internal workspace dependency ranges aligned for
  packages and apps that depend on `@aigentive/wire-react`. `npm run
  check:workspace-ranges` validates workspace dependency ranges and `npm run
  check:lockfile` validates lockfile sync.
- `npm run release:wire-react:dry-run` is the single release aggregate. It runs
  clean, package build, full repo build, playground build, typecheck, unit tests,
  React tests, React coverage, e2e tests, packed consumer, API compatibility,
  legacy runtime, legacy utility consumer, docs links, docs source-name guard,
  docs snippets, release-notes check, persistence, performance, workspace range,
  lockfile, API diff, semver, registry, pack, and publish dry-run gates in order.
- Release workflows invoke the aggregate dry-run script after same-SHA PR CI
  success. They do not separately invoke semver, registry, pack, or publish
  dry-run commands outside the aggregate.
- `.github/workflows/release.yml` must require a successful CI workflow for the
  same commit SHA before publish, even when `release:wire-react:dry-run` is run
  locally.
- `npm run test:release-notes` validates the candidate release notes artifact at
  `docs/releases/wire-react-<version>.md`. The `<version>` segment must match the
  candidate `@aigentive/wire-react` package version. The release notes must call
  out the CSS import path plus user-facing additions from the public-addition
  example coverage table: controlled runtime state, inspector/options behavior,
  edge inspection, canvas accessibility, theming, wrapper pass-through,
  compatibility constraints, and any docs-only changes.
- No package versioning scheme or alternate package name is needed for these
  changes.

## Locked Decisions

- `dispatchMany` calls `onChange` once and `onAction` once per input action in
  input order.
- Package CSS uses semantic package classes and CSS variables. Playground chrome
  stays in the playground app.
- Edge controls appear only for explicit `edgeId` or exactly one selected edge.
- When `WireInspector` receives both explicit `nodeId` and explicit `edgeId`,
  `nodeId` wins.
- The JSON inspector tab is read-only in Phase 3A.
- Enter and Space both select and inspect the focused canvas item when
  inspection is enabled.
- Phase 3A ships current option input types plus form metadata. Additional
  option input types are deferred until after the initial production release and
  ship one at a time with their own UX/a11y/serialization tests.
- Initial performance budgets cover 500-node/600-edge and 1,000-node/1,200-edge
  fixtures with the numeric thresholds above.
- CSS/API additions use a minor package bump because the plan avoids exported
  event discriminant expansion. Docs-only or bugfix-only follow-up work can use
  a patch bump.
- Edge inspection is runtime state driven by existing `edge.click` with
  `intent: "inspect"`; durable edits use current `edge.patch` and `edge.remove`
  actions.
- Canvas keyboard ownership clears on focusout outside the canvas root.

## Acceptance Checklist

- [ ] Current public names are extended in place.
- [ ] Complete current root export coverage is guarded.
- [ ] No alternate option catalog names are introduced.
- [ ] `WireProvider` remains catalog-free.
- [ ] `WireDiagram` and reducer actions remain the durable state contract.
- [ ] Package CSS export works from a packed package.
- [ ] Package manifest preserves stylesheet side-effect metadata for authored and
      emitted CSS paths.
- [ ] Packed-consumer fixture imports CSS and renders without utility-class
      source scanning.
- [ ] Packed-consumer fixture runs outside workspace resolution and resolves the
      package from fixture `node_modules`.
- [ ] Packed-consumer fixture covers every current exported component and
      primitive.
- [ ] Packed-consumer fixture typechecks and production-builds from the packed
      tarball.
- [ ] Packed-consumer fixture runs computed-style assertions against packaged CSS.
- [ ] Legacy utility-scanning consumer fixture proves existing styled consumers
      meet concrete computed-style, contrast, focus, dimension, hit-area, and
      overlap assertions, or this non-major plan stops.
- [ ] Npm consumer docs do not require utility-class source scanning.
- [ ] Controlled runtime state works without changing persisted diagrams.
- [ ] Controlled runtime events use the defined `WireEvent` variants.
- [ ] Controlled runtime no-op and callback ordering rules are tested.
- [ ] Semver gate proves exported `WireEvent` and `WireEventSource`
      discriminants do not expand in this release.
- [ ] Wrapper prop pass-through is tested for `WireWorkspace`, `WireEditor`, and
      `WireViewer`.
- [ ] `WireWorkspace readOnly` atomically locks the built-in workspace UI.
- [ ] `WireInspector` supports catalog Configure fields and current Style
      controls.
- [ ] Deferred option input literals are absent from declarations until their
      implementations ship.
- [ ] `WireOptionPanel` remains compatible.
- [ ] Option parse errors and invalid pending values are local, accessible, and
      non-mutating.
- [ ] Debounced option commits cannot dispatch after selection, inspected item,
      read-only, disabled, unmount, or parse-invalid changes.
- [ ] Edge inspection emits existing `edge.click` with `intent: "inspect"`, uses
      current edge fields, and edits through reducer actions.
- [ ] Edge object-like fields, endpoints, branch, and handles are read-only in
      the inspector until complete accessible editors ship.
- [ ] Inspector read-only mode is non-mutating across all tabs and custom fields.
- [ ] The JSON inspector tab is read-only in Phase 3A.
- [ ] Canvas keyboard behavior is root-scoped and tested.
- [ ] Canvas keyboard ownership clears on focusout outside the canvas root.
- [ ] Canvas keyboard connect workflow is tested; keyboard reconnect remains
      deferred.
- [ ] Canvas roving focus traversal and search are deterministic and tested.
- [ ] Connection rejection recovery keeps focus, supports retry/cancel, and
      re-announces repeated rejection messages with visible and live-region
      feedback.
- [ ] Large diagrams use roving canvas focus instead of thousands of Tab stops.
- [ ] Keyboard inspection and inspector focus transfer are tested.
- [ ] Accessibility labels and focus states are documented and tested.
- [ ] Option field labels, descriptions, validation errors, required state, and
      grouping semantics are tested.
- [ ] Large-diagram baseline is measured against numeric thresholds and UX
      orientation checks.
- [ ] Committed performance baseline JSON validates append-only entries, schema
      version, path owner, commit SHA, CI runner identity, browser engine/version,
      sample count, median, and p95.
- [ ] `npm run test:performance` is wired into local, PR CI, and release dry-run
      gates, including the 2,000-node/2,400-edge fallback fixture.
- [ ] Docs and examples match implemented APIs.
- [ ] Every public API change has a runnable feature-specific example.
- [ ] Root README, package README, markdown docs, playground docs, and
      machine-readable docs are aligned.
- [ ] Docs links and markdown snippets are validated.
- [ ] Docs/source-name guard rejects external inspiration source names, external
      inspiration package names, URLs, and documentation paths.
- [ ] Legacy runtime fixture proves old default behavior with new props omitted.
- [ ] Persistence tests prove runtime state, including selection, viewport,
      mode, dirty state, inspected node/edge ids, focus, and drag state, does not
      enter `WireDiagram`.
- [ ] Historical persisted `WireDiagram` JSON fixtures render, validate, and
      round-trip without migration.
- [ ] Package version, lockfile, and workspace ranges are release-ready.
- [ ] Full emitted declaration/API diff passes against the last published
      package.
- [ ] Package `clean` script exists and release dry-run includes base CI gates.
- [ ] Registry version uniqueness checks only pass on a registry not-found
      response.
- [ ] PR CI excludes registry and publish checks; release-candidate/publish
      workflows include them and require same-SHA CI success before publish.
- [ ] `npm run test:release-notes` validates the package CSS import path,
      user-facing additions, docs-only changes, and CSS migration compatibility
      constraints.
- [ ] Release gates pass.

## Verification Status

This file was produced after seven research passes, three independent design
plans, and a three-judge selection panel. The selected plan is Plan A with
mandated grafts for adoption scope, CSS coverage, keyboard hardening,
accessibility, edge inspector support, and documentation.

Adversarial verification completed after 27 critic rounds. Round 27 reported no
critical, high, or medium gaps across API compatibility, implementation
maintainability, production UX/accessibility, and tests/release/docs review.
