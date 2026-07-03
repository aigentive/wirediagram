# @aigentive/wire-renderers

Render Wire diagrams. Two surfaces:

1. **`renderToSvg(diagram)`** — pure server-side SVG renderer. No React, no DOM. Used by the MCP server for `render_svg` and by the CLI for `wire export`.
2. **`toReactFlow(diagram)`** — compatibility adapter that returns graph-shaped `nodes` + `edges` for apps that still maintain their own third-party graph canvas.

## Install

```bash
npm install @aigentive/wire-renderers
```

## Use

```ts
import { renderToSvg } from "@aigentive/wire-renderers";
import { writeFileSync } from "node:fs";

const svg = renderToSvg(diagram, { padding: 24, background: "#fafafa" });
writeFileSync("./diagram.svg", svg);
```

For React apps, prefer the native `<WireCanvas>` from `@aigentive/wire-react`. Use `toReactFlow` only as an interop adapter for an app that already owns a separate graph canvas.

## License

Apache-2.0
