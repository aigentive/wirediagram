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

After `npm install` and `npm run build`, point your MCP client at:

```json
{
  "mcpServers": {
    "wire": {
      "command": "node",
      "args": ["/absolute/path/to/wire/packages/wire-mcp/dist/server.js"],
      "env": {
        "WIRE_STORAGE_DIR": "/Users/me/Documents/wire-diagrams"
      }
    }
  }
}
```

Other MCP clients use the same shape: command, args, and env. The visible tool
names depend on the host. Some clients expose bare names such as
`create_diagram`; others prefix the configured server name, such as
`wire__create_diagram` or `mcp__wire__create_diagram`.

---

## Local — HTTP (network clients)

```bash
node packages/wire-mcp/dist/server.js --http
# → http://127.0.0.1:3860/mcp + http://127.0.0.1:3860/health
```

Set `WIRE_HTTP_PORT` to change port; set `WIRE_HTTP_HOST=0.0.0.0` to expose on the LAN.

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
# Playground shares persist in the `wire-shares` named volume.
```

The compose playground uses `WIRE_SHARE_BACKEND=local`, so `/api/share`,
`/edit/inline?d=<token>`, and `/preview/inline?d=<token>` work without Vercel
Blob. Production Vercel deploys should keep using Vercel Blob.

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

Set these environment variables for production share links:

| Variable | Required | Purpose |
|---|---:|---|
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob write token used by `/api/share` |
| `BLOB_PUBLIC_BASE_URL` | yes | Public base URL used to read `wires/{token}.json` |
| `WIRE_SHARE_BACKEND` | no | Leave unset on Vercel; set `local` only for local/dev filesystem shares |

The repo-root `vercel.json` directs the Vercel build to `apps/playground/.next`.
Routes available after deploy:

- `/` — index + template list
- `/preview/template/[name]` — render a built-in template
- `/preview/inline?d=<base64url-or-token>` — render an inlined diagram or stored share token
- `/edit/inline?d=<base64url-or-token>` — open the React editor for an inline diagram or stored share token
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
to surface a diagram in chat, it can call `render_svg` or `render_preview`. Users
opening the playground get the browser editor/viewer for the same canonical JSON
model.

---

## Storage backends

The default storage is the local filesystem (`WIRE_STORAGE_DIR`). For multi-instance cloud deploys, plug in your own backend by implementing the `StorageBackend` interface from `@aigentive/wire-mcp/dist/storage.js` and passing it to `createServer({ storage })` in a thin wrapper script. Likely options:

- A Postgres / Neon table keyed on diagram id
- Vercel Blob with a `wire/{id}.json` key
- S3 / R2 with object versioning for diagram history

A reference implementation lives on the roadmap; PRs welcome.
