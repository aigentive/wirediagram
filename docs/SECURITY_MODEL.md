# Wire Security Model

Wire has three primary execution surfaces: the React editor/playground, public
share and render routes, and the MCP server. All three read and write canonical
`WireDiagram` JSON, so the main security rule is to validate at boundaries and
keep raw user content out of privileged execution contexts.

## Trust Boundaries

| Boundary | Trusted side | Untrusted side | Controls |
|---|---|---|---|
| Browser editor to playground APIs | Authenticated session or API key | Request body, route params, public headers | Current-user lookup, API-key scopes, schema parsing, quota checks |
| Public share links | Stored bearer token metadata | Anyone with token URL | Token entropy, expiry, revoke/rotate APIs, edit write throttling |
| MCP stdio | Local client process | Tool params from agent/model | Schema validation, reducer actions, audit logging |
| MCP HTTP | Server process and configured clients | Network callers and browser origins | Loopback default, remote opt-in, bearer token, origin guard |
| SVG/PNG rendering | Renderer implementation | Diagram labels, styles, metadata | Text escaping, SVG attribute escaping, color allowlisting |
| Persistence | Cloud/local store | Stored JSON loaded back into runtime | Canonical parsing, path guards, owner-key checks |

## Public Routes

Public routes intentionally exist for read-only embeds and public edit links:

| Route | Access | Notes |
|---|---|---|
| `/s/<viewToken>` and raw variants | Public bearer token | View token must be active and unexpired. Raw SVG/PNG/JSON/Mermaid are generated from parsed canonical JSON. |
| `/e/<editToken>` | Public bearer token | Edit token must be active, unexpired, and edit-scoped. |
| `/api/shares/<token>` | Public bearer token | `GET` resolves view/edit shares. `PATCH` is edit-only and write-throttled. |
| `/preview/inline` and `/edit/inline` | Legacy public preview/edit input | Accepts encoded diagram input or redirects legacy share tokens to token routes. |
| `/api/render` and `/api/validate` | Public utility APIs | Treat body as untrusted canonical JSON and parse before use. |

Never trust client-supplied identity headers on public routes. Authenticated
routes must derive identity from the session or API-key store. In-process code
that needs a known user should call server-only helpers directly rather than
round-tripping through forgeable HTTP headers.

## Bearer Share Links

Share links are bearer credentials. Anyone who has a live token has the matching
capability.

- View and edit tokens are separate.
- Edit shares also include a view token for embeds.
- Owners can list, revoke, and rotate links.
- Owners can set an expiry at creation time.
- Expired and revoked tokens fail for page routes, raw asset routes, and share
  APIs.
- Public edit saves are rate-limited per token and written to the activity log
  separately from owner edits.

Do not log full share tokens outside owner-facing management surfaces. Operational
logs should redact keys, tokens, prompts, diagrams, and action payloads.

## MCP HTTP Exposure

Stdio is the default MCP deployment mode for local clients. HTTP is for
multi-client or network deployment and has stricter requirements:

- The default HTTP host is loopback-only.
- Binding a non-loopback host requires either `WIRE_MCP_TOKEN` or the explicit
  `WIRE_HTTP_UNSAFE_ALLOW_REMOTE=true` opt-in.
- When `WIRE_MCP_TOKEN` is configured, `/mcp`, `/ready`, and `/health` require
  `Authorization: Bearer <token>`.
- Browser requests with unexpected `Origin` are rejected.
- Session ids are validated, capped, and expired.

Use a reverse proxy or platform gateway for TLS, network ACLs, and additional
auth when exposing MCP HTTP outside localhost.

## SVG Rendering Rules

Wire diagrams may include user-controlled labels, metadata, and style values.
Renderers must never concatenate those values into raw SVG without escaping.

- Escape text content and every interpolated SVG attribute value.
- Only allow safe color values for fields intended to be colors.
- Reject or replace values containing `url(...)`, quotes, angle brackets,
  semicolons, control characters, or unsupported color functions.
- Do not rely on React escaping when the final SVG is inserted with
  `dangerouslySetInnerHTML` or returned as raw `image/svg+xml`.

The renderer should fail closed to default colors when a style value is unsafe.

## Secret Management

All HMAC, hashing, and encryption paths must use the shared app-secret helper.

- Production requires `AUTH_SECRET` or `NEXTAUTH_SECRET`.
- Development and tests may fall back to `wire-local-dev-secret`.
- API-key hashes, user storage keys, IP quota hashes, and stored OpenAI-key
  encryption all use the same production fail-closed rule.

Rotating the app secret invalidates derived storage keys and encrypted values.
Treat that as a migration event, not a routine deployment change.

## Validation And History

Editor, API, and MCP writes should use reducer-backed `WireAction` mutations
where possible. Single actions and batches both preserve inverse history in the
React provider, and validation runs after the logical write. Direct diagram
replacement remains available for import and recovery flows, but it should still
pass through canonical parsing before persistence or rendering.

