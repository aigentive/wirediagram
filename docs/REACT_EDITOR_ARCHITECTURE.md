# React Editor Architecture

`@aigentive/wire-react` is a controlled React editor for canonical
`WireDiagram` JSON. DOM layout, custom cards, canvas viewport state, and
inspector widgets are runtime concerns; persistence remains the Wire schema plus
reducer actions.

## State Ownership

`WireProvider` owns the editor state:

- `diagram`: canonical `WireDiagram`.
- `validation`: current validation result.
- `selection`: selected node and edge ids.
- `viewport`: pan and zoom state.
- `history`: undo and redo stacks.
- `mode`: edit or view.
- `dirty`: runtime dirty flag compared against a provider clean baseline.

Apps can control the diagram with `diagram`/`onChange` or provide
`defaultDiagram` for local state. Selection, viewport, mode, and dirty state can
also be controlled through the same provider-backed surfaces. Runtime callbacks
carry source/cause metadata; durable edits still flow through reducer actions.

## Reducer Contract

All durable edits should flow through `WireAction`:

- Node lifecycle: `node.add`, `node.patch`, `node.remove`, `node.move`,
  `node.resize`.
- Edge lifecycle: `edge.connect`, `edge.patch`, `edge.disconnect`,
  `edge.remove`.
- Structure: `group.add`, `group.ungroup`, `layout.apply`, `note.add`.
- Diagram-level updates: `diagram.create`, `diagram.replace`, `diagram.patch`,
  `metadata.patch`.
- Transactions: `batch`.

The reducer returns the next canonical diagram plus optional inverse actions.
The provider records those inverses for undo/redo when history is enabled.

## Canvas Geometry

`WireCanvas` renders canonical nodes and edges into a pan/zoom canvas. Node
positions and sizes are stored on the `WireDiagram`; viewport state is not.

Canvas responsibilities:

- convert pointer gestures into world coordinates;
- snap new node positions to the configured grid;
- emit reducer actions for move, resize, connect, disconnect, and selection;
- keep keyboard commands scoped to the active canvas root;
- expose focusable node and edge shells with configurable ARIA labels;
- keep runtime geometry out of persisted node data.

Layout commands are explicit. `layout.apply` can reposition nodes through the
implemented `dagre` engine. `elk` is reserved and remains documented as a future
engine so hosts do not assume it is available.

## Render Callbacks

The default renderers are `WireNodeCardView` and `WireGroupFrame`. Apps can
customize runtime display with:

- `renderNodeCard`;
- `renderGroup`;
- `renderEdge`;
- serializable `node.data.card` display hints.

Custom render callbacks receive canonical node data plus runtime context. They
should not write app-only React state back into `node.data` unless it is intended
to persist and remain serializable.

## Option Catalogs

Wire does not define a universal set of AI/tool/action options. Consumers pass a
`WireOptionCatalog` to `WireWorkspace`, `WireInspector`, `WireOptionPanel`, or
`WireCanvas`.

`WireInspector` and `WireOptionPanel` read specs for the selected or explicit
node and emit `node.patch`:

- `storage: "node"` updates canonical top-level node fields such as `model`,
  `ref`, or `branches`.
- `storage: "data"` updates the top-level `node.data` object.
- omitted storage writes to `node.data.options`, which is the default runtime
  configuration slot.

`WireProvider` does not accept `optionCatalog`; the catalog is a view-layer
contract used by canvas and inspector components.

## Inspector Model

The inspector resolves one runtime target:

- explicit `nodeId`;
- explicit `edgeId`;
- single selected node;
- single selected edge;
- empty or mixed selection summary.

For nodes, title, description, Configure, Style, Validation, and read-only JSON
tabs operate on canonical node fields and option catalog fields. For edges,
explicit persisted edges with ids can edit `label`, `tone`, and `routing`
through `edge.patch`; derived relationship edges are inspectable but read-only.

Apps that need a domain-specific inspector can replace the default panel and
still use `useWireDiagram`, `useWireSelection`, and `useWireDispatch` to emit the
same reducer actions.

## Persistence Contract

Persist only canonical `WireDiagram` JSON. Do not persist:

- React component instances;
- generic graph node/edge objects;
- viewport pan/zoom;
- transient hover, drag, or selection state;
- non-serializable callbacks or runtime objects.

Before saving imported or external content, run `parseWireDiagram` and then
`validate`. Before rendering raw SVG/PNG, parse and sanitize style values through
the core renderer.

## App Integration

Product apps usually choose one of two integration levels:

| Level | Use when | Shape |
|---|---|---|
| `WireWorkspace` | You want the standard shell | Pass diagram, `onChange`, optional catalog/render callbacks |
| `WireProvider` + `WireCanvas` | You need a custom product shell | Compose your own sidebars/toolbars around provider hooks |

Both paths keep the same reducer protocol, validation behavior, and history
semantics. That is the contract shared with MCP tools and cloud APIs.
