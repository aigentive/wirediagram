# Wire examples

Each `*.json` here is a canonical Wire diagram. They render via:

```bash
# render to SVG using the CLI
wire export agent-router --format=svg --out=out/agent-router.svg --dir=./examples

# or load into the MCP server
WIRE_STORAGE_DIR=./examples node packages/wire-mcp/dist/server.js
```

| File | What it shows |
|---|---|
| `agent-router.json` | Webhook → classify → branch route. |
| `refund-approval.json` | Threshold-gated refund with human-in-the-loop, tool call, memory write. |
| `rag-pipeline.json` | RAG with rerank, self-critique, conditional retry. |

Open them in the playground:

```
http://localhost:3870/preview/inline?d=$(node -e 'console.log(Buffer.from(require("fs").readFileSync("./examples/agent-router.json")).toString("base64url"))')
```

Or copy the JSON and POST it to `/api/render`:

```bash
curl -X POST http://localhost:3870/api/render \
  -H "content-type: application/json" \
  --data-binary @examples/agent-router.json \
  -o agent-router.svg
```
