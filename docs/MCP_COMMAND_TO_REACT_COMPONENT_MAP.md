# MCP Command To React Component Map

MCP tools, React editor controls, and storage APIs all converge on canonical
`WireAction` reducer edits. This map shows how the public agent commands line up
with the React components that emit or observe equivalent edits.

## Command Map

| MCP tool | Reducer action | React source or observer | Validation | Undo/history |
|---|---|---|---|---|
| `create_diagram` | `diagram.create` | App shell/import flows; `WireProvider` receives a new diagram | Parses full diagram before save | Starts a new history timeline |
| `save_diagram` | `diagram.replace` | JSON editor save/import flows | Parses full diagram before replace | Stored as one replace entry when dispatched through provider |
| `patch_diagram` | `diagram.patch` | Metadata/settings panels | Validates merged diagram | Single undo entry |
| `add_node` | `node.add` | `WireCanvas` add gestures, app tool rails, templates | Node id and graph validation after insert | Single undo entry |
| `update_node` | `node.patch` | `WireInspector`, `WireOptionPanel`, custom node controls | Validates patched node and graph | Single undo entry |
| `remove_node` | `node.remove` | Canvas delete, node list actions | Removes related references/edges through reducer rules | Single undo entry or batch member |
| `move_node` | `node.move` | `WireCanvas` drag/keyboard position changes | Position is normalized then graph validation runs | Single undo entry or batch member |
| `resize_node` | `node.resize` | `WireCanvas` resize handles | Size is normalized then graph validation runs | Single undo entry or batch member |
| `connect` | `edge.connect` | `WireCanvas` connection gestures | Validates endpoints, branch, and cycles where applicable | Single undo entry |
| `disconnect` | `edge.disconnect` | Canvas edge delete for node `from` links | Validates graph after removal | Single undo entry |
| `update_edge` | `edge.patch` | Edge inspector/custom edge controls | Validates explicit edge id and endpoints | Single undo entry |
| `remove_edge` | `edge.remove` | Canvas explicit-edge delete | Validates graph after removal | Single undo entry |
| `set_layout` | `layout.apply` | Layout toolbar/actions | `dagre` is implemented; `elk` is reserved and warns | Single undo entry |
| `add_group` | `group.add` | Grouping command UI | Validates group and child ids | Single undo entry |
| `ungroup` | `group.ungroup` | Group frame/context controls | Validates child membership after ungroup | Single undo entry |
| `add_note` | `note.add` | Note tools and templates | Validates note node shape | Single undo entry |
| `patch_metadata` | `metadata.patch` | Document metadata/settings panels | Validates diagram metadata after merge | Single undo entry |
| `apply_actions` | `batch` wrapper around actions | `WireDispatchContext.dispatchMany`, multi-select delete, group moves | Applies all actions then validates once | One undo entry containing reversed inverses |
| `validate` | none | `WireValidationPanel`, `useWireValidation` | Read-only validation | No history change |
| `get_diagram_json` | none | `useWireDiagram`, JSON export panels | Reads current canonical diagram | No history change |
| `render_svg` / `render_png` | none | Preview/export panels, `Flow` SVG render path | Parses before rendering | No history change |
| `render_preview` | share creation plus render URLs | Share dialog and cloud preview flow | Parses/persists before URL generation | No React history change |
| `export_mermaid` | none | Mermaid export panel | Parses before conversion | No history change |
| `summarize_diagram` | none | Sidebar summaries and agent responses | Parses before summarizing | No history change |

## Component Responsibilities

| Component or hook | Responsibility |
|---|---|
| `WireProvider` | Owns canonical diagram state, reducer dispatch, validation, selection, viewport, and undo/redo stacks. |
| `useWireDispatch` | Emits single reducer actions from controls and custom components. |
| `useWireHistory` | Exposes `undo`, `redo`, `canUndo`, and `canRedo` for app toolbars. |
| `WireCanvas` | Emits canvas gestures as reducer actions and renders nodes/edges from canonical state. |
| `WireInspector` | Emits `node.patch` actions for title, description, style, and selected-node configuration. |
| `WireOptionPanel` | Emits `node.patch` actions for catalog-driven options. |
| `WireValidationPanel` | Observes provider validation state; it does not mutate diagrams. |
| `WireWorkspace` | Composes provider, canvas, list, option panel, and validation for product apps. |

## Validation Behavior

Reducer actions are small and composable, but validation is diagram-level. The
provider applies the mutation, normalizes the resulting diagram, and validates
the full graph. `dispatchMany` batches related edits so validation runs once at
the logical transaction boundary.

Agents should prefer `apply_actions` for multi-step edits because it mirrors
`dispatchMany`: either the logical batch is accepted as a coherent update or the
validation result explains what must be repaired.

## Undo Behavior

The React provider records inverse actions for both single dispatches and
batches. Batch inverses are stored in reverse order so multi-select deletes,
group moves, and agent-style edit sets undo as one user-visible operation.

MCP itself is stateless across calls; undo is an editor concern. Agents that need
reversible writes should produce clear `apply_actions` batches and let the host
editor persist history when those actions are replayed locally.

