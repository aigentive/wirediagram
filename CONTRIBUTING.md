# Contributing to Wire

## Repo layout

```
packages/
  wire-core         — schema, validation, normalization, layout
  wire-renderers    — React Flow / xyflow adapter
  wire-react        — JSX facade
  wire-mcp          — MCP server (stdio + HTTP)
  wire-cli          — CLI binary
apps/
  playground        — Next.js diagram playground / preview
docs/
  DEPLOY.md         — local + cloud deployment instructions
  MCP_CLIENTS.md    — MCP client setup and tool-prefix guidance
examples/
  *                 — example Wire JSON diagrams
```

## Local dev

```bash
npm install
npm run build
npm test
```

Test only one package:

```bash
npm test --workspace @aigentive/wire-core
```

## Adding a node kind

1. Add the kind to `WireNodeKindSchema` in `packages/wire-core/src/schema.ts`.
2. If the kind has new structural rules (required `from`, `branches`, etc.), update validation in `packages/wire-core/src/validation.ts`.
3. Add a renderer to `packages/wire-renderers/src/nodes/`.
4. Add a JSX wrapper to `packages/wire-react/src/nodes.tsx`.
5. Document in the per-package README.

## Commit style

Short, imperative, lowercase. Example:

```
add condition branch resolver to wire-core
```

## License

By contributing you agree your contributions are MIT-licensed.
