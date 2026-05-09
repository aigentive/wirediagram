# Style gallery

Sample diagrams that exercise the renderer's style-config props (per-node
`style`, per-edge `style`, `fromHandle`/`toHandle`, routing modes,
diagram-level defaults via `RenderSvgOptions`).

Each entry has a self-contained `.json` (the diagram), a `.svg`, and a
`.png` rendered through `@aigentive/wire-core`'s `renderToSvg` plus
`@resvg/resvg-js`. Regenerate with:

```bash
npm run build:core
node scripts/render-style-gallery.mjs
```

## Themes

| Sample | Look | What it shows |
|---|---|---|
| `theme-dark` | ![](theme-dark.png) | Dark canvas + per-kind accent strokes. Uses `RenderSvgOptions.background` and per-node `style.fill` / `stroke` / `textColor`. |
| `theme-blueprint` | ![](theme-blueprint.png) | Engineering schematic — squared corners (`borderRadius: 0`), white-on-blue, dashed edges. |
| `theme-pastel` | ![](theme-pastel.png) | Soft cards with `borderRadius: 24` and `shadow: true`; per-kind pastel fills. |
| `theme-mono` | ![](theme-mono.png) | Stroke-only, dashed borders on every node and edge — diagram-level `edgeStyle.strokeDasharray`. |
| `theme-neon` | ![](theme-neon.png) | Black canvas, neon strokes. Each edge sets its own color via `edge.style.stroke`. |

## Feature showcases

| Sample | Look | What it shows |
|---|---|---|
| `feature-routing-modes` | ![](feature-routing-modes.png) | All four `routing` values — `bezier`, `smoothstep`, `step`, `straight` — from one source to four targets. |
| `feature-edge-markers` | ![](feature-edge-markers.png) | `markerEnd: "arrow" \| "circle" \| "diamond" \| "none"`. Marker `<defs>` are deduplicated by shape + color. |
| `feature-edge-styles` | ![](feature-edge-styles.png) | Stroke color / width / dasharray / curvature combinations. |
| `feature-handles` | ![](feature-handles.png) | `fromHandle` + `toHandle` pin specific edges to specific node sides (top/bottom/left/right). |
| `feature-node-styles` | ![](feature-node-styles.png) | Per-node `style` props side by side — tone defaults, custom fill, dashed border, big radius, drop shadow, faded opacity. |
| `feature-fanin-slots` | ![](feature-fanin-slots.png) | Five incoming edges to one side auto-distribute between 25% and 75% of the side length (no manual offset config needed). |

## Vertical (TB) variants

Same showcases laid out top-to-bottom — useful when the diagram needs to
fit a portrait/narrow surface or live inside vertically-scrolling docs.
The default handle pair for `layout: "TB"` is `bottom → top`, so flow
runs downward.

| Sample | Look |
|---|---|
| `theme-dark-tb` | ![](theme-dark-tb.png) |
| `theme-blueprint-tb` | ![](theme-blueprint-tb.png) |
| `theme-pastel-tb` | ![](theme-pastel-tb.png) |
| `theme-mono-tb` | ![](theme-mono-tb.png) |
| `theme-neon-tb` | ![](theme-neon-tb.png) |
| `feature-routing-modes-tb` | ![](feature-routing-modes-tb.png) |
| `feature-edge-markers-tb` | ![](feature-edge-markers-tb.png) |
| `feature-edge-styles-tb` | ![](feature-edge-styles-tb.png) |
| `feature-handles-tb` | ![](feature-handles-tb.png) |
| `feature-node-styles-tb` | ![](feature-node-styles-tb.png) |
| `feature-fanin-slots-tb` | ![](feature-fanin-slots-tb.png) |

## Reusing a theme

The themes that use diagram-level defaults (`theme-dark`, `theme-mono`,
`theme-pastel`, `theme-blueprint`, `theme-neon`) need their
`RenderSvgOptions` passed at render time:

```ts
import { renderToSvg } from "@aigentive/wire-core";

const svg = renderToSvg(diagram, {
  background: "#0b1120",
  edgeStyle: { stroke: "#64748b", strokeWidth: 1.5 },
  edgeLabelStyle: { fill: "#cbd5e1", background: "#1e293b", border: "#334155" }
});
```

Per-node and per-edge `style` props live inside the diagram JSON itself,
so any consumer (CLI, MCP server, playground) renders them without extra
configuration.
