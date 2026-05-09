import type { WireDiagram } from "@aigentive/wire-core";

export type WireDocsTopic =
  | "agent"
  | "mcp"
  | "react"
  | "cloud"
  | "schema"
  | "validation"
  | "examples"
  | "recipes";

export interface WireDocsShape {
  id: string;
  kind: "guide" | "tooling" | "library" | "contract" | "example-index" | "recipe-index";
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
  related?: string[];
}

export const WIRE_DOCS_VERSION = 1;
export const WIRE_DOCS_UPDATED_AT = "2026-05-10T00:00:00.000Z";

export const LLM_DOCS_ROUTES = [
  { path: "/llm/wire-docs.shape.json", mediaType: "application/json", purpose: "Root machine-readable docs manifest." },
  { path: "/llm/agent-guide.md", mediaType: "text/markdown", purpose: "Prompt-ready operating guide for coding agents." },
  { path: "/llm/mcp.shape.json", mediaType: "application/json", purpose: "MCP tools, resources, and operating sequences." },
  { path: "/llm/react.shape.json", mediaType: "application/json", purpose: "React library build surface and component contracts." },
  { path: "/llm/cloud.shape.json", mediaType: "application/json", purpose: "Wire Cloud auth, API key, share URL, and sync contracts." },
  { path: "/llm/schema/wire-diagram.json", mediaType: "application/schema+json", purpose: "Canonical WireDiagram JSON Schema." },
  { path: "/llm/validation.shape.json", mediaType: "application/json", purpose: "Validation issue codes and repair hints." },
  { path: "/llm/examples/support-triage.wire.json", mediaType: "application/json", purpose: "Validated support triage diagram." },
  { path: "/llm/examples/approval-flow.wire.json", mediaType: "application/json", purpose: "Validated approval workflow diagram." },
  { path: "/llm/examples/rag-pipeline.wire.json", mediaType: "application/json", purpose: "Validated RAG pipeline diagram." },
  { path: "/llm/examples/mcp-tool-call-flow.wire.json", mediaType: "application/json", purpose: "Validated MCP tool-call loop diagram." },
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
- Claude-style prefix in some hosts: mcp__wire__create_diagram

Never invent a namespace from this guide name. Use the actual server prefix
provided by the host.

## Fast Path

1. Get docs shape when unsure: v1_get_docs_shape({ task: "<user task>" }).
2. Create or load a diagram.
3. Use apply_actions for coherent multi-step edits.
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
Mermaid, or React Flow JSON as the primary contract.

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
from onChange. Do not store React Flow nodes as application state.

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
    react: "/llm/react.shape.json",
    cloud: "/llm/cloud.shape.json",
    schema: "/llm/schema/wire-diagram.json",
    validation: "/llm/validation.shape.json"
  },
  contracts: [
    "wire-diagram",
    "wire-action",
    "wire-validation-result",
    "wire-react-components",
    "wire-mcp-tools",
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
      "Do not output React Flow JSON as the canonical artifact.",
      "Do not invent node fields such as connectsTo, source, target, next, or type."
    ],
    routes: [
      { path: "/llm/agent-guide.md", mediaType: "text/markdown", purpose: "Prompt-ready agent guide." }
    ],
    related: ["wire.mcp", "wire.schema", "wire.validation"]
  },
  mcp: {
    id: "wire.mcp",
    kind: "tooling",
    summary: "MCP server contract for local and cloud-synced Wire agents.",
    useWhen: [
      "Claude Code, Codex, Cursor, or another MCP client needs to author wires",
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
      { name: "create_diagram", purpose: "Create a new diagram, optionally from a template." },
      { name: "list_diagrams", purpose: "List local or cloud-synced diagrams." },
      { name: "get_diagram_json", purpose: "Read canonical Wire JSON." },
      { name: "save_diagram", purpose: "Overwrite a diagram after schema parsing." },
      { name: "apply_actions", purpose: "Apply a coherent batch of WireAction mutations." },
      { name: "validate", purpose: "Return validation result with stable codes and repair hints." },
      { name: "render_preview", purpose: "Return cloud share URLs or inline preview URLs." },
      { name: "render_svg", purpose: "Return SVG markup." },
      { name: "render_png", purpose: "Return PNG image data when rasterization is available." },
      { name: "export_mermaid", purpose: "Return Mermaid syntax as an export, not source of truth." }
    ],
    routes: [
      { path: "/llm/mcp.shape.json", mediaType: "application/json", purpose: "MCP tool and connection guide." },
      { path: "/llm/recipes/connect-local-mcp.json", mediaType: "application/json", purpose: "Cloud API key setup recipe." }
    ],
    related: ["wire.agent", "wire.cloud", "wire.validation"]
  },
  react: {
    id: "wire.react",
    kind: "library",
    summary: "Preferred React integration surface for building Wire editors and viewers.",
    useWhen: [
      "building a Wire UI in React or Next.js",
      "customizing cards, palettes, validation panels, or inspectors",
      "persisting canvas edits to cloud or local state"
    ],
    contracts: ["wire-react-components", "wire-diagram"],
    preferredPath: [
      "Install @aigentive/wire-react with @aigentive/wire-core.",
      "Use WireWorkspace for a complete editor.",
      "Use WireProvider + WireCanvas for custom product shells.",
      "Persist the WireDiagram emitted by onChange.",
      "Use WireToolbar, WirePalette, WireInspector, and WireValidationPanel instead of reimplementing standard controls."
    ],
    avoid: [
      "Do not import React Flow as the app-level contract.",
      "Do not store canvas state as React Flow nodes and edges.",
      "Do not bypass WireProvider when edit state, validation, history, or events matter."
    ],
    components: [
      {
        name: "WireWorkspace",
        package: "@aigentive/wire-react",
        purpose: "Full editor shell with sidebar, canvas, and inspector slots.",
        contract: "Accepts diagram/defaultDiagram and emits canonical WireDiagram through onChange."
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
      { code: "edge.from-missing", severity: "error", repair: "Add the source node or update the from reference." },
      { code: "edge.to-missing", severity: "error", repair: "Add the target node or update the explicit edge target." },
      { code: "edge.unknown-branch", severity: "error", repair: "Add the branch to the condition node or use a known branch name." },
      { code: "edge.duplicate-connection", severity: "error", repair: "Keep one connection and remove the duplicate from ref or explicit edge." },
      { code: "flow.no-trigger", severity: "warning", repair: "Add a trigger node or confirm the diagram intentionally starts elsewhere." },
      { code: "trigger.no-outgoing", severity: "warning", repair: "Connect the trigger to the first workflow step." },
      { code: "end.no-incoming", severity: "warning", repair: "Connect a preceding workflow step to the end node." },
      { code: "condition.unused-branch", severity: "warning", repair: "Add a target node with from '<conditionId>.<branch>' or remove the unused branch." },
      { code: "flow.unreachable", severity: "warning", repair: "Wire the node into a path from a trigger or add a trigger for that branch." },
      { code: "node.card-invalid", severity: "warning", repair: "Keep data.card serializable and limited to title, description, badges, meta, progress, and footer." },
      { code: "node.forbidden-field", severity: "warning", repair: "Replace connectsTo/connects_to with from on the target node." },
      { code: "node.orphan", severity: "warning", repair: "Connect the node with from or confirm it should stay isolated." },
      { code: "flow.cycle", severity: "warning", repair: "Break the loop or add a guard that explains the repeated path." }
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
      "build-react-workspace",
      "connect-local-mcp",
      "repair-invalid-diagram"
    ],
    routes: [
      { path: "/llm/recipes/{id}.json", mediaType: "application/json", purpose: "Task recipes for agents." }
    ],
    related: ["wire.agent", "wire.mcp", "wire.react", "wire.cloud"]
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
      "Do not import React Flow directly for app state.",
      "Do not persist React Flow nodes.",
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
    claudeCodeCommand: "claude mcp add wire --env WIRE_CLOUD_URL='https://wire.example.com' --env WIRE_CLOUD_API_KEY='PASTE_GENERATED_KEY' -- npx -y @aigentive/wire-mcp@latest",
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
  mcp: ["mcp", "claude", "codex", "cursor", "tool", "stdio", "http", "npx"],
  react: ["react", "next", "component", "canvas", "editor", "viewer", "workspace", "library"],
  cloud: ["cloud", "api key", "auth", "google", "share", "preview", "sync", "vercel", "openai", "chat"],
  schema: ["schema", "json", "diagram", "node", "edge", "wirediagram"],
  validation: ["validate", "invalid", "error", "repair", "zod", "missing", "duplicate"],
  examples: ["example", "sample", "template", "support", "approval", "rag"],
  recipes: ["how to", "setup", "connect", "build", "recipe"]
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
