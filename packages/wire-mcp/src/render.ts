/**
 * SVG / PNG / summary helpers for the MCP server. SVG comes from
 * @aigentive/wire-core's canonical renderer. PNG is rasterized via
 * @resvg/resvg-js when installed; otherwise we degrade to SVG with a
 * clear note so agents can fail visibly rather than silently producing
 * the wrong content type.
 */
import { renderToSvg, type WireDiagram } from "@aigentive/wire-core";

export interface RenderResult {
  contentType: string;
  body: string;
  /** Base64-encoded body when binary. */
  bodyBase64?: string;
}

export function renderSvg(diagram: WireDiagram, padding = 24): RenderResult {
  const svg = renderToSvg(diagram, { padding });
  return { contentType: "image/svg+xml", body: svg };
}

export async function renderPng(diagram: WireDiagram): Promise<RenderResult> {
  const svg = renderSvg(diagram);
  // @resvg/resvg-js is an optional dep; resolve via Function so TS doesn't
  // require its types at build time.
  const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<unknown>;
  let resvg: { Resvg: new (svg: string) => { render(): { asPng(): Buffer } } } | undefined;
  try {
    resvg = (await dynamicImport("@resvg/resvg-js")) as typeof resvg;
  } catch {
    return { contentType: "image/svg+xml", body: svg.body };
  }
  if (!resvg) {
    return { contentType: "image/svg+xml", body: svg.body };
  }
  const r = new resvg.Resvg(svg.body);
  const png = r.render().asPng();
  return {
    contentType: "image/png",
    body: "",
    bodyBase64: png.toString("base64")
  };
}

export function summarizeDiagram(diagram: WireDiagram): string {
  const counts = new Map<string, number>();
  for (const n of diagram.nodes) {
    counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
  }
  const summary = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, c]) => `${c} ${k}${c === 1 ? "" : "s"}`)
    .join(", ");

  const triggers = diagram.nodes.filter((n) => n.kind === "trigger").map((n) => n.title);
  const ends = diagram.nodes.filter((n) => n.kind === "end").map((n) => n.title);
  const branches = diagram.nodes
    .filter((n) => n.kind === "condition")
    .flatMap((n) => (n.kind === "condition" ? n.branches : []));
  const lines = [
    `Diagram: ${diagram.title ?? diagram.id ?? "<untitled>"}`,
    `Layout: ${diagram.layout}`,
    `Nodes (${diagram.nodes.length}): ${summary}`
  ];
  if (triggers.length) lines.push(`Trigger(s): ${triggers.join(", ")}`);
  if (ends.length) lines.push(`End(s): ${ends.join(", ")}`);
  if (branches.length) lines.push(`Decision branches: ${branches.join(", ")}`);
  if (diagram.description) lines.push(`Description: ${diagram.description}`);
  return lines.join("\n");
}
