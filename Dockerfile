# syntax=docker/dockerfile:1.7
#
# Wire MCP server — HTTP transport.
#
# Builds the monorepo, then ships only what wire-mcp needs to run.
# Designed for Fly, Render, Cloud Run, or any container host.

FROM node:20-bookworm-slim AS build
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/wire-core/package.json packages/wire-core/tsconfig.json ./packages/wire-core/
COPY packages/wire-renderers/package.json packages/wire-renderers/tsconfig.json ./packages/wire-renderers/
COPY packages/wire-mcp/package.json packages/wire-mcp/tsconfig.json ./packages/wire-mcp/
COPY packages/wire-react/package.json packages/wire-react/tsconfig.json ./packages/wire-react/
COPY packages/wire-cli/package.json packages/wire-cli/tsconfig.json ./packages/wire-cli/

# Install full dev deps so `tsc` is available during build. Pruned in the
# runtime stage below.
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

COPY packages ./packages

RUN npm run build:core \
 && npm run build --workspace @aigentive/wire-renderers \
 && npm run build --workspace @aigentive/wire-mcp

# ── runtime ───────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    WIRE_STORAGE_DIR=/data/diagrams \
    WIRE_HTTP_PORT=3860 \
    WIRE_HTTP_HOST=0.0.0.0

COPY --from=build /workspace/package.json /workspace/package-lock.json /workspace/tsconfig.base.json ./
COPY --from=build /workspace/packages/wire-core ./packages/wire-core
COPY --from=build /workspace/packages/wire-renderers ./packages/wire-renderers
COPY --from=build /workspace/packages/wire-mcp ./packages/wire-mcp
COPY --from=build /workspace/node_modules ./node_modules

RUN mkdir -p /data/diagrams && useradd --uid 1001 --create-home wire && chown -R wire:wire /app /data
USER wire

EXPOSE 3860
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.WIRE_HTTP_PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/wire-mcp/dist/server.js", "--http"]
