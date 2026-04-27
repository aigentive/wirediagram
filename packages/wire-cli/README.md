# @aigentive/wire-cli

Author Wire diagrams from the command line.

## Install

```bash
npm install -g @aigentive/wire-cli
```

Or run via npx without installing:

```bash
npx @aigentive/wire-cli help
```

## Usage

```bash
# Create from template
wire init my-flow --template=approval-flow

# Add nodes
wire add ai --diagram=my-flow --title="Classify intent" --from=incoming --model=gpt-4.1
wire add condition --diagram=my-flow --title="Route" --from=classify --branches=sales,support,other

# Validate
wire validate my-flow

# Export
wire export my-flow --format=svg --out=my-flow.svg
wire export my-flow --format=mermaid
wire export my-flow --format=json

# List diagrams
wire ls
```

Diagrams are stored as JSON in `./diagrams/<id>.json` by default. Override via `--dir=<path>` or `WIRE_DIR=<path>`.

## License

MIT
