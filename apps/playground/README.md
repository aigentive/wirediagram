# @aigentive/wire-playground

Next.js diagram playground for `@aigentive/wire`. It renders Wire diagrams in the browser, provides an interactive React editor through `@aigentive/wire-react`, stores shared canonical JSON in Vercel Blob or a local filesystem store, and acts as a render/preview service for MCP and hosted agents.

## Local

```bash
npm run dev:playground
# → http://localhost:3870
```

For a Dockerized local playground with filesystem-backed share tokens:

```bash
docker compose up -d --build wire-playground
# → http://localhost:3870
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Index — list of templates and quick links |
| `/playground` | LLM chat + editable Wire canvas. Uses `OPENAI_API_KEY` server-side and returns MCP-style tool traces. |
| `/preview/template/[name]` | Render a built-in template (`agent-workflow`, `approval-flow`, `rag-pipeline`) |
| `/preview/inline?d=<base64url-or-token>` | Render base64url canonical Wire JSON or a Blob/local share token |
| `/edit/inline?d=<base64url-or-token>` | Hydrate the React editor from inline JSON or a Blob/local share token |
| `POST /api/render` | Body: canonical JSON; returns `image/svg+xml` |
| `POST /api/validate` | Body: canonical JSON; returns the validation result |
| `POST /api/share` | Body: canonical JSON; validates, canonicalizes, stores `wires/{token}.json` in Vercel Blob or the local share store, and returns share URLs |
| `POST /api/playground/chat` | Body: `{ message, diagram, history }`; asks OpenAI to call Wire MCP-style tools and returns `{ diagram, validation, traces, message }` |
| `GET /api/blob/wires/[token][.json]` | Local Docker/dev share object endpoint when `WIRE_SHARE_BACKEND=local` |
| _(MCP)_ | Run `wire-mcp --http` separately — playground does not host MCP. |

## Hosted Vercel

Designed to deploy to Vercel. Set `BLOB_PUBLIC_BASE_URL` so token URLs can load
`wires/{token}.json`; Vercel Blob write credentials are used by `/api/share`.
See [DEPLOY.md](../../docs/DEPLOY.md) for instructions.

For local Docker/dev without Vercel Blob, set `WIRE_SHARE_BACKEND=local` and
`WIRE_SHARE_DIR` to a writable directory. The compose file does this with the
`wire-shares` named volume.

## License

MIT
