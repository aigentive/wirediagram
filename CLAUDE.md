# Wire — repo guide for Claude Code

Aigentive Wire — a typed schema, layout engine, SVG renderer, and MCP server for agent-built workflow diagrams. Plus a Next.js playground that doubles as the public preview/edit surface.

## Repo layout

npm workspaces. Strict build order — wire-core must build before anything that depends on it.

| package                 | role                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `packages/wire-core`    | Zod schema, normalization, dagre layout, **SVG renderer**, Mermaid export.    |
| `packages/wire-renderers` | React Flow (xyflow) adapter; re-exports `renderToSvg` from wire-core.       |
| `packages/wire-react`   | JSX facade — author diagrams as React components, compile to canonical JSON. |
| `packages/wire-mcp`     | MCP server (stdio + streamable HTTP), tools, resources, file/memory storage. |
| `packages/wire-cli`     | CLI: `wire init / add / export`.                                              |
| `apps/playground`       | Next.js 15 App Router. Editor, preview, `/api/{render,validate,share}`.       |

The SVG renderer lives in **wire-core**, not wire-renderers. wire-renderers is the React Flow bridge plus a re-export.

## Commands

From the repo root:

```bash
npm run build          # ordered tsc across all workspaces (core → renderers → react → mcp → cli)
npm run typecheck      # tsc --noEmit across all workspaces
npm run test           # builds wire-core first, then `vitest run`
npm run dev:playground # Next dev on :3870
npm run dev:mcp        # tsx wire-mcp src/server.ts (stdio)
npm run dev:mcp:http   # tsx wire-mcp src/server.ts --http on :3860
```

After editing a package source file, run `npm run build -w @aigentive/wire-<pkg>` so dependents (and the playground's `dist/` imports) pick up the change.

## Conventions

- **ESM only.** Every `package.json` has `"type": "module"`. Imports include the `.js` extension even for `.ts` source: `import { foo } from "./bar.js"`. Don't drop the suffix.
- **Zod is the source of truth.** `wire-core/src/schema.ts` defines every wire shape. Types are inferred via `z.infer<typeof XSchema>`. Edits to the data model start there.
- **Pure functions for diagram operations.** `wire-core/src/edit.ts` returns new diagrams; never mutate. `validate()` returns a flat issue array.
- **No comments by default.** Add a one-liner only when the *why* is non-obvious (a workaround, a subtle invariant, an off-canvas math hack). Don't narrate what the code does.
- **Strict TS.** No `any`. Use `unknown` and narrow.
- **Double-quoted strings, semicolons, 2-space indent.** Match neighbours.

## Templates and the playground

The playground imports built-in templates from the **compiled output**: `@aigentive/wire-mcp/dist/templates.js`. If you change `packages/wire-mcp/src/templates.ts`, run `npm run build -w @aigentive/wire-mcp` or the playground won't see your edit.

## Token-based sharing

`POST /api/share` canonicalizes JSON, sha256s it, and stores
`wires/<token>.json`. The token is the first 12 base64url chars of the hash, so
the same diagram always mints the same token (idempotent).
`/preview/inline?d=<token>` and `/edit/inline?d=<token>` both fetch from the
configured share backend, falling back to base64url-encoded inline JSON when
`d` doesn't match the token regex `^[A-Za-z0-9_-]{8,16}$`.

Hosted Vercel deployments use Vercel Blob with `BLOB_READ_WRITE_TOKEN` and
`BLOB_PUBLIC_BASE_URL`. Local Docker/dev can use `WIRE_SHARE_BACKEND=local` and
`WIRE_SHARE_DIR`.

## Edit canvas internals

- `apps/playground/app/edit/canvas.tsx` is the orchestrator; node rendering, palette, and serialization live in sibling files (`nodes.tsx`, `palette.tsx`, `serialize.ts`). Keep components under ~250 lines — split when adding more.
- Auto-save is a 500ms debounced `useEffect` keyed on `[nodes, edges]`. The first run is gated by a `dirtyRef` so loading the page doesn't immediately POST.
- After saving, the URL token is swapped via `window.history.replaceState` — *not* `router.replace` — so React Flow state stays mounted.
- `serialize.ts:diagramFromCanvas` round-trips edges by `${from}→${to}` to preserve per-edge `style`/`label` from the original diagram. New nodes from the palette emit a minimal wire node, with `condition` getting a default `branches: ["yes", "no"]` so schema validation passes.
- The static SVG view at `/preview/inline?d=<token>` is a separate render path — it shares the *data* (Blob token) with the editor but re-renders via wire-core's SVG engine on every request.

## SVG renderer gotchas

`packages/wire-core/src/svg.ts` is the single SVG renderer.

- **Backward edges** (target sits behind source on its handle direction) use a perpendicular U-curve — vanilla xyflow-style control points overshoot off-canvas. See `edgePath()`.
- **viewBox expands to fit edge curves**, not just node rects. The pre-pass that builds `edgeGeoms` feeds bounds into `allBounds` before `w/h/offsetX/offsetY` are computed.
- **Diagonal blend cap is 0.7**, not 1.0. Capping prevents the cubic from collapsing to a degenerate straight diagonal (which broke marker orientation in resvg).

## Deployment Notes

- Local full stack: `docker compose up -d --build`.
- MCP endpoint: `http://localhost:3860/mcp`.
- Playground/editor: `http://localhost:3870`.
- Hosted playground endpoints: `POST /api/{render,validate,share}`,
  `GET /preview/template/[name]`, `GET /preview/inline?d=<token>`,
  `GET /edit/template/[name]`, `GET /edit/inline?d=<token>`.

The MCP server is **not** deployed to Vercel — the playground is read/render-only. Run `wire-mcp --http` on a separate host if you want agent-driven edits.

## Things to skip

- Don't commit `dist/` directories — Vercel builds them. They're gitignored.
- Don't write a `.env.local` to the repo (it's gitignored, but be careful with `vercel env pull`).
- Don't bypass git hooks (`--no-verify`, `--no-gpg-sign`).

## Design / UI work

Two project-scoped helpers cover anything visual in this repo (playground, wire-react components, docs surface):

- **Skill — `wire-design`** (`.claude/skills/wire-design/SKILL.md`).
  Loaded when the user asks for design, polish, hierarchy, spacing, state, or "easier to understand" work — or invoked directly with `/wire-design`. Carries Wire's non-negotiables (sentence case, brand accent only blue-600, no colored left-border cards, single shadow, dot grid only on canvas, tokens not hex), the component-by-component playbook from the [shared UI judgment rules](https://gist.github.com/adriandemian/07f9534883cca5a49c8f6414aada8a1f), and recurring fix recipes for this repo (column-width drift, `fitView` right-bias, validation/minimap chrome unification, etc.).
  Reference design system on disk: `/Users/admin/Downloads/Wire Design System/` (`editor.html`, `colors_and_type.css`, `preview/*.html`).

- **Agent — `wire-design-reviewer`** (`.claude/agents/wire-design-reviewer.md`).
  Delegated reviewer. Use proactively after non-trivial TSX edits or on demand for "does this match the design system" / "polish pass" / pre-merge UI checks. Returns a punch list grouped by **blocker / polish / nice-to-have**, each anchored to a file path and phrased as a UX outcome (clearer hierarchy, calmer sidebar, stronger selected state) — not cosmetic adjectives. Doesn't write code; the main agent applies fixes.

When in doubt: **load the skill before editing UI; spawn the agent after editing UI.** Both pull from the same gist, so guidance stays consistent across in-line work and review.
