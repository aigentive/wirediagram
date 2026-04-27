# @aigentive/wire-renderers

Render Wire diagrams. Two surfaces:

1. **`toReactFlow(diagram)`** — convert to `@xyflow/react` `nodes` + `edges`. Use in browsers / Next.js apps.
2. **`renderToSvg(diagram)`** — pure server-side SVG renderer. No React, no DOM. Used by the MCP server for `render_svg` and by the CLI for `wire export`.

## Install

```bash
npm install @aigentive/wire-renderers @xyflow/react
```

## Use

```tsx
import { ReactFlow, Background, Controls } from "@xyflow/react";
import { toReactFlow } from "@aigentive/wire-renderers";
import { parseWireDiagram } from "@aigentive/wire-core";
import "@xyflow/react/dist/style.css";

const diagram = parseWireDiagram(/* … */);
const { nodes, edges } = toReactFlow(diagram);

export default function DiagramView() {
  return (
    <div style={{ height: 600 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

To customize node rendering, pass your own `nodeTypes` to `<ReactFlow>` keyed by `wire-trigger`, `wire-ai`, `wire-action`, etc. Each node receives `data: { title, description, kind, tone, toneClass, wire }`.

### Server-side SVG export

```ts
import { renderToSvg } from "@aigentive/wire-renderers";
import { writeFileSync } from "node:fs";

const svg = renderToSvg(diagram, { padding: 24, background: "#fafafa" });
writeFileSync("./diagram.svg", svg);
```

## License

MIT
