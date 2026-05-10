# Deploying Wire

Wire ships two runnable things:

- **`@aigentive/wire-mcp`** — the MCP server (stdio + HTTP). This is what
  agents talk to. Stateful: it owns diagram storage.
- **`@aigentive/wire-playground`** (Next.js) — the browser preview /
  render service. Stateless: it can render any diagram you POST.

Choose what to deploy:

| Use case | What to run |
|---|---|
| Claude Desktop / Cursor / Claude Code / local MCP clients | `wire-mcp` over **stdio** |
| Network agents, multiple clients | `wire-mcp` over **HTTP** (in a container) |
| Embed renders in a web app / docs | `wire-playground` on **Vercel** or any Next.js host |
| Both — read/write diagrams + view them | Both, behind the same domain |

---

## Local — stdio (MCP clients)

For normal local use, point your MCP client at the published npm package:

```json
{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_STORAGE_DIR": "/Users/me/Documents/wire-diagrams"
      }
    }
  }
}
```

For authenticated cloud sync, generate a key in the hosted app under **Wires ->
Connect local MCP**:

```json
{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_CLOUD_URL": "https://wire.example.com",
        "WIRE_CLOUD_API_KEY": "PASTE_WIRE_CLOUD_API_KEY"
      }
    }
  }
}
```

Restart the MCP client after adding or changing the server config.

When `WIRE_CLOUD_URL` is present, `render_preview` returns hosted Wire Cloud
share URLs for browser viewing and raw embeds (`.svg`, `.png`, `.json`, `.mmd`).
Customers do not need to run the playground locally. `render_svg` and
`render_png` return inline assets from the MCP server.

Other MCP clients use the same shape: command, args, and env. The visible tool
names depend on the host. Some clients expose bare names such as
`create_diagram`; others prefix the configured server name, such as
`wire__create_diagram` or `mcp__wire__create_diagram`.

---

## Local — HTTP (network clients)

```bash
npx -y @aigentive/wire-mcp@latest --http
# http://127.0.0.1:3860/mcp
# http://127.0.0.1:3860/health
```

Set `WIRE_HTTP_PORT` to change port; set `WIRE_HTTP_HOST=0.0.0.0` to expose on the LAN.

Cloud-backed local HTTP:

```bash
WIRE_CLOUD_URL='https://wire.example.com' \
WIRE_CLOUD_API_KEY='PASTE_WIRE_CLOUD_API_KEY' \
npx -y @aigentive/wire-mcp@latest --http
```

`/health` reports whether cloud sync is enabled:

```json
{
  "cloud": {
    "enabled": true,
    "url": "https://wire.example.com"
  }
}
```

---

## Docker Compose — local full stack

The repo ships Docker images for both runnable services:

- `Dockerfile` for the Wire MCP HTTP server.
- `Dockerfile.playground` for the local Next.js playground/editor.
- `docker-compose.yml` for both services with local persistent volumes.

```bash
docker compose up -d --build
# MCP service:        http://localhost:3860/mcp
# MCP health:         http://localhost:3860/health
# React playground:   http://localhost:3870
# Diagrams persist in the `wire-data` named volume.
# Playground cloud data persists in the `wire-playground-db` named volume.
```

The compose playground uses SQLite through libSQL, so `/api/share`,
`/edit/inline?d=<token>`, and `/preview/inline?d=<token>` work without Vercel
Blob. Production Vercel deploys should use Turso/libSQL.

---

## Cloud — Docker MCP server

Deploy the MCP image to any container host:

- **Fly.io**: `fly launch` from this repo, accept the Dockerfile, set the internal port to 3860.
- **Render.com**: New Web Service → Docker → point at this repo.
- **Google Cloud Run**: `gcloud run deploy --source .` then set `WIRE_STORAGE_DIR` to a mounted volume (or implement a cloud storage backend).
- **Kubernetes**: any Deployment + Service combo on port 3860, persistent volume mounted at `/data/diagrams`.

`HEALTHCHECK` is wired into the image — your platform's liveness probe should hit `/health`.

---

## Cloud — Vercel (playground)

The Next.js playground (`apps/playground`) is deployable to your own Vercel
project. It provides browser preview/edit pages plus `/api/render`,
`/api/validate`, and `/api/share`.

```bash
# from repo root
vercel link
vercel --prod
```

Set these environment variables for production storage:

| Variable | Required | Purpose |
|---|---:|---|
| `TURSO_DATABASE_URL` | recommended | Turso/libSQL database URL for playground wires, share links, quotas, API keys, and encrypted user OpenAI keys. |
| `TURSO_AUTH_TOKEN` | recommended for Turso | Turso auth token. Leave empty for local `file:` URLs. |
| `BLOB_READ_WRITE_TOKEN` | Blob only | Vercel Blob token used only when `WIRE_CLOUD_BACKEND=blob`. Turso deployments do not read Blob fallback data. |
| `BLOB_PUBLIC_BASE_URL` | legacy Blob only | Public base URL for old Blob-hosted `wires/{token}.json` objects. Turso deployments do not read this fallback. |
| `WIRE_CLOUD_BACKEND` | no | `sqlite`, `turso`, or `database` forces libSQL; `blob` forces Vercel Blob; `filesystem`/`fs` forces local JSON files. |
| `LOCAL_DB_PATH` | local only | SQLite file URL used when `TURSO_DATABASE_URL=file:local` or unset locally. Default: `file:./storage/wire.db`. |

The repo-root `vercel.json` directs the Vercel build to `apps/playground/.next`.
Routes available after deploy:

- `/` — index + template list
- `/preview/template/[name]` — render a built-in template
- `/s/<viewToken>` — public read-only share page
- `/s/<viewToken>.svg`, `.png`, `.json`, `.mmd` — public raw embed assets
- `/e/<editToken>` — public editor, only for edit-scope share tokens
- `/preview/inline?d=<base64url-or-token>` — legacy preview route; token links redirect to `/s/<token>`
- `/edit/inline?d=<base64url>` — legacy inline editor for base64 diagrams
- `POST /api/render` — body: canonical Wire JSON; returns `image/svg+xml`
- `POST /api/validate` — body: canonical Wire JSON; returns issues
- `POST /api/share` — body: canonical Wire JSON; stores `wires/{token}.json` and returns share URLs

The playground can run by itself for preview/edit/share links. To pair it with
persistent agent-authored diagrams, deploy `wire-mcp` (Docker) alongside it and
point your MCP clients to the MCP endpoint.

---

## Combined topology

```
MCP client / agent          ────→  wire-mcp (HTTP, container)
                                    │
                                    ▼
                             wire-storage (volume / DB)

users / docs / dashboards   ────→  wire-playground (Vercel or Next.js host)
                                    │
                                    └── renders canonical Wire JSON
```

Agents open an MCP session against the `wire-mcp` HTTP endpoint and edit
diagrams via tools (`add_node`, `connect`, `validate`, etc.). When an agent needs
to surface a diagram in chat, it can call `render_svg`, `render_png`, or
`render_preview`. Cloud-connected MCP servers return hosted preview links; local
only MCP servers use `WIRE_PREVIEW_BASE` and fall back to `http://localhost:3870`.

---

## Storage backends

The default storage is the local filesystem (`WIRE_STORAGE_DIR`). For multi-instance cloud deploys, plug in your own backend by implementing the `StorageBackend` interface from `@aigentive/wire-mcp/dist/storage.js` and passing it to `createServer({ storage })` in a thin wrapper script. Likely options:

- A Postgres / Neon table keyed on diagram id
- Vercel Blob with a `wire/{id}.json` key
- S3 / R2 with object versioning for diagram history

A reference implementation lives on the roadmap; PRs welcome.

The hosted playground has its own storage path. It uses Turso/libSQL when
`TURSO_DATABASE_URL` is configured, local SQLite during development, and Vercel
Blob only when explicitly configured with `WIRE_CLOUD_BACKEND=blob`.

When Turso/libSQL is active, the playground keeps the canonical JSON documents in
`wire_kv` and also mirrors queryable product records into `wire_users`,
`wire_user_events`, `wire_documents`, `wire_versions`, and
`wire_chat_messages`. User OpenAI keys are stored encrypted in
`wire_user_openai_keys`, with a KV copy kept for compatibility. Chat message rows
include model, cost, and token-count columns so LLM usage accounting can be
queried without reading the canonical JSON blob.
