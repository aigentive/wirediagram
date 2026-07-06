# Wire LLM Docs

Status: implemented source map
Owner: Wire
Priority: LLM accuracy and speed first, human readability second.

Agents should not scrape human docs when a structured route or MCP resource is
available. The canonical source is:

- `docs/llm/SKILL.md`
- `packages/wire-mcp/src/docs-shape.ts`
- MCP tool: `v1_get_docs_shape`
- MCP resources under `wire://docs/`
- HTTP manifest: `/llm/wire-docs.shape.json`
- discovery endpoint: `/.well-known/wire-docs.json`

## Agent Entry Sequence

1. Call `v1_get_docs_shape({ task })` or read `/llm/wire-docs.shape.json`.
2. Read `/llm/schema/wire-diagram.json` before producing raw JSON.
3. Use `/llm/examples/{name}.wire.json` for a known-valid starting point.
4. Use `/llm/recipes/{id}.json` for implementation tasks.
5. Validate every saved diagram before rendering or sharing.

When operating inside this repository, read `docs/llm/SKILL.md` first. It is
the compact agent workflow for creating, editing, validating, rendering,
styling, branching, grouping, and embedding Wire diagrams.

## Preferred Build Path

Use `@aigentive/wire-react` for React UI:

- `@aigentive/wire-react/styles.css` for default styles.
- `WireWorkspace` for full editor surfaces.
- `WireProvider` plus `WireCanvas` for custom product shells.
- `WireEditor` and `WireViewer` for packaged editable/read-only embeds.
- `WireToolbar`, `WirePalette`, `WireInspector`, `WireOptionPanel`, and
  `WireValidationPanel` for standard controls.

Persist `WireDiagram` from `onChange`. Do not persist adapter nodes as the
application contract. React consumers are not required to install or configure
Tailwind; use CSS variables, `colorMode`, `unstyled`, and `classNames`.

## CLI Path

Use `@aigentive/wire-cli` for local file workflows:

- `wire init <id>` creates a local diagram.
- `wire add <kind> --diagram=<id> --title="..."` appends nodes.
- `wire validate <id>` runs schema and structural checks.
- `wire export <id> --format=svg|json|mermaid` emits derived artifacts.

Run validation before export. JSON remains the source of truth.

## Hosted Chat Key

Authenticated `/wires` chat requires the user to save an OpenAI API key in the
right chat sidebar before sending LLM edits. The key is stored encrypted on the
user account through `/api/user/openai-key`. This is separate from the Wire
Cloud API key used by MCP clients.

## Public Routes

- `/llm/wire-docs.shape.json`
- `/llm/agent-guide.md`
- `/llm/mcp.shape.json`
- `/llm/cli.shape.json`
- `/llm/react.shape.json`
- `/llm/cloud.shape.json`
- `/llm/validation.shape.json`
- `/llm/skill.shape.json`
- `/llm/schema/wire-diagram.json`
- `/llm/examples/support-triage.wire.json`
- `/llm/examples/approval-flow.wire.json`
- `/llm/examples/rag-pipeline.wire.json`
- `/llm/examples/mcp-tool-call-flow.wire.json`
- `/llm/recipes/create-wire-diagram.json`
- `/llm/recipes/edit-with-wire-actions.json`
- `/llm/recipes/validate-and-repair.json`
- `/llm/recipes/render-for-review.json`
- `/llm/recipes/style-cards-and-edges.json`
- `/llm/recipes/branch-condition-flow.json`
- `/llm/recipes/group-nodes.json`
- `/llm/recipes/embed-react-viewer.json`
- `/llm/recipes/build-react-workspace.json`
- `/llm/recipes/connect-local-mcp.json`
- `/llm/recipes/repair-invalid-diagram.json`

## Banned Agent Outputs

- Mermaid as primary state.
- Adapter JSON as primary state.
- Node fields named `connectsTo`, `source`, `target`, `next`, or uppercase
  `kind`.
- `from: null`; omit `from` when no source exists.
- Cloud share links that point customers to localhost.
- Versioned or parallel public API names.
