# Wire — Options Catalog (demo + docs spec)

## Framing

Wire is a **library**. We ship a typed schema, layout, renderer, and an editing inspector. We do **not** ship a fixed set of node options — what an `ai` node "should" expose is a consumer concern. The library already exposes the mechanism (`WireOptionCatalog`, `wireOptionSpecsForNode`, `patchWireOption`, `WireOptionPanel`); the demo apps and docs are where we *show* how to use it.

This spec covers:

1. The minimum library-side polish so an inspector + a catalog gives consumers a working kind-aware editor with zero glue code.
2. Demo data the playground and `/wires` use to surface realistic per-kind options without baking that schema into the library.
3. A docs page that demonstrates the same catalog mechanism with three variants on one diagram.

## What exists today

- `packages/wire-react/src/options.ts` — `WireOptionSpec`, `WireOptionCatalog`, helpers (`readWireOption`, `patchWireOption`, `wireNodeOptions`, `wireOptionSpecsForNode`, `inferOptionType`).
- `packages/wire-react/src/components/WireOptionPanel.tsx` — renderer for a list of option specs.
- `WireProvider` accepts a diagram and dispatches actions; consumers can already pass an `optionCatalog` through downstream context (`WireCanvas` accepts it as a prop).
- `WireInspector` (the right rail in the demo apps) currently shows Title / Description / Appearance only. **It does not render `WireOptionPanel`** — this is the primary gap.

## Out of scope

- A canonical "Wire schema" of options. Options stay consumer-defined.
- Wiring consumer-defined option keys into the demo's chat-agent system prompt. The demo's chat can know its own demo catalog; it cannot know yours.
- Per-project / per-tenant catalog layering. Useful later; not now. Easier to add than to undo.

## Work items

### 1. Library — split `WireInspector` into Configure / Style tabs

**File**: `packages/wire-react/src/components/WireInspector.tsx`

Restructure the inspector into a tabbed surface. Title and Description stay above the tabs (they apply regardless of tab). Below the title block, a 2-segment control switches between:

- **Configure** *(default)* — kind-specific options driven by `WireOptionCatalog`. Renders specs from `wireOptionSpecsForNode(ctx.optionCatalog, node)` using `WireOptionPanel` (or inline equivalent reusing the existing recessed input style). Each row patches via `patchWireOption(node, spec, value)` and dispatches `node.patch`. When the catalog has zero specs for the active kind, render an empty state hint (`"No configuration for ${kind} nodes yet — pass an optionCatalog to enable them."`).
- **Style** — everything currently in the Appearance section: Card style preset (Neutral / Success / …), Fill / Border / Text colors, Border width, Radius, Shadow, Reset.

Tab segment styling matches the existing wire-design segmented controls (slate-900 active fill, white text). Tab state is component-local (`useState`); selection-change resets to "Configure" when switching nodes.

The catalog flows in via `WireProvider`'s context. `WireInspector` reads `ctx.optionCatalog` and is responsible for the catalog → panel binding; consumers don't write any glue.

**Acceptance**: passing an `optionCatalog` to `<WireProvider>` is enough to make the Configure tab populate. The Style tab keeps every existing control, just relocated.

### 2. Demo — example catalogs

**File**: `apps/playground/lib/example-catalogs.ts`

Three named catalogs, all stored in the demo, all hand-written. Names and shapes:

```ts
export const agentCatalog: WireOptionCatalog = {
  "*": [
    { key: "notes", type: "textarea", label: "Notes", placeholder: "Internal notes…" }
  ],
  trigger: [
    { key: "source", type: "select", label: "Source",
      options: ["webhook", "cron", "manual", "queue", "email"], defaultValue: "webhook" },
    { key: "event", type: "text", label: "Event", placeholder: "ticket.created" },
    { key: "schedule", type: "text", label: "Schedule (cron)", placeholder: "0 */15 * * *" }
  ],
  ai: [
    { key: "model", type: "select", storage: "node", label: "Model",
      options: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.5", "claude-opus-4-7", "claude-sonnet-4-6"] },
    { key: "mode", type: "select", label: "Mode",
      options: ["plan", "execute", "classify", "extract"], defaultValue: "execute" },
    { key: "temperature", type: "number", label: "Temperature",
      min: 0, max: 2, step: 0.1, defaultValue: 0.3 },
    { key: "max_tokens", type: "number", label: "Max tokens", min: 1, step: 1 },
    { key: "system_prompt", type: "textarea", label: "System prompt" },
    { key: "output_schema", type: "textarea", label: "Output schema (JSON)" }
  ],
  tool: [
    { key: "ref", type: "text", storage: "node", label: "Reference",
      placeholder: "zendesk.update_ticket" },
    { key: "requires_approval", type: "boolean", label: "Requires approval" },
    { key: "timeout_ms", type: "number", label: "Timeout (ms)", defaultValue: 30000 },
    { key: "retry", type: "number", label: "Retry count", min: 0, defaultValue: 0 }
  ],
  action: [
    { key: "target", type: "text", label: "Target", placeholder: "queue, channel, recipient" },
    { key: "payload_template", type: "textarea", label: "Payload template" },
    { key: "idempotency_key", type: "text", label: "Idempotency key" }
  ],
  condition: [
    { key: "branches", type: "text", storage: "node", label: "Branches",
      placeholder: "yes, no" },
    { key: "default_branch", type: "text", label: "Default branch" },
    { key: "expression", type: "textarea", label: "Expression" }
  ],
  human: [
    { key: "assignee", type: "text", label: "Assignee", placeholder: "user, role, or queue" },
    { key: "escalation_after_min", type: "number", label: "Escalate after (min)" },
    { key: "instructions", type: "textarea", label: "Instructions" }
  ],
  retrieval: [
    { key: "source", type: "text", label: "Index / collection" },
    { key: "top_k", type: "number", label: "Top K", min: 1, defaultValue: 5 },
    { key: "query_template", type: "textarea", label: "Query template" },
    { key: "filter", type: "textarea", label: "Filter (JSON)" }
  ]
};

export const minimalCatalog: WireOptionCatalog = {
  ai: [
    { key: "model", type: "select", storage: "node", label: "Model",
      options: ["gpt-5.4-mini", "gpt-5.4"] }
  ]
};

export const terminalCatalog: WireOptionCatalog = {
  "*": [
    { key: "id", type: "text", storage: "node", label: "Identifier" }
  ]
};
```

This file is **demo data**, not a library export. It lives in the playground app and is not re-exported from any `@aigentive/*` package.

### 3. Demo — wire the catalogs into the canvases

**Files**: `apps/playground/app/playground/PlaygroundClient.tsx`, `apps/playground/app/wires/WiresClient.tsx`

Both pages import `agentCatalog` and pass it to `<WireProvider>` (preferred — single point) or directly to `<WireCanvas optionCatalog={...} />`. After item 1, the inspector picks it up automatically.

The demo's chat agent (`/api/playground/chat/route.ts`) already builds the input from the diagram. The system prompt gets a short paragraph listing the demo catalog's keys per kind, so the agent can populate them when the user asks ("set the AI node to gpt-5.4 and temperature 0.5"). This is demo behavior, not library behavior — it stays in the playground route.

### 4. Docs — `/customize/options`

**File**: `apps/playground/app/(docs)/customize/options/page.tsx` (new) + add it to the docs nav (`apps/playground/app/(docs)/_components/nav.ts`).

Page outline, mirroring `/customize/cards`:

- **Intro**: Wire ships the catalog mechanism, not the catalog. Show the type signatures of `WireOptionSpec` and `WireOptionCatalog`.
- **Specimen**: one diagram (3–4 nodes covering `ai`, `tool`, `condition`, `human`) rendered three times side-by-side, each wired to a different catalog (`agentCatalog`, `minimalCatalog`, `terminalCatalog`). Each specimen lets the reader see how the inspector's Configuration section changes shape based on the catalog.
- **Storage callout**: explain when to use `storage: "node"` (canonical fields like `model`, `ref`, `branches`, `from`) vs `data` (top-level data slot) vs `data.options` (default — runtime config).
- **Wire-up snippet**: a single `<WireWorkspace diagram={...} optionCatalog={catalog} />` example.
- **Inputs reference**: a small table for `text` / `textarea` / `number` / `boolean` / `select` with the spec fields each one honors.

The page is fully static (renders the specimen with the existing canvas) — no API calls.

## Acceptance criteria

- Selecting a node in `/playground` or `/wires` shows the inspector with Title / Description above two tabs: **Configure** (default) and **Style**.
- The Configure tab shows kind-appropriate fields (model picker on `ai`, branches on `condition`, etc.) when the catalog has specs for that kind, and an empty-state hint when it doesn't. The Style tab carries every control that used to live under Appearance — Card style, Fill, Border, Text, Border width, Radius, Shadow, Reset — with no behavior regression.
- Editing a Configure field round-trips: change persists via `node.patch`, the canvas re-renders, save indicator transitions Saving → Saved.
- A node kind not present in the catalog still shows the Style tab; the Configure tab shows the empty-state hint.
- The demo chat sets `data.options.*` (or top-level fields when `storage: "node"`) when asked, and the Configure tab reflects the change.
- `/customize/options` renders three live specimens with different catalogs against the same diagram and a Style tab specimen showing the relocated controls.
- No new exports from `@aigentive/wire-react`. The library surface stays the same; only `WireInspector` gains the tab structure.

## Risks / decisions deferred

- **Catalog layering** (project-defined options + global defaults): not implementing now. If consumers ask, the right shape is `optionCatalog: WireOptionCatalog | WireOptionCatalog[]` and merge per-kind on read.
- **Validation**: option specs don't carry validators today (no `pattern`, no `required`). If a consumer wants validation, they do it on save, not in the spec. Adding validators is a future spec.
- **Conditional fields** (e.g. show `schedule` only when `source === "cron"`): not in this pass. The current inspector shows everything in the catalog. Adding `visibleWhen` is a clean extension if needed.
