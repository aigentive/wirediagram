# Wire MCP npm Publish Handoff

Date: 2026-04-29
Repo: `/Users/admin/Documents/Github/reefagent-mcp-wire`
Branch: `enhance-react-components`

## Status

Publishing is complete.

Published packages:

```text
@aigentive/wire-core@1.0.0
@aigentive/wire-mcp@1.0.3
```

`@aigentive/wire-mcp@1.0.0` was also published, `1.0.1` fixed npm `.bin`
symlink startup for `npx`, `1.0.2` added cloud-default preview URLs, and
`1.0.3` adds token-scoped cloud share/embed URLs.

Use:

```bash
npx -y @aigentive/wire-mcp@latest
```

## Original Goal

Publish the MCP package so this command works from any machine:

```bash
npx -y @aigentive/wire-mcp@latest
```

This is needed so Claude Code/Codex MCP configs can start the Wire MCP server from npm and sync authenticated cloud wires.

## Current Status

The package already exists in this monorepo:

```text
packages/wire-mcp
```

Do not scaffold a new package.

Important correction: the executable is `dist/server.js`, not `dist/index.js`.

```json
{
  "name": "@aigentive/wire-mcp",
  "version": "1.0.0",
  "main": "dist/server.js",
  "types": "dist/server.d.ts",
  "bin": {
    "wire-mcp": "dist/server.js"
  }
}
```

`@aigentive/wire-mcp` depends on `@aigentive/wire-core`, so `wire-core` must be published first.

## Local Changes Already Made

Both packages were changed from GitHub Packages to npmjs:

```json
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org/"
}
```

Files changed:

```text
packages/wire-core/package.json
packages/wire-mcp/package.json
```

These changes are required for public `npx -y @aigentive/wire-mcp` to resolve from npmjs.

## Verification Already Completed

Authenticated npm user:

```bash
npm whoami --registry=https://registry.npmjs.org/
# themefy
```

Package availability check:

```bash
npm view @aigentive/wire-core version --registry=https://registry.npmjs.org/
# 404 Not Found

npm view @aigentive/wire-mcp version --registry=https://registry.npmjs.org/
# 404 Not Found
```

Install:

```bash
npm install
# passed
```

Build:

```bash
npm run build
# passed
```

Executable/shebang:

```bash
ls -l packages/wire-mcp/dist/server.js
# executable bit is set

head -1 packages/wire-mcp/dist/server.js
# #!/usr/bin/env node
```

Pack previews:

```bash
npm pack --dry-run --workspace @aigentive/wire-core
# passed
# package: @aigentive/wire-core@1.0.0
# package size: 53.3 kB
# total files: 46

npm pack --dry-run --workspace @aigentive/wire-mcp
# passed
# package: @aigentive/wire-mcp@1.0.3
# package size: 39.1 kB
# total files: 34
```

Stdio startup smoke test:

```bash
node -e "const {spawn}=require('node:child_process'); const p=spawn(process.execPath,['packages/wire-mcp/dist/server.js'],{stdio:['pipe','pipe','pipe']}); let err=''; p.stderr.on('data',d=>{err+=d}); setTimeout(()=>p.kill('SIGTERM'),800); p.on('exit',()=>{console.log(err.trim()); if(!err.includes('stdio transport ready')) process.exit(1);});"
```

Result:

```text
[wire-mcp] stdio transport ready (storage=/Users/admin/.wire/diagrams, cloud=disabled)
```

## Resolved Blocker

The first publish attempt failed because npm required publish 2FA:

```text
npm error code E403
npm error 403 Forbidden - PUT https://registry.npmjs.org/@aigentive%2fwire-core
npm error 403 Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

The user has a security key, not a 6-digit authenticator OTP. npm CLI publish accepts `--otp <otp>` for authenticator codes, but not a WebAuthn/security-key touch directly.

Resolved by setting a granular npm token locally:

```bash
npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN
```

## Publish Commands Used

Publish core first:

```bash
npm publish --workspace @aigentive/wire-core --access public --registry=https://registry.npmjs.org/
```

Then publish MCP:

```bash
npm publish --workspace @aigentive/wire-mcp --access public --registry=https://registry.npmjs.org/
```

After `1.0.0` exposed the npm bin symlink issue, `wire-mcp` was bumped and
published again:

```bash
npm publish --workspace @aigentive/wire-mcp --access public --registry=https://registry.npmjs.org/
# published @aigentive/wire-mcp@1.0.3
```

## Verify After Publish

```bash
npm view @aigentive/wire-core --registry=https://registry.npmjs.org/
npm view @aigentive/wire-mcp --registry=https://registry.npmjs.org/
```

Smoke test `npx`:

```bash
npx -y @aigentive/wire-mcp@latest --http
```

In another terminal:

```bash
curl -sS http://127.0.0.1:3860/health
```

Expected local-only health:

```json
{
  "ok": true,
  "server": "@aigentive/wire-mcp",
  "storage": "/Users/admin/.wire/diagrams",
  "cloud": {
    "enabled": false,
    "url": null
  },
  "sessions": 0
}
```

Smoke test cloud mode:

```bash
WIRE_CLOUD_URL='https://reefagent-mcp-wire.vercel.app' \
WIRE_CLOUD_API_KEY='wire_sk_live_REAL_KEY' \
npx -y @aigentive/wire-mcp@latest --http
```

Then:

```bash
curl -sS http://127.0.0.1:3860/health
```

Expected cloud-backed health:

```json
{
  "cloud": {
    "enabled": true,
    "url": "https://reefagent-mcp-wire.vercel.app"
  }
}
```

Claude Code config should work after npm publish:

```bash
claude mcp add wire \
  --env WIRE_CLOUD_URL='https://reefagent-mcp-wire.vercel.app' \
  --env WIRE_CLOUD_API_KEY='wire_sk_live_REAL_KEY' \
  -- npx -y @aigentive/wire-mcp@latest
```

Important: restart Claude Code or open a new session after adding the MCP server. Existing Claude sessions will not automatically gain `wire__*` tools.

## Common Failure Modes

- `403 Forbidden`: npm account lacks org publish access, missing `--access public`, or 2FA publish requirement is not satisfied.
- `EPUBLISHCONFLICT`: version already exists on npm. Bump version; npm does not allow republishing the same version.
- `npx` installs but cannot resolve `@aigentive/wire-core`: publish `@aigentive/wire-core` first.
- `npx` starts but cloud list is empty: confirm real `WIRE_CLOUD_API_KEY`, not placeholder, and check `/health` has `cloud.enabled: true`.
- `localhost:3860` shows `cloud.enabled: false`: an old local-only HTTP server is still running. Stop it and restart with cloud env vars.

## Secret Gist Upload

GitHub CLI auth is currently invalid on this machine:

```text
gh auth status
# token in GH_TOKEN is invalid
# default token is invalid
```

After GitHub auth is fixed:

```bash
gh auth login -h github.com
gh gist create docs/WIRE_MCP_NPM_PUBLISH_HANDOFF.md --secret --desc "Wire MCP npm publish handoff"
```

GitHub calls this a "secret gist"; it is not listed publicly, but anyone with the URL can view it.
