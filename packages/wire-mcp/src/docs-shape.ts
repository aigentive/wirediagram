import type { WireDiagram } from "@aigentive/wire-core";

export type WireDocsTopic =
  | "agent"
  | "mcp"
  | "cli"
  | "react"
  | "cloud"
  | "schema"
  | "validation"
  | "examples"
  | "recipes"
  | "skill";

export interface WireDocsShape {
  id: string;
  kind: "guide" | "tooling" | "library" | "contract" | "example-index" | "recipe-index" | "skill";
  summary: string;
  useWhen: string[];
  doNotUseWhen?: string[];
  contracts?: string[];
  preferredPath?: string[];
  avoid?: string[];
  routes?: Array<{ path: string; method?: string; mediaType: string; purpose: string }>;
  tools?: Array<{ name: string; purpose: string; requiredSequence?: string[] }>;
  components?: Array<{ name: string; package: string; purpose: string; contract: string; avoid?: string[] }>;
  validationRules?: Array<{ code: string; severity: "error" | "warning"; repair: string }>;
  examples?: string[];
  recipes?: string[];
  files?: string[];
  related?: string[];
}

export const WIRE_DOCS_VERSION = 1;
export const WIRE_DOCS_UPDATED_AT = "2026-07-04T00:00:00.000Z";

export const LLM_DOCS_ROUTES = [
  { path: "/llm/wire-docs.shape.json", mediaType: "application/json", purpose: "Root machine-readable docs manifest." },
  { path: "/llm/agent-guide.md", mediaType: "text/markdown", purpose: "Prompt-ready operating guide for coding agents." },
  { path: "/llm/mcp.shape.json", mediaType: "application/json", purpose: "MCP tools, resources, and operating sequences." },
  { path: "/llm/cli.shape.json", mediaType: "application/json", purpose: "CLI commands, storage rules, validation, and export workflows." },
  { path: "/llm/react.shape.json", mediaType: "application/json", purpose: "React library build surface and component contracts." },
  { path: "/llm/cloud.shape.json", mediaType: "application/json", purpose: "Wire Cloud auth, API key, share URL, and sync contracts." },
  { path: "/llm/schema/wire-diagram.json", mediaType: "application/schema+json", purpose: "Canonical WireDiagram JSON Schema." },
  { path: "/llm/validation.shape.json", mediaType: "application/json", purpose: "Validation issue codes and repair hints." },
  { path: "/llm/skill.shape.json", mediaType: "application/json", purpose: "SKILL.md location, recipes, and guardrails for agent workflows." },
  { path: "/llm/examples/support-triage.wire.json", mediaType: "application/json", purpose: "Validated support triage diagram." },
  { path: "/llm/examples/approval-flow.wire.json", mediaType: "application/json", purpose: "Validated approval workflow diagram." },
  { path: "/llm/examples/rag-pipeline.wire.json", mediaType: "application/json", purpose: "Validated RAG pipeline diagram." },
  { path: "/llm/examples/mcp-tool-call-flow.wire.json", mediaType: "application/json", purpose: "Validated MCP tool-call loop diagram." },
  { path: "/llm/recipes/create-wire-diagram.json", mediaType: "application/json", purpose: "Recipe for creating canonical WireDiagram JSON." },
  { path: "/llm/recipes/edit-with-wire-actions.json", mediaType: "application/json", purpose: "Recipe for editing diagrams with WireAction batches or MCP apply_actions." },
  { path: "/llm/recipes/validate-and-repair.json", mediaType: "application/json", purpose: "Recipe for validating and repairing generated Wire JSON." },
  { path: "/llm/recipes/render-for-review.json", mediaType: "application/json", purpose: "Recipe for preview, SVG, PNG, JSON, and Mermaid export flows." },
  { path: "/llm/recipes/style-cards-and-edges.json", mediaType: "application/json", purpose: "Recipe for persisted node and edge styling." },
  { path: "/llm/recipes/branch-condition-flow.json", mediaType: "application/json", purpose: "Recipe for condition branches and branch targets." },
  { path: "/llm/recipes/group-nodes.json", mediaType: "application/json", purpose: "Recipe for group nodes and group membership." },
  { path: "/llm/recipes/embed-react-viewer.json", mediaType: "application/json", purpose: "Recipe for embedding WireViewer, WireEditor, or WireWorkspace in React." },
  { path: "/llm/recipes/build-react-workspace.json", mediaType: "application/json", purpose: "Recipe for building with @aigentive/wire-react." },
  { path: "/llm/recipes/connect-local-mcp.json", mediaType: "application/json", purpose: "Recipe for connecting local MCP clients to Wire Cloud." },
  { path: "/llm/recipes/repair-invalid-diagram.json", mediaType: "application/json", purpose: "Recipe for repairing invalid Wire JSON." }
] as const;

export const LLM_AGENT_GUIDE_MD = `# Wire MCP Agent Guide

Wire is an LLM-first workflow diagram system. Always treat Wire JSON as the
source of truth. Humans may use the canvas, but agents should mutate diagrams
through Wire MCP tools or @aigentive/wire-core actions.

## Tool Names

Bare Wire MCP method names are used by this server. Host wrappers may prefix
them:

- Wire MCP bare method: create_diagram
- Server-name prefix when configured as "wire": wire__create_diagram
- Host-style prefix in some MCP runtimes: mcp__wire__create_diagram

Never invent a namespace from this guide name. Use the actual server prefix
provided by the host.

## Fast Path

1. Get docs shape when unsure: v1_get_docs_shape({ task: "<user task>" }).
2. Create or load a diagram.
3. Use apply_actions or WireAction batches for coherent multi-step edits.
4. Run validate after every saved change.
5. Repair validation issues using their stable code and hint.
6. Render for review with render_preview, render_svg, or render_png.

## Canonical Model

Use WireDiagram JSON:
- version: positive integer, currently 1
- layout: LR, TB, RL, or BT
- nodes: array of nodes with id, kind, title
- edges: array of explicit edges when labels, handles, style, routing, or stable edge ids are needed

Node kinds:
trigger, action, ai, tool, condition, human, memory, retrieval, guardrail, end,
note, group.

Use node.from for ordinary connections. Use "conditionId.branch" for condition
branches. Do not invent connectsTo, next, source, target, type, label-only
Mermaid, or adapter JSON as the primary contract.

Durable edits use WireAction reducer objects:
diagram.create, diagram.replace, diagram.patch, batch, node.add, node.patch,
node.remove, node.move, node.resize, edge.connect, edge.patch,
edge.disconnect, edge.remove, layout.apply, group.add, group.ungroup,
note.add, and metadata.patch. Do not introduce alternate versioned action
names or generic graph node/edge state as the app contract.

## Cards and Visual Content

Every non-group workflow node renders as a card in React and in static/share
exports. Pick the card kind with node.kind, then put the visible card header in
title and body copy in description. Use kind-specific fields for semantics:
- tool cards: kind="tool", title names the tool action, ref stores the MCP/tool/function name.
- ai cards: kind="ai", model and prompt are optional details.
- condition cards: kind="condition", branches declares the outgoing branch names.

Use node.data.card only for extra serializable card content: title,
description, badges, meta, progress, and footer. Do not emit HTML/SVG/React
components in data.card. Do not create separate "card" nodes; create workflow
nodes and let Wire render them as cards.

Put card visual styling in node.tone and node.style, not in CSS or data.card.
Use node.style.fill, stroke, strokeWidth, borderRadius, shadow, opacity, and
textColor only when the diagram needs explicit visual overrides.

## Wiring Rules

Wire direction is target-centric. To connect A -> B, set B.from = "A". For a
condition branch, set the target's from to "conditionId.branch" and ensure the
branch exists in the condition node's branches array. Use explicit edges only
for labels, custom handles, edge styles, routing, or stable edge ids. Never
create the same connection in both node.from and edges[].

## Tool Selection

- create_diagram: create empty or template-backed diagrams.
- load_diagram/get_diagram_json: read canonical JSON.
- apply_actions: preferred for multi-node or multi-edge edits.
- add_node/update_node/remove_node: direct single-node edits.
- connect/disconnect/update_edge/remove_edge: direct edge edits.
- validate: schema and structural checks with repair hints.
- render_preview: browser/share URLs; cloud URLs when WIRE_CLOUD_URL and WIRE_CLOUD_API_KEY are set.
- render_svg/render_png/export_mermaid: raw assets and export formats.
- v1_get_docs_shape: structured docs chunks for agent decisions.

Use explicit edges when labels, branches, handles, style, routing, or stable
edge ids are needed. Explicit edge fields include id, from, to, branch, label,
tone, fromHandle, toHandle, style, labelStyle, routing, and data. Use
update_edge to patch explicit edges.

## React Build Path

Use @aigentive/wire-react. Prefer WireWorkspace for full editors and
WireProvider + WireCanvas for custom shells. Persist the WireDiagram emitted
from onChange. Do not store adapter nodes as application state.

React consumers import @aigentive/wire-react/styles.css for default styling.
They are not required to install or configure Tailwind. Use CSS variables,
colorMode, unstyled, and classNames for product styling boundaries.

## CLI Path

Use @aigentive/wire-cli for local file workflows: wire init, wire add,
wire validate, wire export, and wire ls. Validate before export. CLI diagrams
are JSON files under ./diagrams by default, or WIRE_DIR when configured.

## Skill Path

When this repository is available, read docs/llm/SKILL.md for the compact
agent-oriented operating loop. The skill repeats the guardrails and points to
recipes for create, edit, validate, render, style, branch, group, and embed
workflows.

## Cloud Path

Authenticated users can generate a Wire Cloud API key. Local MCP clients should
start @aigentive/wire-mcp with WIRE_CLOUD_URL and WIRE_CLOUD_API_KEY. Then
list_diagrams, save_diagram, apply_actions, validate, and render_preview operate
against the user's cloud wires.

Authenticated /wires chat is separate from the MCP cloud key. It requires the
user to save an OpenAI API key in the right chat sidebar. The hosted app stores
that key encrypted on the user's account through /api/user/openai-key, and
/api/wires/{id}/chat refuses LLM edits until the key is configured.

## Repair Loop

If a save or validation fails, do not guess from prose. Read the validation code,
repair the exact field, run validate again, then summarize what changed.

## Hosted Persistence Contract

Hosted apps should store canonical Wire JSON, validate before save, and persist
every accepted editor change from onChange. Cloud share links should expose
separate view and edit tokens; view tokens may expose browser, SVG, PNG, JSON,
and Mermaid assets, while edit tokens should only be minted intentionally.
`;

export const WIRE_DOCS_MANIFEST = {
  version: WIRE_DOCS_VERSION,
  product: "wire",
  updatedAt: WIRE_DOCS_UPDATED_AT,
  priority: "LLM accuracy and speed first; human docs mirror this source of truth.",
  discovery: {
    wellKnown: "/.well-known/wire-docs.json",
    llmDocs: "/llm/wire-docs.shape.json",
    agentGuide: "/llm/agent-guide.md",
    schema: "/llm/schema/wire-diagram.json"
  },
  entrypoints: {
    agent: "/llm/agent-guide.md",
    mcp: "/llm/mcp.shape.json",
    cli: "/llm/cli.shape.json",
    react: "/llm/react.shape.json",
    cloud: "/llm/cloud.shape.json",
    schema: "/llm/schema/wire-diagram.json",
    validation: "/llm/validation.shape.json",
    skill: "/llm/skill.shape.json"
  },
  contracts: [
    "wire-diagram",
    "wire-action",
    "wire-validation-result",
    "wire-react-components",
    "wire-mcp-tools",
    "wire-cli-commands",
    "wire-agent-skill",
    "wire-cloud-share-urls"
  ],
  routes: LLM_DOCS_ROUTES
} as const;

export const LLM_DOCS_SHAPES: Record<WireDocsTopic, WireDocsShape> = {
  agent: {
    id: "wire.agent",
    kind: "guide",
    summary: "Prompt-ready operating contract for LLM agents using Wire.",
    useWhen: [
      "starting a new Wire task",
      "choosing between MCP tools, React APIs, or raw JSON",
      "recovering from invalid generated diagrams"
    ],
    preferredPath: [
      "Retrieve v1_get_docs_shape for the task.",
      "Use canonical WireDiagram JSON.",
      "Mutate with MCP tools or WireAction objects.",
      "Validate after each save.",
      "Render or share only after validation succeeds."
    ],
    avoid: [
      "Do not output Mermaid as the canonical artifact.",
      "Do not output adapter JSON as the canonical artifact.",
      "Do not invent node fields such as connectsTo, source, target, next, or type."
    ],
    routes: [
      { path: "/llm/agent-guide.md", mediaType: "text/markdown", purpose: "Prompt-ready agent guide." }
    ],
    related: ["wire.mcp", "wire.cli", "wire.schema", "wire.validation", "wire.skill"]
  },
  mcp: {
    id: "wire.mcp",
    kind: "tooling",
    summary: "MCP server contract for local and cloud-synced Wire agents.",
    useWhen: [
      "an MCP host needs to author or edit wires",
      "an agent needs cloud sync with a user's authenticated account",
      "an agent needs SVG, PNG, preview, JSON, or Mermaid exports"
    ],
    contracts: ["wire-mcp-tools", "wire-cloud-sync", "wire-render-assets"],
    preferredPath: [
      "Install with npx -y @aigentive/wire-mcp@latest.",
      "For cloud sync, set WIRE_CLOUD_URL and WIRE_CLOUD_API_KEY.",
      "Call v1_get_agent_guide or v1_get_docs_shape before diagram work.",
      "Use apply_actions for multi-step edits.",
      "Run validate before render_preview or asset export."
    ],
    avoid: [
      "Do not assume localhost previews work for customers.",
      "Do not use local filesystem storage when WIRE_CLOUD_API_KEY is intended.",
      "Do not skip validate after save_diagram or apply_actions."
    ],
    tools: [
      { name: "v1_get_docs_shape", purpose: "Return structured docs chunks by topic or task.", requiredSequence: ["call before uncertain tasks"] },
      { name: "v1_get_agent_guide", purpose: "Return the compact Markdown operating guide." },
      { name: "v1_get_capabilities", purpose: "Return server/docs/schema versions and implemented vs reserved capabilities." },
      { name: "create_diagram", purpose: "Create a new diagram, optionally from a template." },
      { name: "load_diagram", purpose: "Load a stored diagram by id." },
      { name: "save_diagram", purpose: "Overwrite a diagram after schema parsing." },
      { name: "patch_diagram", purpose: "Patch top-level diagram fields such as title, description, layout, and metadata." },
      { name: "list_diagrams", purpose: "List local or cloud-synced diagrams." },
      { name: "get_diagram_json", purpose: "Read canonical Wire JSON." },
      { name: "add_node", purpose: "Append a node and optionally wire it with from or branch." },
      { name: "update_node", purpose: "Patch fields on an existing node." },
      { name: "remove_node", purpose: "Remove a node and prune references." },
      { name: "move_node", purpose: "Persist manual or editor-driven node position." },
      { name: "resize_node", purpose: "Persist manual or editor-driven node size." },
      { name: "connect", purpose: "Connect two nodes through target from refs or explicit edges." },
      { name: "disconnect", purpose: "Remove connections between two nodes." },
      { name: "update_edge", purpose: "Patch explicit edge labels, handles, style, routing, or data." },
      { name: "remove_edge", purpose: "Remove an explicit edge by id." },
      { name: "add_note", purpose: "Add an annotation note, optionally attached to a node." },
      { name: "set_layout", purpose: "Change layout direction. Engine 'elk' is reserved/not implemented and falls back to dagre with a validation warning." },
      { name: "add_group", purpose: "Add a group node and optionally parent existing children." },
      { name: "ungroup", purpose: "Clear group membership while leaving the group node." },
      { name: "patch_metadata", purpose: "Patch diagram.metadata keys without replacing unrelated metadata." },
      { name: "apply_actions", purpose: "Apply a coherent batch of WireAction mutations." },
      { name: "validate", purpose: "Return validation result with stable codes and repair hints." },
      { name: "render_preview", purpose: "Return cloud share URLs or inline preview URLs." },
      { name: "render_svg", purpose: "Return SVG markup." },
      { name: "render_png", purpose: "Return PNG image data when rasterization is available." },
      { name: "summarize_diagram", purpose: "Return a plain-text summary of counts, triggers, ends, and branches." },
      { name: "export_mermaid", purpose: "Return Mermaid syntax as an export, not source of truth." }
    ],
    routes: [
      { path: "/llm/mcp.shape.json", mediaType: "application/json", purpose: "MCP tool and connection guide." },
      { path: "/llm/recipes/connect-local-mcp.json", mediaType: "application/json", purpose: "Cloud API key setup recipe." }
    ],
    related: ["wire.agent", "wire.cli", "wire.cloud", "wire.validation"]
  },
  cli: {
    id: "wire.cli",
    kind: "tooling",
    summary: "Command-line workflow for local WireDiagram files.",
    useWhen: [
      "a human or agent needs to create diagrams in a local file tree",
      "a CI job needs to validate stored Wire JSON before rendering",
      "a workflow needs SVG, JSON, or Mermaid exports without React"
    ],
    contracts: ["wire-diagram", "wire-cli-commands", "wire-validation-result"],
    preferredPath: [
      "Run npx @aigentive/wire-cli help to inspect implemented commands.",
      "Create diagrams with wire init <id> and optional --template.",
      "Append nodes with wire add <kind> --diagram=<id> --title=<title>.",
      "Use --from=<id> or --from=<id.branch> to wire target-centric connections.",
      "Run wire validate <id> before wire export.",
      "Export SVG, JSON, or Mermaid as derived artifacts, not durable app state."
    ],
    avoid: [
      "Do not expect CLI group editing; use MCP apply_actions or React for group commands.",
      "Do not use Mermaid export as the source of truth.",
      "Do not add --tools to tool nodes; --tools is only meaningful for ai nodes."
    ],
    tools: [
      { name: "wire init", purpose: "Create a new local diagram, optionally from a built-in template." },
      { name: "wire add", purpose: "Append a node and optionally set from, branches, model, tools, ref, body, and tone." },
      { name: "wire validate", purpose: "Run schema and structural validation; exits non-zero for errors." },
      { name: "wire export", purpose: "Export SVG, JSON, or Mermaid from canonical WireDiagram JSON." },
      { name: "wire ls", purpose: "List local diagrams in recency order." }
    ],
    routes: [
      { path: "/llm/cli.shape.json", mediaType: "application/json", purpose: "CLI commands and workflow guardrails." }
    ],
    related: ["wire.agent", "wire.schema", "wire.validation", "wire.recipes"]
  },
  react: {
    id: "wire.react",
    kind: "library",
    summary: "Preferred React integration surface for building Wire editors and viewers.",
    useWhen: [
      "building a Wire UI in a React app",
      "customizing cards, palettes, validation panels, or inspectors",
      "persisting canvas edits to cloud or local state"
    ],
    contracts: ["wire-react-components", "wire-diagram"],
    preferredPath: [
      "Install @aigentive/wire-react with @aigentive/wire-core.",
      "Import @aigentive/wire-react/styles.css for default styles.",
      "Use WireWorkspace for a complete editor.",
      "Use WireProvider + WireCanvas for custom product shells.",
      "Persist the WireDiagram emitted by onChange.",
      "Use WireToolbar, WirePalette, WireInspector, WireOptionPanel, and WireValidationPanel instead of reimplementing standard controls.",
      "Use colorMode, unstyled, classNames, and CSS variables for styling boundaries."
    ],
    avoid: [
      "Do not import a canvas adapter as the app-level contract.",
      "Do not store canvas state as adapter nodes and edges.",
      "Do not bypass WireProvider when edit state, validation, history, or events matter.",
      "Do not require React consumers to install or configure Tailwind."
    ],
    components: [
      {
        name: "WireWorkspace",
        package: "@aigentive/wire-react",
        purpose: "Full editor shell with sidebar, canvas, and inspector slots.",
        contract: "Accepts diagram/defaultDiagram and emits canonical WireDiagram through onChange."
      },
      {
        name: "WireEditor",
        package: "@aigentive/wire-react",
        purpose: "Packaged editor entry point for embedding an editable Wire surface.",
        contract: "Uses canonical WireDiagram input/output; does not expose adapter state as the app contract."
      },
      {
        name: "WireViewer",
        package: "@aigentive/wire-react",
        purpose: "Read-only diagram viewer for embeds and previews.",
        contract: "Renders canonical WireDiagram JSON and keeps Mermaid/SVG/PNG as exports."
      },
      {
        name: "WireProvider",
        package: "@aigentive/wire-react",
        purpose: "Owns diagram state, validation, events, and actions for child components.",
        contract: "Use around WireCanvas and controls when composing a custom UI."
      },
      {
        name: "WireCanvas",
        package: "@aigentive/wire-react",
        purpose: "Renders and edits the Wire diagram canvas.",
        contract: "Consumes WireProvider state; accepts mode, fitView, showMiniMap, renderNodeCard, renderGroup."
      },
      {
        name: "WireInspector",
        package: "@aigentive/wire-react",
        purpose: "Selection inspector for node and edge fields.",
        contract: "Emits WireAction-compatible patches through the provider state boundary."
      },
      {
        name: "WireOptionSpec",
        package: "@aigentive/wire-react",
        purpose: "Schema for catalog-driven option controls.",
        contract: "Runtime UI specification; persisted values still live on WireDiagram nodes, edges, data, or metadata."
      },
      {
        name: "WireOptionCatalog",
        package: "@aigentive/wire-react",
        purpose: "Collection of WireOptionSpec entries keyed by node kind or option scope.",
        contract: "Application-provided runtime catalog; do not persist the catalog itself inside WireDiagram."
      },
      {
        name: "WireOptionPanel",
        package: "@aigentive/wire-react",
        purpose: "Default renderer for WireOptionCatalog controls.",
        contract: "Writes selected values back through canonical diagram patches."
      },
      {
        name: "WireNodeCardView",
        package: "@aigentive/wire-react",
        purpose: "Default node-card renderer that can be wrapped or replaced.",
        contract: "Use for custom card composition while preserving Wire node semantics."
      }
    ],
    routes: [
      { path: "/llm/react.shape.json", mediaType: "application/json", purpose: "React build contract." },
      { path: "/llm/recipes/build-react-workspace.json", mediaType: "application/json", purpose: "Fast React implementation recipe." }
    ],
    related: ["wire.schema", "wire.examples", "wire.validation"]
  },
  cloud: {
    id: "wire.cloud",
    kind: "contract",
    summary: "Wire Cloud persistence, API key, hosted chat key, and share URL contract.",
    useWhen: [
      "connecting local MCP to an authenticated cloud account",
      "syncing local CLI/agent wires to Wire Cloud",
      "configuring authenticated /wires chat LLM access",
      "sharing diagrams as view, SVG, PNG, JSON, Mermaid, or edit links"
    ],
    contracts: ["wire-cloud-api-key", "wire-hosted-chat-openai-key", "wire-cloud-share-urls", "wire-cloud-sync"],
    preferredPath: [
      "User signs into Wire Cloud with Google.",
      "User generates an API key from the Connect local MCP modal.",
      "Local MCP starts with WIRE_CLOUD_URL and WIRE_CLOUD_API_KEY.",
      "MCP storage resolves through CloudStorage.",
      "render_preview mints cloud share URLs instead of localhost links.",
      "For /wires chat, user saves an OpenAI API key in the right chat sidebar before sending LLM edits.",
      "/api/wires/{id}/chat requires that stored OpenAI key and returns code openai-key-required until configured."
    ],
    avoid: [
      "Do not expose private edit tokens when read-only sharing is intended.",
      "Do not tell customers to run local preview servers for shared previews.",
      "Do not store the generated Wire Cloud API key in docs, screenshots, or committed files.",
      "Do not commit OpenAI API keys or use the Wire Cloud API key as the OpenAI chat key."
    ],
    routes: [
      { path: "/api/user/openai-key", method: "GET/POST/DELETE", mediaType: "application/json", purpose: "Read metadata, save, or delete the authenticated user's encrypted OpenAI chat key." },
      { path: "/api/wires/{id}/chat", method: "POST", mediaType: "application/json", purpose: "Run authenticated /wires LLM edits; requires a stored OpenAI key." },
      { path: "/api/cloud/me", method: "GET", mediaType: "application/json", purpose: "API key auth smoke test." },
      { path: "/api/cloud/wires", method: "GET/POST", mediaType: "application/json", purpose: "List or create authenticated user wires." },
      { path: "/api/cloud/wires/{id}", method: "GET/PATCH/PUT/DELETE", mediaType: "application/json", purpose: "Read and mutate a cloud wire." },
      { path: "/api/cloud/wires/{id}/share", method: "POST", mediaType: "application/json", purpose: "Mint token-scoped share URLs." }
    ],
    related: ["wire.mcp", "wire.agent"]
  },
  schema: {
    id: "wire.schema",
    kind: "contract",
    summary: "Canonical WireDiagram JSON contract.",
    useWhen: [
      "generating or repairing a diagram",
      "building persistence around Wire",
      "writing validators, migrations, or adapters"
    ],
    contracts: ["wire-diagram", "wire-node", "wire-edge"],
    preferredPath: [
      "Use version: 1.",
      "Use layout LR/TB/RL/BT.",
      "Every node needs id, kind, and title.",
      "Every workflow node renders as a card; use title and description for the card content.",
      "Use node.from for ordinary connections.",
      "Use explicit edges only when edge metadata is required.",
      "Condition branches must be declared on the condition node.",
      "Use node.data.card only for extra badges, meta rows, progress, or footer.",
      "Use node.tone and node.style for persisted card visual style."
    ],
    avoid: [
      "Do not use null for from; omit the field instead.",
      "Do not put dots or spaces in ids.",
      "Do not use uppercase node kinds."
    ],
    routes: [
      { path: "/llm/schema/wire-diagram.json", mediaType: "application/schema+json", purpose: "JSON Schema derived from wire-core Zod schema." }
    ],
    related: ["wire.validation", "wire.examples"]
  },
  validation: {
    id: "wire.validation",
    kind: "contract",
    summary: "Validation codes and repair hints for Wire diagrams.",
    useWhen: [
      "MCP save or validate returns errors",
      "a generated graph fails schema parsing",
      "an agent must recover quickly without human debugging"
    ],
    preferredPath: [
      "Match on the stable issue code.",
      "Apply the repair hint to canonical Wire JSON.",
      "Run validate again.",
      "Only render/share after errors are gone."
    ],
    validationRules: [
      { code: "schema.invalid_type", severity: "error", repair: "Fix the field at the issue path. For missing node.title, add a non-empty title string." },
      { code: "schema.invalid_union_discriminator", severity: "error", repair: "Use one of the supported lowercase node kinds." },
      { code: "node.duplicate-id", severity: "error", repair: "Rename one node and update from, parent, children, and edge references." },
      { code: "node.attached-to-missing", severity: "error", repair: "Add the referenced node or remove attachedTo from the note or annotation node." },
      { code: "node.parent-missing", severity: "error", repair: "Create the referenced group node or remove the parent field." },
      { code: "node.parent-not-group", severity: "error", repair: "Point parent at a group node or clear the parent field." },
      { code: "condition.no-branches", severity: "error", repair: "Add a non-empty branches array to the condition node." },
      { code: "condition.duplicate-branch", severity: "error", repair: "Make branch names unique within the condition node." },
      { code: "edge.from-missing", severity: "error", repair: "Add the source node or update the from reference." },
      { code: "edge.to-missing", severity: "error", repair: "Add the target node or update the explicit edge target." },
      { code: "edge.branch-from-non-condition", severity: "error", repair: "Remove the branch suffix or change the source node to a condition." },
      { code: "edge.unknown-branch", severity: "error", repair: "Add the branch to the condition node or use a known branch name." },
      { code: "edge.duplicate-connection", severity: "error", repair: "Keep one connection and remove the duplicate from ref or explicit edge." },
      { code: "group.child-missing", severity: "error", repair: "Add the missing child node or remove it from group.children." },
      { code: "flow.no-trigger", severity: "warning", repair: "Add a trigger node or confirm the diagram intentionally starts elsewhere." },
      { code: "trigger.no-outgoing", severity: "warning", repair: "Connect the trigger to the first workflow step." },
      { code: "end.no-incoming", severity: "warning", repair: "Connect a preceding workflow step to the end node." },
      { code: "condition.unused-branch", severity: "warning", repair: "Add a target node with from '<conditionId>.<branch>' or remove the unused branch." },
      { code: "flow.unreachable", severity: "warning", repair: "Wire the node into a path from a trigger or add a trigger for that branch." },
      { code: "node.card-invalid", severity: "warning", repair: "Keep data.card serializable and limited to title, description, badges, meta, progress, and footer." },
      { code: "node.forbidden-field", severity: "warning", repair: "Replace connectsTo/connects_to with from on the target node." },
      { code: "node.duplicate-from", severity: "warning", repair: "Remove repeated refs from the same node.from array." },
      { code: "node.orphan", severity: "warning", repair: "Connect the node with from or confirm it should stay isolated." },
      { code: "edge.self-loop", severity: "warning", repair: "Remove the self reference or document why the loop is intentional." },
      { code: "flow.cycle", severity: "warning", repair: "Break the loop or add a guard that explains the repeated path." },
      { code: "flow.layout-engine-not-implemented", severity: "warning", repair: "Use dagre or omit layoutEngine until elk is implemented." },
      { code: "group.child-parent-mismatch", severity: "warning", repair: "Set the child's parent to the group id or remove it from group.children." }
    ],
    routes: [
      { path: "/llm/validation.shape.json", mediaType: "application/json", purpose: "Validation repair map." },
      { path: "/llm/recipes/repair-invalid-diagram.json", mediaType: "application/json", purpose: "Repair loop recipe." }
    ],
    related: ["wire.schema", "wire.mcp"]
  },
  examples: {
    id: "wire.examples",
    kind: "example-index",
    summary: "Small validated diagrams safe for agents to copy and modify.",
    useWhen: [
      "the agent needs a known-valid diagram starting point",
      "the user asks for examples",
      "testing render, validation, and import flows"
    ],
    examples: [
      "support-triage",
      "approval-flow",
      "rag-pipeline",
      "mcp-tool-call-flow"
    ],
    routes: [
      { path: "/llm/examples/{name}.wire.json", mediaType: "application/json", purpose: "Validated WireDiagram examples." }
    ],
    related: ["wire.schema", "wire.react"]
  },
  recipes: {
    id: "wire.recipes",
    kind: "recipe-index",
    summary: "Task-oriented recipes optimized for LLM retrieval.",
    useWhen: [
      "the user asks how to build or connect something",
      "an agent needs a short deterministic path",
      "docs retrieval needs a compact task answer"
    ],
    recipes: [
      "create-wire-diagram",
      "edit-with-wire-actions",
      "validate-and-repair",
      "render-for-review",
      "style-cards-and-edges",
      "branch-condition-flow",
      "group-nodes",
      "embed-react-viewer",
      "build-react-workspace",
      "connect-local-mcp",
      "repair-invalid-diagram"
    ],
    routes: [
      { path: "/llm/recipes/{id}.json", mediaType: "application/json", purpose: "Task recipes for agents." }
    ],
    related: ["wire.agent", "wire.mcp", "wire.cli", "wire.react", "wire.cloud", "wire.skill"]
  },
  skill: {
    id: "wire.skill",
    kind: "skill",
    summary: "Agent-oriented SKILL.md for fast Wire diagram creation, editing, validation, rendering, styling, branching, grouping, and React embedding.",
    useWhen: [
      "an LLM agent is operating inside this repository",
      "an agent needs compact guardrails before editing Wire JSON",
      "a workflow needs prompt-ready recipes without scraping human docs"
    ],
    contracts: ["wire-diagram", "wire-action", "wire-agent-skill"],
    preferredPath: [
      "Read docs/llm/SKILL.md when available.",
      "Use /llm/wire-docs.shape.json or v1_get_docs_shape for structured retrieval.",
      "Use /llm/schema/wire-diagram.json before raw JSON generation.",
      "Use /llm/recipes/{id}.json for task-specific execution.",
      "Keep WireDiagram and WireAction as durable contracts."
    ],
    avoid: [
      "Do not introduce V2, Next, Pro, alternate package names, or parallel public APIs.",
      "Do not make generic graph node/edge objects the app contract.",
      "Do not cite unrelated external inspiration as implementation guidance."
    ],
    files: ["docs/llm/SKILL.md"],
    recipes: [
      "create-wire-diagram",
      "edit-with-wire-actions",
      "validate-and-repair",
      "render-for-review",
      "style-cards-and-edges",
      "branch-condition-flow",
      "group-nodes",
      "embed-react-viewer"
    ],
    routes: [
      { path: "/llm/skill.shape.json", mediaType: "application/json", purpose: "SKILL.md location, recipes, and guardrails." }
    ],
    related: ["wire.agent", "wire.schema", "wire.validation", "wire.recipes"]
  }
};

export const LLM_DOCS_EXAMPLES = {
  "support-triage": {
    version: 1,
    id: "support-triage",
    title: "AI support triage",
    layout: "LR",
    nodes: [
      { id: "ticket", kind: "trigger", title: "New support request", description: "Customer opens a ticket." },
      { id: "classify", kind: "ai", title: "Classify intent", description: "Detect product area, urgency, and sentiment.", from: "ticket" },
      { id: "retrieve", kind: "retrieval", title: "Retrieve context", description: "Pull account, docs, and similar tickets.", from: "classify" },
      { id: "draft", kind: "ai", title: "Draft response", description: "Prepare a concise answer with citations.", from: "retrieve" },
      { id: "needs-review", kind: "condition", title: "Needs human review?", branches: ["yes", "no"], from: "draft" },
      { id: "agent-review", kind: "human", title: "Agent review", description: "Support agent edits or approves.", from: "needs-review.yes" },
      { id: "send", kind: "action", title: "Send reply", description: "Deliver final reply to customer.", from: ["needs-review.no", "agent-review"] },
      { id: "closed", kind: "end", title: "Close ticket", description: "Mark resolved.", from: "send" }
    ],
    edges: []
  },
  "approval-flow": {
    version: 1,
    id: "approval-flow",
    title: "Estimate approval flow",
    layout: "LR",
    nodes: [
      { id: "submitted", kind: "trigger", title: "Estimate submitted", description: "A customer receives an estimate." },
      { id: "wait", kind: "human", title: "Wait for response", description: "Customer reviews the estimate.", from: "submitted" },
      { id: "responded", kind: "condition", title: "Response received?", branches: ["accepted", "declined", "no_response"], from: "wait" },
      { id: "schedule", kind: "action", title: "Schedule work", from: "responded.accepted" },
      { id: "revise", kind: "action", title: "Create revision task", from: "responded.declined" },
      { id: "follow-up", kind: "action", title: "Send follow-up", from: "responded.no_response" },
      { id: "done", kind: "end", title: "Approved", from: "schedule" },
      { id: "revision", kind: "end", title: "Revision needed", from: "revise" },
      { id: "pending", kind: "end", title: "Pending response", from: "follow-up" }
    ],
    edges: []
  },
  "rag-pipeline": {
    version: 1,
    id: "rag-pipeline",
    title: "RAG answer pipeline",
    layout: "LR",
    nodes: [
      { id: "question", kind: "trigger", title: "User question" },
      { id: "rewrite", kind: "ai", title: "Rewrite query", description: "Normalize intent and constraints.", from: "question" },
      { id: "search", kind: "retrieval", title: "Vector search", description: "Retrieve candidate passages.", from: "rewrite" },
      { id: "filter", kind: "guardrail", title: "Filter unsafe context", description: "Remove irrelevant or unsafe passages.", from: "search" },
      { id: "answer", kind: "ai", title: "Compose answer", description: "Answer using retrieved context.", from: "filter" },
      { id: "check", kind: "condition", title: "Confident?", branches: ["yes", "no"], from: "answer" },
      { id: "final", kind: "end", title: "Return answer", from: "check.yes" },
      { id: "handoff", kind: "human", title: "Escalate for review", from: "check.no" },
      { id: "reviewed", kind: "end", title: "Return reviewed answer", from: "handoff" }
    ],
    edges: []
  },
  "mcp-tool-call-flow": {
    version: 1,
    id: "mcp-tool-call-flow",
    title: "MCP tool call flow",
    layout: "LR",
    nodes: [
      { id: "prompt", kind: "trigger", title: "User prompt" },
      { id: "guide", kind: "tool", title: "Read docs shape", description: "Call v1_get_docs_shape for task context.", from: "prompt", ref: "v1_get_docs_shape" },
      { id: "plan", kind: "ai", title: "Plan actions", description: "Choose WireAction sequence.", from: "guide" },
      { id: "mutate", kind: "tool", title: "Apply actions", description: "Apply atomic diagram edit.", from: "plan", ref: "apply_actions" },
      { id: "validate", kind: "tool", title: "Validate diagram", description: "Return stable issue codes and hints.", from: "mutate", ref: "validate" },
      { id: "valid", kind: "condition", title: "Valid?", branches: ["yes", "no"], from: "validate" },
      { id: "repair", kind: "ai", title: "Repair JSON", description: "Use issue code and hint.", from: "valid.no" },
      { id: "preview", kind: "tool", title: "Render preview", description: "Mint share or inline preview URL.", from: "valid.yes", ref: "render_preview" },
      { id: "complete", kind: "end", title: "Report result", from: "preview" }
    ],
    edges: [
      { id: "repair-loop", from: "repair", to: "mutate", label: "retry", routing: "smoothstep" }
    ]
  }
} satisfies Record<string, WireDiagram>;

export const LLM_DOCS_RECIPES = {
  "create-wire-diagram": {
    id: "recipe.create-wire-diagram",
    goal: "Create a canonical WireDiagram from a prompt or blank start.",
    readFirst: ["/llm/schema/wire-diagram.json", "/llm/validation.shape.json"],
    preferredPath: [
      "Choose a slug-like diagram id and layout LR, TB, RL, or BT.",
      "Create nodes with id, kind, and title.",
      "Set description for visible card body copy.",
      "Wire ordinary connections by setting from on the target node.",
      "Use explicit edges only for labels, handles, edge style, routing, or stable edge ids.",
      "Run validate before rendering or sharing."
    ],
    minimalJson: {
      version: 1,
      id: "support-flow",
      title: "Support flow",
      layout: "LR",
      nodes: [
        { id: "ticket", kind: "trigger", title: "New ticket" },
        { id: "classify", kind: "ai", title: "Classify intent", from: "ticket" },
        { id: "resolve", kind: "action", title: "Resolve request", from: "classify", tone: "success" }
      ],
      edges: []
    },
    mcpPath: [
      "create_diagram({ id, title, layout })",
      "apply_actions({ diagramId, actions: [{ type: 'node.add', node }, ...] })",
      "validate({ diagramId })"
    ],
    cliPath: [
      "wire init support-flow --title=\"Support flow\"",
      "wire add trigger --diagram=support-flow --id=ticket --title=\"New ticket\"",
      "wire add ai --diagram=support-flow --id=classify --title=\"Classify intent\" --from=ticket",
      "wire validate support-flow"
    ],
    avoid: [
      "Do not create generic graph node/edge objects as durable state.",
      "Do not invent source, target, next, connectsTo, or uppercase kinds.",
      "Do not output Mermaid as the primary artifact."
    ]
  },
  "edit-with-wire-actions": {
    id: "recipe.edit-with-wire-actions",
    goal: "Edit an existing diagram with canonical WireAction batches.",
    readFirst: ["/llm/mcp.shape.json", "/llm/schema/wire-diagram.json"],
    preferredPath: [
      "Load the current WireDiagram first.",
      "Group related edits into a single batch action or MCP apply_actions call.",
      "Use node.patch for field updates and node.add for new workflow steps.",
      "Use edge.connect only when adding a connection, and prefer target from refs unless edge metadata is required.",
      "Check changedNodeIds, changedEdgeIds, and validation from apply_actions.",
      "Repair validation issues before additional rendering."
    ],
    actionBatch: [
      { type: "node.add", node: { id: "review", kind: "human", title: "Review reply", from: "draft" } },
      { type: "node.patch", id: "send", patch: { from: "review" } }
    ],
    mcpPath: [
      "get_diagram_json({ diagramId })",
      "apply_actions({ diagramId, actions })",
      "validate({ diagramId })"
    ],
    avoid: [
      "Do not rewrite the whole diagram for a small edit unless replacement is the intended operation.",
      "Do not create duplicate connections through both from and edges[].",
      "Do not introduce versioned action names."
    ]
  },
  "validate-and-repair": {
    id: "recipe.validate-and-repair",
    goal: "Validate a diagram and repair issues using stable codes and hints.",
    readFirst: ["/llm/validation.shape.json", "/llm/schema/wire-diagram.json"],
    preferredPath: [
      "Run validate through MCP, CLI, or wire-core.",
      "Treat error severity as blocking for save/share workflows.",
      "Match the issue code and apply the smallest canonical JSON repair.",
      "Run validate again after every repair pass.",
      "Continue only when no validation errors remain."
    ],
    commonRepairs: [
      "schema.invalid_union_discriminator -> use supported lowercase node kinds.",
      "edge.from-missing -> add the source node or change the target node's from.",
      "edge.unknown-branch -> add the branch to the condition node or use a declared branch.",
      "node.forbidden-field -> move source/target/next/connectsTo intent into target from refs.",
      "group.child-parent-mismatch -> align group.children and child.parent."
    ],
    mcpPath: [
      "validate({ diagramId })",
      "apply_actions({ diagramId, actions: repairs })",
      "validate({ diagramId })"
    ],
    cliPath: ["wire validate <id>"],
    avoid: [
      "Do not ignore warnings that explain lost or stripped generated fields.",
      "Do not repair by converting to Mermaid.",
      "Do not render/share while errors remain."
    ]
  },
  "render-for-review": {
    id: "recipe.render-for-review",
    goal: "Render or export a validated diagram for human review.",
    readFirst: ["/llm/mcp.shape.json", "/llm/cli.shape.json"],
    preferredPath: [
      "Validate the diagram first.",
      "Use render_preview for browser or cloud share review.",
      "Use render_svg for embeddable vector output.",
      "Use render_png when raster output is required and the rasterizer is installed.",
      "Use export_mermaid or wire export --format=mermaid only as a derived export.",
      "Use get_diagram_json or wire export --format=json for canonical JSON handoff."
    ],
    mcpPath: [
      "validate({ diagramId })",
      "render_preview({ diagramId, scope: 'view' })",
      "render_svg({ diagramId })"
    ],
    cliPath: [
      "wire validate <id>",
      "wire export <id> --format=svg --out=<id>.svg",
      "wire export <id> --format=json --out=<id>.json"
    ],
    avoid: [
      "Do not use localhost preview URLs for customer-facing cloud shares.",
      "Do not treat SVG, PNG, or Mermaid exports as editable source."
    ]
  },
  "style-cards-and-edges": {
    id: "recipe.style-cards-and-edges",
    goal: "Persist visual styling without leaving the WireDiagram contract.",
    readFirst: ["/llm/schema/wire-diagram.json", "/llm/react.shape.json"],
    preferredPath: [
      "Use node.tone for common semantic color.",
      "Use node.style.fill, stroke, strokeWidth, strokeDasharray, borderRadius, opacity, shadow, and textColor for explicit card overrides.",
      "Use node.data.card only for serializable card content: title, description, badges, meta, progress, and footer.",
      "Use explicit edges when edge labels, edge tone, handles, style, labelStyle, or routing must persist.",
      "Use React CSS variables, colorMode, unstyled, and classNames for host app styling boundaries."
    ],
    nodePatch: {
      tone: "info",
      style: { fill: "#eef6ff", stroke: "#2563eb", borderRadius: 8, shadow: true },
      data: { card: { badges: [{ label: "SLA", tone: "info" }], footer: "Auto-routed" } }
    },
    edgePatch: {
      label: "approved",
      routing: "smoothstep",
      style: { stroke: "#16a34a", strokeWidth: 2, markerEnd: "arrow" },
      labelStyle: { background: "#ecfdf5", fill: "#166534" }
    },
    avoid: [
      "Do not store React components, HTML, SVG, or CSS in data.card.",
      "Do not require consumer Tailwind configuration for @aigentive/wire-react.",
      "Do not create separate card nodes for workflow cards."
    ]
  },
  "branch-condition-flow": {
    id: "recipe.branch-condition-flow",
    goal: "Create or repair condition branches.",
    readFirst: ["/llm/schema/wire-diagram.json", "/llm/validation.shape.json"],
    preferredPath: [
      "Create a condition node with branches: ['yes', 'no'] or domain-specific slug names.",
      "Connect each branch target by setting target.from to '<conditionId>.<branch>'.",
      "Use MCP add_node with from plus branch, or pass the full branched ref directly.",
      "Validate for edge.unknown-branch and condition.unused-branch.",
      "Use explicit edge labels only when the visual label needs to differ from branch names."
    ],
    minimalJsonNodes: [
      { id: "route", kind: "condition", title: "Route?", branches: ["sales", "support"], from: "classify" },
      { id: "sales", kind: "action", title: "Create sales lead", from: "route.sales" },
      { id: "support", kind: "action", title: "Open support ticket", from: "route.support" }
    ],
    avoid: [
      "Do not set branch targets with source/target fields on nodes.",
      "Do not use branch names that are absent from the condition branches array.",
      "Do not put dots or spaces in branch names."
    ]
  },
  "group-nodes": {
    id: "recipe.group-nodes",
    goal: "Group existing nodes while keeping group membership valid.",
    readFirst: ["/llm/schema/wire-diagram.json", "/llm/validation.shape.json"],
    preferredPath: [
      "Use a group node when nodes need a visible parent frame.",
      "Set the group node's children array to child ids.",
      "Set each child node parent to the group id.",
      "Use MCP add_group for existing children when available.",
      "Validate for group.child-missing and group.child-parent-mismatch."
    ],
    actionBatch: [
      { type: "group.add", group: { id: "knowledge", kind: "group", title: "Knowledge retrieval" }, children: ["rewrite", "search", "filter"] }
    ],
    avoid: [
      "Do not use groups for ordinary control-flow edges.",
      "Do not list missing child ids.",
      "Do not forget parent on grouped child nodes when editing raw JSON."
    ]
  },
  "embed-react-viewer": {
    id: "recipe.embed-react-viewer",
    goal: "Embed Wire diagrams in a React app with current package APIs.",
    readFirst: ["/llm/react.shape.json", "/llm/schema/wire-diagram.json"],
    preferredPath: [
      "Install @aigentive/wire-react and @aigentive/wire-core.",
      "Import @aigentive/wire-react/styles.css once in the app entry.",
      "Use WireViewer for read-only embeds.",
      "Use WireEditor or WireWorkspace for editable embeds.",
      "Use WireProvider + WireCanvas for custom shells.",
      "Persist only WireDiagram from onChange."
    ],
    minimalCode: [
      "import '@aigentive/wire-react/styles.css';",
      "import { WireViewer } from '@aigentive/wire-react';",
      "<WireViewer diagram={diagram} colorMode=\"system\" />"
    ],
    styleControls: ["colorMode", "unstyled", "classNames", "CSS variables"],
    avoid: [
      "Do not require Tailwind in the consuming React app.",
      "Do not store canvas adapter nodes or edges as application state.",
      "Do not rename the package or introduce a parallel React API."
    ]
  },
  "build-react-workspace": {
    id: "recipe.build-react-workspace",
    goal: "Build a Wire editor or viewer in React using the Wire library surface.",
    readFirst: ["/llm/react.shape.json", "/llm/schema/wire-diagram.json"],
    preferredPath: [
      "Import WireWorkspace for a complete editor shell when product chrome is not custom.",
      "For custom shells, wrap controls in WireProvider and render WireCanvas.",
      "Keep WireDiagram as application state and persistence payload.",
      "Pass onChange to save accepted diagram updates.",
      "Use WireValidationPanel or validate() output for repair UI."
    ],
    minimalCode: [
      "import { WireWorkspace } from '@aigentive/wire-react';",
      "<WireWorkspace diagram={diagram} onChange={(next) => setDiagram(next)} />"
    ],
    avoid: [
      "Do not import a canvas adapter directly for app state.",
      "Do not persist adapter nodes.",
      "Do not invent connectsTo or next fields."
    ]
  },
  "connect-local-mcp": {
    id: "recipe.connect-local-mcp",
    goal: "Connect a local MCP client to an authenticated Wire Cloud account.",
    readFirst: ["/llm/mcp.shape.json", "/llm/cloud.shape.json"],
    preferredPath: [
      "Sign into Wire Cloud.",
      "Open Connect local MCP.",
      "Generate an API key and copy it once.",
      "Configure the MCP client with WIRE_CLOUD_URL and WIRE_CLOUD_API_KEY.",
      "Run list_diagrams to confirm cloud sync.",
      "Use render_preview for cloud URLs instead of localhost preview links."
    ],
    stdioCommand: "npx -y @aigentive/wire-mcp@latest",
    mcpJson: {
      mcpServers: {
        wire: {
          command: "npx",
          args: ["-y", "@aigentive/wire-mcp@latest"],
          env: {
            WIRE_CLOUD_URL: "https://wire.example.com",
            WIRE_CLOUD_API_KEY: "PASTE_GENERATED_KEY"
          }
        }
      }
    },
    smokeTest: "curl -sS 'https://wire.example.com/api/cloud/me' -H 'Authorization: Bearer PASTE_GENERATED_KEY'"
  },
  "repair-invalid-diagram": {
    id: "recipe.repair-invalid-diagram",
    goal: "Repair invalid generated Wire JSON quickly.",
    readFirst: ["/llm/validation.shape.json", "/llm/schema/wire-diagram.json"],
    preferredPath: [
      "Read the validation issue path and code.",
      "Fix only the failing field first.",
      "For invalid node kind, use lowercase supported kinds.",
      "For missing title, add a short non-empty title.",
      "For null from, omit from or set it to a source id string.",
      "Run validate again before rendering."
    ],
    avoid: [
      "Do not regenerate the whole graph unless the errors are systemic.",
      "Do not repair by converting to Mermaid.",
      "Do not continue to render/share while validation errors remain."
    ]
  }
} as const;

const TASK_HINTS: Record<WireDocsTopic, string[]> = {
  agent: ["agent", "llm", "prompt", "guide", "workflow"],
  mcp: ["mcp", "host", "tool", "stdio", "http", "npx"],
  cli: ["cli", "command", "terminal", "wire init", "wire add", "wire export"],
  react: ["react", "next", "component", "canvas", "editor", "viewer", "workspace", "library"],
  cloud: ["cloud", "api key", "auth", "google", "share", "preview", "sync", "vercel", "openai", "chat"],
  schema: ["schema", "json", "diagram", "node", "edge", "wirediagram"],
  validation: ["validate", "invalid", "error", "repair", "zod", "missing", "duplicate"],
  examples: ["example", "sample", "template", "support", "approval", "rag"],
  recipes: ["how to", "setup", "connect", "build", "recipe"],
  skill: ["skill", "skill.md", "guardrail", "agent-oriented"]
};

export function listLlmDocsExamples(): string[] {
  return Object.keys(LLM_DOCS_EXAMPLES).sort();
}

export function listLlmDocsRecipes(): string[] {
  return Object.keys(LLM_DOCS_RECIPES).sort();
}

export function getLlmDocsExample(name: string): WireDiagram | undefined {
  return LLM_DOCS_EXAMPLES[stripKnownSuffix(name, ".wire.json") as keyof typeof LLM_DOCS_EXAMPLES];
}

export function getLlmDocsRecipe(id: string): unknown | undefined {
  return LLM_DOCS_RECIPES[stripKnownSuffix(id, ".json") as keyof typeof LLM_DOCS_RECIPES];
}

export function getLlmDocsShape(input: { topic?: string; task?: string } = {}): {
  manifest: typeof WIRE_DOCS_MANIFEST;
  topics: WireDocsShape[];
  examples: string[];
  recipes: string[];
} {
  const topics = resolveTopics(input.topic, input.task);
  return {
    manifest: WIRE_DOCS_MANIFEST,
    topics: topics.map((topic) => LLM_DOCS_SHAPES[topic]),
    examples: listLlmDocsExamples(),
    recipes: listLlmDocsRecipes()
  };
}

export function getLlmDocsTopic(name: string): WireDocsShape | undefined {
  return LLM_DOCS_SHAPES[stripKnownSuffix(name, ".shape.json") as WireDocsTopic];
}

function resolveTopics(topic?: string, task?: string): WireDocsTopic[] {
  const explicit = normalizeTopic(topic);
  if (explicit) return [explicit];

  const haystack = (task ?? "").toLowerCase();
  if (!haystack) return ["agent", "mcp", "schema", "validation"];

  const matched = new Set<WireDocsTopic>(["agent"]);
  for (const [candidate, hints] of Object.entries(TASK_HINTS) as Array<[WireDocsTopic, string[]]>) {
    if (hints.some((hint) => haystack.includes(hint))) matched.add(candidate);
  }
  if (matched.size === 1) {
    matched.add("schema");
    matched.add("validation");
  }
  return [...matched];
}

function normalizeTopic(topic?: string): WireDocsTopic | undefined {
  if (!topic) return undefined;
  const normalized = topic.toLowerCase().replace(/^wire[._/-]/, "").replace(/\.shape\.json$/, "");
  return normalized in LLM_DOCS_SHAPES ? normalized as WireDocsTopic : undefined;
}

function stripKnownSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}
