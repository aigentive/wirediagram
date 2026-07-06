# @aigentive/wire-cli

Author, validate, and export canonical Wire diagrams from the command line.

The CLI writes `WireDiagram` JSON files. SVG, Mermaid, and JSON exports are
derived artifacts; `WireDiagram` remains the source of truth.

## Install

```bash
npm install -g @aigentive/wire-cli
```

Or run with `npx`:

```bash
npx @aigentive/wire-cli help
```

## Quickstart

```bash
# Create from a built-in template.
wire init my-flow --template=approval-flow --title="Approval flow"

# Add nodes. Connections are target-centric: --from is the source id.
wire add ai --diagram=my-flow --id=classify --title="Classify intent" --from=incoming --model=intent-classifier
wire add tool --diagram=my-flow --id=search-crm --title="Search CRM" --from=classify --ref=crm.search
wire add condition --diagram=my-flow --id=route --title="Route" --from=classify --branches=sales,support,other
wire add action --diagram=my-flow --id=sales --title="Create sales lead" --from=route.sales

# Validate before export.
wire validate my-flow

# Export derived artifacts.
wire export my-flow --format=svg --out=my-flow.svg
wire export my-flow --format=mermaid --out=my-flow.mmd
wire export my-flow --format=json --out=my-flow.json

# List diagrams, newest first.
wire ls
```

## Commands

| Command | Purpose |
|---|---|
| `wire init <id>` | Create a new diagram. Supports `--title`, `--layout=LR|TB|RL|BT`, and `--template=agent-workflow|approval-flow|rag-pipeline`. |
| `wire add <kind>` | Append a node. Requires `--diagram=<id>` and `--title`. Supports `--id`, `--description`, `--from`, `--branch`, `--branches`, `--model`, `--tools`, `--ref`, `--body`, and `--tone`. |
| `wire validate <id>` | Run schema and structural validation. Exits non-zero when validation errors exist. |
| `wire export <id>` | Export `--format=svg|json|mermaid`, optionally with `--out=<path>`. |
| `wire ls` | List local diagrams in recency order. |
| `wire help` | Print command help. |

`--tools=a,b` is for `ai` nodes. Use `--ref=<tool.name>` for `tool` nodes.

## Storage

Diagrams are stored as JSON in `./diagrams/<id>.json` by default. Override with
`--dir=<path>` per command or `WIRE_DIR=<path>` for the process.

To share a local directory with the MCP server, point `WIRE_DIR` and
`WIRE_STORAGE_DIR` at the same path.

## Validation

Validation returns stable issue codes and hints from `@aigentive/wire-core`.
Treat validation errors as blocking for render/share/export workflows. Warnings
are non-blocking but should be reviewed, especially warnings about stripped
fields such as `source`, `target`, `next`, or `connectsTo`.

## License

Apache-2.0
