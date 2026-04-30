# Wire Cloud Spec

Status: implemented and deployed  
Date: 2026-04-29  
Scope: authenticated cloud workspace for user-owned Wire diagrams

## Current Implementation Notes

The cloud workspace is deployed at:

```text
https://reefagent-mcp-wire.vercel.app/wires
```

Authenticated users can generate cloud sync API keys from **Wires -> Connect
local MCP**. The local MCP package is published on npm:

```text
@aigentive/wire-core@1.0.0
@aigentive/wire-mcp@1.0.3
```

Use `@latest` in MCP client configs so clients pick up the verified npm bin
startup fix and cloud preview behavior:

```bash
claude mcp add wire \
  --env WIRE_CLOUD_URL='https://reefagent-mcp-wire.vercel.app' \
  --env WIRE_CLOUD_API_KEY='wire_sk_live_REAL_KEY' \
  -- npx -y @aigentive/wire-mcp@latest
```

Existing Claude Code sessions must be restarted after adding the MCP server.

When `WIRE_CLOUD_URL` and `WIRE_CLOUD_API_KEY` are configured, `render_preview`
returns hosted Wire Cloud share URLs for browser viewing and raw embeds. Customers
do not need to run local rendering services. `render_svg` and `render_png`
return inline assets directly from the MCP server.

## Sharing URL Model

The current implementation uses separate random tokens for public view and
public edit permissions:

| Route | Purpose |
|---|---|
| `/wires` | Authenticated list |
| `/wires/{wireId}` | Canonical authenticated workspace editor |
| `/wires/{wireId}/preview` | Authenticated read-only preview |
| `/wires/import?from={token}` | Import or fork a public share into the signed-in account |
| `/s/{viewToken}` | Public read-only share page |
| `/s/{viewToken}.svg` | Public raw SVG |
| `/s/{viewToken}.png` | Public raw PNG |
| `/s/{viewToken}.json` | Public canonical Wire JSON |
| `/s/{viewToken}.mmd` | Public Mermaid export |
| `/e/{editToken}` | Public edit surface, only for edit-scope shares |

Strategic decisions made while implementing the gist:

- Public `/s` pages are server-rendered HTML with cloud-rendered SVG instead of
  requiring a client-side React canvas. This is simpler for customers and gives
  reliable unfurls/embeds.
- Legacy content-hash tokens remain readable through `/s/{token}` so old preview
  links do not break, but new authenticated shares no longer reuse that token as
  an edit secret.
- `/preview/inline?d={token}` redirects to `/s/{token}`. `/edit/inline` remains
  only for base64 inline diagrams; token-based edit now requires `/e/{editToken}`.
- Pinning stores the current content token for immutable view/embed shares. Live
  shares resolve the owner wire's current diagram.

## Goal

Add an authenticated wires workspace to the existing deployed Wire Vercel app so a signed-in Google user can see their active wires, create a new wire, open any wire, edit it manually, and iterate on it through the existing chat-plus-canvas experience.

The core product rule is simple: after login, the left wires sidebar always stays visible. The right side is either a placeholder when nothing is selected or the current Wire canvas workspace when a wire is selected.

## Current Repo Research

The app is already close to the desired workspace:

- `apps/playground` is a Next.js 15 App Router app.
- `apps/playground/app/playground/PlaygroundClient.tsx` already provides the current canvas/JSON/chat UI.
- `apps/playground/app/api/playground/chat/route.ts` already accepts `{ message, diagram, history }` and returns an updated `WireDiagram`.
- `apps/playground/app/api/share/route.ts` already canonicalizes a diagram, hashes it, writes `wires/{token}.json`, and returns a share token.
- `apps/playground/lib/share-store.ts` already resolves local or Vercel Blob-backed share tokens.
- Existing public preview/edit links are token-based and should remain available for public shares.

## Current Deployment Alignment

This is not a greenfield cloud app. It must extend the existing Vercel project.

Production project checked on 2026-04-29:

- Vercel project: `reefagent-mcp-wire`
- Vercel org/context: `aigentive`
- Production alias: `https://reefagent-mcp-wire.vercel.app`
- Additional aliases: `reefagent-mcp-wire-aigentive.vercel.app`, `reefagent-mcp-wire-themefy1-aigentive.vercel.app`
- Latest production deployment inspected: `dpl_GdcPX3S6rjEsskxKFnRhFTxMpQs1`
- Latest production deployment URL: `reefagent-mcp-wire-72cv1wguf-aigentive.vercel.app`
- Latest production deployment ready at: `2026-04-28T13:10:55.263Z`
- Latest production commit: `eefb97a232ce4fc952dcbdf1016d8b155d4ad2eb` (`playground: overhaul components page UI`)
- Local planning branch HEAD at time of this spec: `f06a50417241b8e60b273122a3416e7879948ada` (`Add Playground LLM chat + editor`)

Live route checks:

- `/` returns the deployed docs app.
- `/quickstart` returns the deployed docs app.
- `/preview/template/agent-workflow` returns the deployed preview surface.
- `/edit/template/agent-workflow` returns the deployed editor surface.
- `/api/share`, `/api/render`, and `/api/validate` are deployed API routes; `HEAD` returns `405` because they are method-specific.
- `/playground` currently returns `404` in production, even though it exists in this working tree.
- `/api/playground/chat` currently returns `404` in production, even though it exists in this working tree.
- `/wires` and `/cloud` do not exist in production yet.

Current Vercel env names checked:

- `BLOB_READ_WRITE_TOKEN` exists for Production and Preview.
- `BLOB_PUBLIC_BASE_URL` exists for Production and Preview.
- `OPENAI_API_KEY` exists for Production.
- `AUTH_SECRET` exists for Production.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are not currently configured in Vercel.

Alignment decision:

- Keep the current docs app at `/`.
- Add the authenticated workspace at `/wires`, not `/cloud`, because the primary object is the user's active wires.
- Add user-owned APIs under `/api/wires`.
- Treat the local `/playground` route and `/api/playground/chat` route as reusable implementation surfaces that must be deployed before, or in the same release as, the authenticated `/wires` workspace.
- Do not create a second Vercel project or a separate cloud app unless there is a later infrastructure reason.

External docs checked:

- Auth.js supports Next.js App Router through `next-auth@beta`, an `auth.ts` config, and `app/api/auth/[...nextauth]/route.ts`. Auth.js docs also note the mandatory `AUTH_SECRET`. Source: [Auth.js installation](https://authjs.dev/getting-started/installation?framework=Next.js).
- Auth.js Google provider uses `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `Google`, and the callback URL `/api/auth/callback/google`. Source: [Auth.js Google provider](https://authjs.dev/getting-started/providers/google).
- Auth.js protected resources can call `auth()` server-side and return a redirect or `401` when no session exists. Source: [Auth.js protecting resources](https://authjs.dev/getting-started/session-management/protecting).
- Vercel Blob supports public/private stores, SDK `put()`, folder-style path prefixes, and listing by prefix. Source: [Vercel Blob docs](https://vercel.com/docs/vercel-blob).

## Product Decisions

1. Keep the current Wire canvas UI as the editor surface.
2. Do not create a separate "new wire" screen.
3. Do not create a separate "edit wire" screen.
4. `+ New Wire` creates an untitled wire immediately and selects it.
5. Clicking a sidebar item loads that wire into the right workspace.
6. If nothing is selected, the right workspace shows only a simple placeholder.
7. The sidebar remains visible while editing, chatting, validating, exporting, and sharing.
8. Private ownership is enforced by authenticated API routes, not by the client.
9. Public preview links remain token-based and do not require auth.
10. Chat iteration and manual canvas edits both save back to the selected wire.

## UX Structure

### Signed Out

```text
+-------------------------------------------------------------+
| Wire Cloud                                           Sign in |
+-------------------------------------------------------------+
|                                                             |
|                    Continue with Google                     |
|                                                             |
+-------------------------------------------------------------+
```

### Signed In, Nothing Selected

```text
+-------------------------------------------------------------+
| Wire Cloud                                      Alex         |
+----------------------+--------------------------------------+
| + New Wire           |                                      |
| Search wires...      |                                      |
|                      |                                      |
| Active Wires         |             Select a wire             |
|                      |             or create a new one        |
| Customer onboarding  |                                      |
| Support triage       |                                      |
| Invoice approval     |                                      |
|                      |                                      |
+----------------------+--------------------------------------+
```

### Wire Selected

The right side loads the current canvas screen. The actual wire diagram and canvas controls are intentionally not redrawn here.

```text
+-------------------------------------------------------------+
| Wire Cloud                                      Alex         |
+----------------------+--------------------------------------+
| + New Wire           | Customer onboarding flow        Share |
| Search wires...      +--------------------------------------+
|                      | Canvas | JSON              Reset  8 nodes
| Active Wires         +--------------------------------------+
|                      |                                      |
| > Customer onboarding|                                      |
|   Support triage     |        Current Wire Canvas UI         |
|   Invoice approval   |        stays as-is                    |
|                      |                                      |
|                      |                         Chat panel    |
|                      |                         stays as-is   |
+----------------------+--------------------------------------+
```

### New Wire

```text
+-------------------------------------------------------------+
| Wire Cloud                                      Alex         |
+----------------------+--------------------------------------+
| + New Wire           | Untitled wire                  Saved  |
| Search wires...      +--------------------------------------+
|                      | Canvas | JSON              Reset  0 nodes
| Active Wires         +--------------------------------------+
|                      |                                      |
| > Untitled wire      |                                      |
|   Customer onboarding|        Current Wire Canvas UI         |
|   Support triage     |        with blank/default wire        |
|   Invoice approval   |                                      |
|                      |                                      |
|                      |                         Chat panel    |
|                      |                         available     |
+----------------------+--------------------------------------+
```

## Information Architecture

Add one authenticated wires app shell inside the deployed Next.js app:

- `/wires` - main authenticated workspace.
- `/login` - sign-in page, mostly a Google sign-in action.
- `/api/auth/[...nextauth]` - Auth.js route handler.
- Existing `/`, docs routes, `/preview/*`, `/edit/*`, `/api/share`, `/api/render`, and `/api/validate` stay intact.
- Current-branch `/playground` and `/api/playground/chat` should stay available once deployed, but the authenticated workspace should not rely on those public routes being visible to users.

The wires app should not replace the deployed docs, preview, or share routes. It wraps the stable editor/chat behavior with auth and ownership.

## Recommended Architecture

```text
Google OAuth
    |
Auth.js session
    |
Next.js /wires app shell
    |
    +-- GET /api/wires
    +-- POST /api/wires
    +-- GET /api/wires/:id
    +-- PATCH /api/wires/:id
    +-- POST /api/wires/:id/chat
    +-- POST /api/wires/:id/share
    |
Metadata DB
    |
Vercel Blob or local share store for canonical Wire JSON
```

Use a database for user and wire metadata. Use Blob/local share storage for canonical `WireDiagram` snapshots. This avoids listing Blob for every dashboard load and keeps ownership, titles, timestamps, and version history queryable.

## Data Model

### `users`

Auth.js may own this table if a database adapter is used. If using JWT sessions only, create a local profile record on first authenticated request.

```sql
id            text primary key
email         text not null unique
name          text
image         text
created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
```

### `wires`

```sql
id             text primary key
owner_id       text not null references users(id)
title          text not null
current_token  text not null
node_count     integer not null default 0
is_deleted     boolean not null default false
created_at     timestamptz not null default now()
updated_at     timestamptz not null default now()
```

Indexes:

```sql
create index wires_owner_updated_idx on wires(owner_id, updated_at desc);
create index wires_owner_title_idx on wires(owner_id, lower(title));
```

### `wire_versions`

```sql
id          text primary key
wire_id     text not null references wires(id)
token       text not null
source      text not null check (source in ('manual', 'chat', 'json', 'reset', 'create'))
summary     text
created_at  timestamptz not null default now()
```

### `chat_messages`

This is optional for v1. Keep it if we want chat continuity per wire.

```sql
id          text primary key
wire_id     text not null references wires(id)
role        text not null check (role in ('user', 'assistant'))
content     text not null
model       text
cost_usd    numeric
created_at  timestamptz not null default now()
```

## Storage Strategy

For v1, keep the existing content-addressed `wires/{token}.json` behavior:

- Every save stores canonical Wire JSON by content hash.
- `wires.current_token` points to the latest content.
- `wire_versions.token` preserves previous snapshots.
- Public preview reuses `/preview/inline?d={token}`.

Private cloud wires are private through metadata access control. If the Blob store is public, possession of a token still allows public read. That is acceptable only if tokens are treated as unlisted share links. If private-by-default content is required, create a private Blob store and serve private reads through authenticated route handlers.

## API Spec

All `/api/wires/*` routes require `auth()`. If no session exists, return `401` for API routes.

### `GET /api/wires`

Returns active wires for the current user.

Response:

```json
{
  "wires": [
    {
      "id": "wire_123",
      "title": "Customer onboarding flow",
      "nodeCount": 8,
      "updatedAt": "2026-04-29T10:00:00.000Z"
    }
  ]
}
```

### `POST /api/wires`

Creates an untitled wire and returns the created metadata plus initial diagram. The client selects it immediately.

Request:

```json
{
  "title": "Untitled wire"
}
```

Response:

```json
{
  "wire": {
    "id": "wire_123",
    "title": "Untitled wire",
    "currentToken": "abc123",
    "nodeCount": 0
  },
  "diagram": {
    "version": 1,
    "title": "Untitled wire",
    "layout": "LR",
    "nodes": [],
    "edges": []
  }
}
```

### `GET /api/wires/:id`

Loads a selected wire. Must verify `owner_id`.

Response:

```json
{
  "wire": {
    "id": "wire_123",
    "title": "Customer onboarding flow",
    "currentToken": "abc123",
    "nodeCount": 8
  },
  "diagram": {}
}
```

### `PATCH /api/wires/:id`

Saves manual canvas or JSON edits. Must validate `WireDiagram`, persist a new token, update `wires.current_token`, and insert `wire_versions`.

Request:

```json
{
  "diagram": {},
  "source": "manual"
}
```

Response:

```json
{
  "wire": {
    "id": "wire_123",
    "title": "Customer onboarding flow",
    "currentToken": "newtoken",
    "nodeCount": 8
  },
  "validation": {
    "valid": true,
    "issues": []
  }
}
```

### `POST /api/wires/:id/chat`

Runs the existing chat update against the selected wire. Internally reuse the same logic currently in `/api/playground/chat`, but save the result to the wire before returning.

Request:

```json
{
  "message": "Add a billing escalation path.",
  "history": []
}
```

Response:

```json
{
  "diagram": {},
  "wire": {
    "id": "wire_123",
    "currentToken": "newtoken",
    "nodeCount": 10
  },
  "message": "Wire diagram updated.",
  "traces": [],
  "validation": {
    "valid": true,
    "issues": []
  }
}
```

### `POST /api/wires/:id/share`

Returns a public preview URL for the current token. This does not need to duplicate content if the current token already exists.

Response:

```json
{
  "previewUrl": "https://example.com/preview/inline?d=newtoken"
}
```

## Frontend Plan

### Components

Add:

- `WiresShell` - owns the full-height layout and user menu.
- `WireSidebar` - `+ New Wire`, search, active wire list.
- `WiresWorkspace` - placeholder or selected editor.
- `WiresEditorClient` - refactor/wrap `PlaygroundClient` so it can accept `wireId`, `title`, `diagram`, `chatHistory`, and `onSave`.

Refactor:

- Extract the reusable canvas/chat body from `PlaygroundClient`.
- Keep visual behavior of the existing canvas screen intact.
- Replace playground-only URL token mutation with authenticated wire save callbacks when in wires mode.

### State Flow

```text
WiresShell loads session
    |
GET /api/wires
    |
No selected wire -> placeholder
    |
Click wire or + New Wire
    |
GET or POST selected wire
    |
Render current canvas/chat workspace
    |
Manual edit -> debounced PATCH
Chat submit -> POST chat -> save -> update workspace
```

## Implementation Phases

### Phase 0 - Deployment Baseline Alignment

1. Keep using the existing Vercel project `reefagent-mcp-wire`.
2. Deploy the current branch changes that add `/playground` and `/api/playground/chat`, or extract their reusable logic without exposing those public routes.
3. Verify production still serves the existing docs routes at `/`, `/install`, `/quickstart`, `/concepts`, `/customize/cards`, `/listen`, and `/examples/*`.
4. Verify production still serves `/preview/template/[name]`, `/edit/template/[name]`, `/api/share`, `/api/render`, and `/api/validate`.
5. Confirm production env vars before adding auth:
   - `BLOB_READ_WRITE_TOKEN`
   - `BLOB_PUBLIC_BASE_URL`
   - `OPENAI_API_KEY` if chat is enabled in production
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`

Acceptance:

- Existing production alias `https://reefagent-mcp-wire.vercel.app` remains the canonical app URL.
- Existing docs, preview, edit, share, render, and validate surfaces do not regress.
- Chat mutation logic is available to the authenticated wires workspace, whether through shared server code or the deployed `/api/playground/chat` route.

### Phase 1 - Auth Foundation

1. Install Auth.js for Next.js.
2. Add `apps/playground/auth.ts` with Google provider.
3. Add `apps/playground/app/api/auth/[...nextauth]/route.ts`.
4. Add `/login`.
5. Protect `/wires` using `auth()` server-side.
6. Add required env docs:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_URL` if needed by deployment

Acceptance:

- Signed-out users visiting `/wires` are redirected to `/login`.
- Google sign-in returns the user to `/wires`.
- Signed-in page can render the user's name/email.

### Phase 2 - Metadata Persistence

1. Choose and wire a hosted SQL database.
2. Add migrations for `users`, `wires`, `wire_versions`, and optionally `chat_messages`.
3. Add a minimal server-side DB helper.
4. Add first-user creation or rely on Auth.js adapter tables.

Acceptance:

- A signed-in user can create a metadata-backed wire.
- Wire ownership is stored and queryable.
- A user cannot fetch another user's wire by id.

### Phase 3 - Wire APIs

1. Add `GET /api/wires`.
2. Add `POST /api/wires`.
3. Add `GET /api/wires/:id`.
4. Add `PATCH /api/wires/:id`.
5. Add `POST /api/wires/:id/share`.
6. Move share-token generation into a shared helper so `/api/share` and authenticated wire saves do not duplicate logic.

Acceptance:

- Sidebar can list the current user's wires.
- `+ New Wire` creates a blank/default wire and returns its diagram.
- Manual saves update `current_token` and create a version.
- Public share returns the existing preview URL shape.

### Phase 4 - Wires Shell UI

1. Add `/wires` route.
2. Build the persistent left sidebar.
3. Add placeholder right pane for no selection.
4. Load selected wire into the current canvas/chat workspace.
5. Keep the workspace visually aligned with the current `PlaygroundClient` screen.

Acceptance:

- Sidebar never disappears after login.
- No separate new/edit screen appears.
- Clicking a wire only replaces the right pane.
- Creating a new wire immediately selects it.

### Phase 5 - Chat Save Integration

1. Extract reusable chat mutation logic from `/api/playground/chat/route.ts`.
2. Add `POST /api/wires/:id/chat`.
3. Load current diagram server-side from `wires.current_token`.
4. Apply chat result.
5. Persist result as a `chat` version.
6. Optionally insert chat messages for continuity.

Acceptance:

- Chat updates the selected wire.
- Updated diagram persists after reload.
- The sidebar node count and updated timestamp refresh.

### Phase 6 - Polish And Guardrails

1. Debounce manual saves.
2. Show save states: `saving`, `saved`, `error`.
3. Add rename behavior, likely inline in the workspace title.
4. Add delete or archive action.
5. Add empty/error/loading states.
6. Add tests.

Acceptance:

- Empty account state works.
- Save failures are visible and retryable.
- Deleted wires disappear from the active list.
- Typecheck and route tests pass.

## Test Plan

Unit/API:

- Auth-required API returns `401` without a session.
- Wire list returns only owned wires.
- Wire load rejects non-owned ids.
- New wire creates metadata, initial blob token, and version row.
- Manual save validates diagram before updating metadata.
- Chat save persists the returned diagram and version.

E2E:

- Signed-out `/wires` redirects to `/login`.
- Signed-in user sees persistent sidebar.
- Empty account shows placeholder.
- `+ New Wire` opens workspace directly.
- Clicking a wire loads the current canvas UI.
- Chat updates and persists a wire.
- Public preview link opens `/preview/inline?d={token}`.

## Risks

- If public Blob is used for private user diagrams, token possession is effectively read access. Decide before launch whether unlisted links are acceptable.
- `PlaygroundClient` currently owns URL-token state for `/playground`; refactor carefully so public playground behavior does not regress.
- Chat API logic should be shared, not copied, to avoid two divergent prompts/tool schemas.
- Google refresh tokens are not needed for basic sign-in. Do not request offline access unless future Google API access is required.

## Open Decisions

1. Database choice: Vercel Postgres/Neon, Supabase Postgres, or another hosted SQL option.
2. Blob privacy: keep public unlisted tokens for v1 or move user wires to private Blob reads.
3. Chat history: persist per-wire chat in v1 or keep it session-local until later.
4. Default blank wire: truly zero nodes or a one-trigger starter diagram.
5. Rename behavior: inline title editing in header or sidebar row action.
