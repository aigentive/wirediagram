# Wire Docs For LLMs Proposal

Status: draft proposal  
Date: 2026-04-30  
Owner: Wire Cloud / MCP  
Goal: make Wire documentation directly usable by LLM agents, not merely readable by humans.

## Problem

Current docs are human-first pages. They explain concepts, but an LLM has to infer:

- which API or MCP tool to use
- which JSON shape is canonical
- which examples are safe to copy
- which docs are current versus legacy
- how to recover from validation errors
- how to build an app using `@aigentive/wire-react` without drifting into React Flow internals

The result is predictable model drift: agents produce Mermaid, React Flow JSON,
ad hoc JSX, stale URLs, or invalid Wire diagrams even when the right primitives
exist in this repo.

## Product Decision

Do not optimize the docs site as the primary LLM interface.

Build a canonical machine-readable docs layer first. Human docs can render from
that layer, but the LLM source of truth should be structured, compact,
versioned, and executable.

Call this layer **Wire Shape**:

```text
Wire Shape = versioned knowledge graph for how to build with Wire
```

It should describe schemas, components, MCP tools, examples, recipes, routes,
and validation rules in a form that an agent can retrieve and follow without
scraping prose.

## Strategic Principles

1. Canonical JSON beats prose.
2. Recipes beat tutorials.
3. Small retrieval chunks beat long pages.
4. Validation rules must be first-class docs.
5. Every example must be executable or schema-valid.
6. The docs should tell an LLM what not to do.
7. Human pages should be derived from the same source where possible.

## Target Consumers

- Claude Code / Codex / Cursor using MCP.
- Hosted Wire chat agents.
- Local MCP users connected to Wire Cloud.
- Future crawler/indexer pipelines.
- Humans secondarily, through generated or rendered pages.

## Proposed Artifacts

### 1. `wire-docs.shape.json`

Root manifest for the docs knowledge graph.

```json
{
  "version": 1,
  "product": "wire",
  "updatedAt": "2026-04-30T00:00:00.000Z",
  "entrypoints": {
    "agent": "docs/llm/agent-guide.shape.json",
    "react": "docs/llm/react.shape.json",
    "mcp": "docs/llm/mcp.shape.json",
    "cloud": "docs/llm/cloud.shape.json"
  },
  "contracts": [
    "wire-diagram",
    "wire-action",
    "wire-react-components",
    "wire-mcp-tools",
    "wire-cloud-share-urls"
  ]
}
```

### 2. `docs/llm/*.shape.json`

Structured docs chunks. Each chunk should be small enough for direct prompt
injection or retrieval.

Shape fields:

```json
{
  "id": "mcp.render_preview",
  "kind": "tool",
  "summary": "Mint browser and embed URLs for a diagram.",
  "useWhen": ["user asks to share", "agent needs visual review URL"],
  "doNotUseWhen": ["agent only needs inline SVG"],
  "inputs": {},
  "outputs": {},
  "examples": [],
  "failureModes": [],
  "related": ["cloud.share_urls", "tool.render_svg"]
}
```

### 3. `docs/llm/agent-guide.md`

Short prompt-ready guide generated from Shape. This should replace hand-maintained
long-form agent docs where possible.

Required sections:

- canonical model
- tool selection
- mutation sequence
- validation repair loop
- React build path
- cloud share path
- banned outputs

### 4. `docs/llm/examples/*.wire.json`

Canonical example diagrams. Every example must pass `parseWireDiagram` and
`validate`.

Examples:

- `support-triage.wire.json`
- `approval-flow.wire.json`
- `rag-pipeline.wire.json`
- `customer-onboarding.wire.json`
- `mcp-tool-call-flow.wire.json`

### 5. `docs/llm/recipes/*.json`

Agent task recipes.

Example:

```json
{
  "id": "recipe.react.custom-node-card",
  "goal": "Build a custom Wire card using @aigentive/wire-react.",
  "preferredPath": [
    "Import WireProvider and WireCanvas",
    "Use option catalogs for node actions",
    "Keep WireDiagram as source of truth",
    "Persist onChange output"
  ],
  "avoid": [
    "Do not import React Flow directly",
    "Do not store canvas state outside WireDiagram",
    "Do not create connectsTo fields"
  ],
  "filesToRead": [
    "docs/llm/react.shape.json",
    "docs/llm/examples/custom-card.tsx"
  ]
}
```

### 6. `/.well-known/wire-docs.json`

Public discovery endpoint for hosted agents.

```json
{
  "name": "Wire",
  "llmDocs": "https://reefagent-mcp-wire.vercel.app/llm/wire-docs.shape.json",
  "mcp": "https://reefagent-mcp-wire.vercel.app/mcp",
  "schema": "https://reefagent-mcp-wire.vercel.app/llm/schema/wire-diagram.json"
}
```

## Docs Routes

Add machine-first routes:

| Route | Purpose |
|---|---|
| `/llm/wire-docs.shape.json` | root docs manifest |
| `/llm/agent-guide.md` | prompt-ready operating guide |
| `/llm/mcp.shape.json` | MCP tools, inputs, outputs, examples |
| `/llm/react.shape.json` | React build surface |
| `/llm/cloud.shape.json` | auth, share URLs, API keys |
| `/llm/schema/wire-diagram.json` | canonical diagram schema |
| `/llm/examples/{name}.wire.json` | validated examples |
| `/llm/recipes/{id}.json` | task recipes |

Keep human pages under `/`, `/quickstart`, `/mcp`, etc. Those pages can link to
the LLM routes, but they are not the source of truth for agents.

## MCP Alignment

Add or update MCP resources:

```text
wire://docs/
wire://docs/agent-guide.md
wire://docs/mcp.shape.json
wire://docs/react.shape.json
wire://docs/cloud.shape.json
wire://docs/examples/{name}.wire.json
wire://docs/recipes/{id}.json
```

Add tool:

```text
v1_get_docs_shape({ topic?: string, task?: string })
```

Return shape chunks, not a prose page. The existing `v1_get_agent_guide` can
remain as a convenience wrapper around `agent-guide.md`.

## React Library Guidance

LLM docs must force the preferred build path:

```text
Use @aigentive/wire-react.
Use WireProvider for state.
Use WireCanvas for rendering/editing.
Use WireToolbar, WirePalette, WireInspector, WireValidationPanel for controls.
Persist WireDiagram from onChange.
Do not use React Flow as the app-level contract.
```

The docs should expose component contracts as structured data:

```json
{
  "component": "WireCanvas",
  "package": "@aigentive/wire-react",
  "purpose": "Render and optionally edit a WireDiagram inside WireProvider.",
  "requiredContext": ["WireProvider"],
  "props": [
    { "name": "mode", "type": "view | edit", "default": "view" },
    { "name": "fitView", "type": "boolean" },
    { "name": "showMiniMap", "type": "boolean" }
  ],
  "avoid": ["Do not pass React Flow nodes directly."]
}
```

## Validation As Documentation

Every validation issue should have an LLM repair hint.

Shape:

```json
{
  "code": "node.duplicate-id",
  "severity": "error",
  "meaning": "Two nodes share the same id.",
  "repair": "Rename one node and update any from/edge references.",
  "badExample": {},
  "goodExample": {}
}
```

The chat agent and MCP guide should retrieve these hints before attempting a
repair.

## Banned Patterns

The LLM docs should explicitly reject:

- Mermaid as the primary representation.
- React Flow JSON as the primary representation.
- `connectsTo`.
- undocumented node kinds.
- silent schema coercion.
- overwriting human layout positions unless asked.
- edit-capable public links when the user asked for view/share/embed.

## Build Plan

### Phase 1 — Static LLM Docs

- Add `docs/llm/` with shape JSON, guide markdown, examples, recipes.
- Add validation test that every `.wire.json` example parses and validates.
- Add docs route handlers under `/llm/*`.
- Add `.well-known/wire-docs.json`.

### Phase 2 — Generated Human Docs

- Move MCP tool lists, env vars, routes, and component props into shape files.
- Generate or hydrate existing docs pages from the shape data.
- Keep prose only where it adds product framing.

### Phase 3 — MCP Resources

- Expose shape docs through `wire://docs/*`.
- Add `v1_get_docs_shape`.
- Update `v1_get_agent_guide` to summarize shape chunks.

### Phase 4 — Agent Runtime Use

- Chat agent loads relevant shape chunks before generating diagrams or code.
- MCP agent guide instructs agents to call docs resources before unfamiliar
  tasks.
- Playground can show the exact chunks used by the agent for traceability.

## Acceptance Criteria

- An LLM can answer "how do I build a custom Wire editor?" by reading only
  `/llm/react.shape.json` and one recipe.
- An LLM can create a valid diagram by reading only the schema, validation hints,
  and examples.
- An LLM can configure Claude Code MCP from `/llm/mcp.shape.json`.
- All `.wire.json` examples parse and validate in CI.
- Human docs do not contain MCP tool lists that drift from MCP source.
- `v1_get_docs_shape` returns concise chunks under a predictable token budget.

## Open Decisions

- Whether `docs/llm/*.shape.json` is hand-authored or generated from TypeScript
  source comments.
- Whether human docs should be fully generated from shape or just reference it.
- Whether shape docs should be versioned per npm package version or per app
  deployment.
- Whether cloud docs should include authenticated API examples with redacted
  keys or only setup recipes.

## Recommendation

Start with hand-authored shape files plus tests. This gives immediate LLM
utility without blocking on a full docs generator. Once stable, generate the
repetitive parts from TypeScript schemas and MCP registration metadata.
