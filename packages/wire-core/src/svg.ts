/**
 * Pure server-side SVG renderer. No DOM, no React. Used directly by:
 *   - @aigentive/wire-cli (wire export --format=svg)
 *   - @aigentive/wire-mcp (render_svg tool, wire://diagrams/{id}.svg)
 *   - @aigentive/wire-renderers (re-exported as renderToSvg)
 *
 * Supports per-node and per-edge style overrides, per-node handle anchors
 * (which sides edges may attach to), and four routing strategies. Falls
 * back to tone-derived defaults when nothing is specified.
 */
import { layoutDiagram } from "./layout.js";
import type {
  WireDiagram,
  WireNode,
  Tone,
  LayoutDirection,
  Side,
  EdgeStyle,
  EdgeLabelStyle,
  EdgeRouting,
  EdgeMarker,
  NodeStyle
} from "./schema.js";
import type { ResolvedEdge } from "./normalize.js";

const KIND_GLYPH: Record<WireNode["kind"], string> = {
  trigger: "▶",
  action: "→",
  ai: "✦",
  tool: "✱",
  condition: "?",
  human: "◉",
  memory: "⊙",
  retrieval: "⊕",
  guardrail: "◆",
  end: "■",
  note: "✎",
  group: "▣"
};

const KIND_SHAPE: Record<WireNode["kind"], "rect" | "rounded" | "diamond" | "ellipse" | "note" | "group"> = {
  trigger: "ellipse",
  action: "rounded",
  ai: "rounded",
  tool: "rounded",
  condition: "diamond",
  human: "rounded",
  memory: "rounded",
  retrieval: "rounded",
  guardrail: "rounded",
  end: "ellipse",
  note: "note",
  group: "group"
};

interface ToneColor {
  fill: string;
  stroke: string;
  text: string;
}

const TONE_COLORS: Record<NonNullable<Tone>, ToneColor> = {
  default: { fill: "#ffffff", stroke: "#d4d4d8", text: "#18181b" },
  success: { fill: "#ecfdf5", stroke: "#34d399", text: "#064e3b" },
  warning: { fill: "#fffbeb", stroke: "#fbbf24", text: "#78350f" },
  error: { fill: "#fff1f2", stroke: "#fb7185", text: "#881337" },
  info: { fill: "#f0f9ff", stroke: "#38bdf8", text: "#0c4a6e" },
  ai: { fill: "#f5f3ff", stroke: "#a78bfa", text: "#4c1d95" }
};

const TITLE_FONT_PX = 13;
const TITLE_LINE_PX = 18;
const DESC_FONT_PX = 11;
const DESC_LINE_PX = 14;
const TITLE_WRAP_CHARS = 24;
const DESC_WRAP_CHARS = 28;
const TITLE_CHAR_W = 7.4;
const DESC_CHAR_W = 6.2;

const DEFAULT_EDGE_STROKE = "#475569";
const DEFAULT_EDGE_WIDTH = 1.5;
const DEFAULT_LABEL_FILL = "#334155";
const DEFAULT_LABEL_BG = "#ffffff";
const DEFAULT_LABEL_BORDER = "#cbd5e1";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > max) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += max) {
        const chunk = word.slice(i, i + max);
        if (i + max < word.length) lines.push(chunk);
        else current = chunk;
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export interface RenderSvgOptions {
  /** Padding around the diagram bounds (px). Default 24. */
  padding?: number;
  /** Background color. Default white. */
  background?: string;
  /** Custom tone color map. */
  toneColors?: Partial<Record<NonNullable<Tone>, ToneColor>>;
  /** Override title-line wrap width (chars). Default 24. */
  titleWrapChars?: number;
  /** Diagram-level default node style. Per-node `style` overrides this. */
  nodeStyle?: NodeStyle;
  /** Diagram-level default edge style. Per-edge `style` overrides this. */
  edgeStyle?: EdgeStyle;
  /** Diagram-level default edge label style. Per-edge `labelStyle` overrides this. */
  edgeLabelStyle?: EdgeLabelStyle;
  /** Diagram-level default edge routing. Per-edge `routing` overrides this. */
  edgeRouting?: EdgeRouting;
}

interface NodeDims {
  width: number;
  height: number;
  titleLines: string[];
  descLines: string[];
}

function nodeDims(node: WireNode, titleWrap: number): NodeDims {
  const glyph = KIND_GLYPH[node.kind];
  const titleLines = wrap(`${glyph} ${node.title}`, titleWrap);
  const descLines = node.description ? wrap(node.description, DESC_WRAP_CHARS) : [];

  const longestTitle = Math.max(0, ...titleLines.map((l) => l.length));
  const longestDesc = Math.max(0, ...descLines.map((l) => l.length));
  const widthFromText = Math.max(longestTitle * TITLE_CHAR_W, longestDesc * DESC_CHAR_W);
  const padX = node.kind === "note" ? 28 : node.kind === "condition" ? 60 : 36;
  const width = Math.max(node.size?.width ?? 220, Math.ceil(widthFromText + padX));

  const verticalContent = titleLines.length * TITLE_LINE_PX + (descLines.length ? descLines.length * DESC_LINE_PX + 4 : 0);
  const padY = node.kind === "note" ? 24 : 32;
  const height = Math.max(node.size?.height ?? 80, verticalContent + padY);

  return { width, height, titleLines, descLines };
}

interface BoxPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute an attach point on a node's bounding box for a given side, with
 * optional slot distribution when multiple edges share the same side.
 *
 * `slotIndex` is 0-based; `slotCount` is the total number of edges that
 * will attach to this side. Slots are distributed evenly between 25% and
 * 75% of the side length (avoids the corners and the dead-center stack-up).
 */
function attachPoint(
  pos: BoxPos,
  side: Side,
  kind: WireNode["kind"] | undefined,
  slotIndex: number,
  slotCount: number
): { x: number; y: number } {
  const cx = pos.x + pos.width / 2;
  const cy = pos.y + pos.height / 2;

  // Diamonds always anchor at the corner on the requested axis — slot
  // distribution doesn't make sense for a 4-pointed shape.
  if (kind === "condition") {
    if (side === "right") return { x: pos.x + pos.width, y: cy };
    if (side === "left") return { x: pos.x, y: cy };
    if (side === "top") return { x: cx, y: pos.y };
    return { x: cx, y: pos.y + pos.height };
  }

  const t = slotCount <= 1 ? 0.5 : 0.25 + (slotIndex / (slotCount - 1)) * 0.5;
  if (side === "right") return { x: pos.x + pos.width, y: pos.y + pos.height * t };
  if (side === "left") return { x: pos.x, y: pos.y + pos.height * t };
  if (side === "top") return { x: pos.x + pos.width * t, y: pos.y };
  return { x: pos.x + pos.width * t, y: pos.y + pos.height };
}

function defaultSides(direction: LayoutDirection): { from: Side; to: Side } {
  switch (direction) {
    case "LR": return { from: "right", to: "left" };
    case "RL": return { from: "left", to: "right" };
    case "TB": return { from: "bottom", to: "top" };
    case "BT": return { from: "top", to: "bottom" };
    default: return { from: "right", to: "left" };
  }
}

function resolveEdgeSide(
  edgeOverride: Side | undefined,
  nodeHandles: Side[] | undefined,
  fallback: Side
): Side {
  if (edgeOverride) return edgeOverride;
  const first = nodeHandles?.[0];
  if (first) return first;
  return fallback;
}

/** Outward-pointing unit vector for each handle side. */
function handleNormal(side: Side): { x: number; y: number } {
  switch (side) {
    case "right": return { x: 1, y: 0 };
    case "left": return { x: -1, y: 0 };
    case "top": return { x: 0, y: -1 };
    case "bottom": return { x: 0, y: 1 };
  }
}

/**
 * xyflow-style control offset: half the along-axis distance when the target
 * is "ahead" of the source on the handle's direction; small fallback curve
 * when the target is "behind" (the handle would have to U-turn).
 */
function controlOffset(distance: number, curvature: number): number {
  if (distance >= 0) return 0.5 * distance;
  return curvature * 25 * Math.sqrt(-distance);
}

interface EdgeGeom {
  path: string;
  /** All extremal points on the path — for viewBox bounds. */
  points: { x: number; y: number }[];
  /** Optional override for label position (curve apex). When null, caller falls back to straight-line position. */
  labelPos: { x: number; y: number } | null;
}

function edgePath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  sourceSide: Side,
  targetSide: Side,
  routing: EdgeRouting,
  curvature: number
): EdgeGeom {
  if (routing === "straight") {
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, end],
      labelPos: null
    };
  }

  const srcN = handleNormal(sourceSide);
  const tgtN = handleNormal(targetSide);
  const sourceVertical = sourceSide === "top" || sourceSide === "bottom";
  const targetVertical = targetSide === "top" || targetSide === "bottom";

  if (routing === "step") {
    if (!sourceVertical && !targetVertical) {
      const midX = (start.x + end.x) / 2;
      return {
        path: `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
        labelPos: null
      };
    }
    if (sourceVertical && targetVertical) {
      const midY = (start.y + end.y) / 2;
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
        labelPos: null
      };
    }
    if (sourceVertical) {
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: end.y }, end],
        labelPos: null
      };
    }
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, { x: end.x, y: start.y }, end],
      labelPos: null
    };
  }

  if (routing === "smoothstep") {
    const r = 12;
    if (!sourceVertical && !targetVertical) {
      const midX = (start.x + end.x) / 2;
      const dy = end.y - start.y;
      const sign = Math.sign(dy) || 1;
      const ry = Math.min(r, Math.abs(dy) / 2);
      return {
        path: `M ${start.x} ${start.y} L ${midX - r} ${start.y} Q ${midX} ${start.y} ${midX} ${start.y + sign * ry} L ${midX} ${end.y - sign * ry} Q ${midX} ${end.y} ${midX + r} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
        labelPos: null
      };
    }
    if (sourceVertical && targetVertical) {
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const sign = Math.sign(dx) || 1;
      const rx = Math.min(r, Math.abs(dx) / 2);
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${midY - r} Q ${start.x} ${midY} ${start.x + sign * rx} ${midY} L ${end.x - sign * rx} ${midY} Q ${end.x} ${midY} ${end.x} ${midY + r} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
        labelPos: null
      };
    }
    if (sourceVertical) {
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: end.y }, end],
        labelPos: null
      };
    }
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, { x: end.x, y: start.y }, end],
      labelPos: null
    };
  }

  // bezier (default).
  const distSrc = (end.x - start.x) * srcN.x + (end.y - start.y) * srcN.y;
  const distTgt = (start.x - end.x) * tgtN.x + (start.y - end.y) * tgtN.y;
  const isBackward = (distSrc < 0 || distTgt < 0) && sourceVertical === targetVertical;

  // Backward edge (target sits "behind" the handle direction): a vanilla
  // xyflow-style bezier produces control points that extend OUTWARD past
  // the source/target, wrapping the curve off-canvas. Instead we sweep
  // perpendicularly — out from the handle, over (or under) the diagram, and
  // back into the target's handle direction.
  if (isBackward) {
    const perpSign = -1; // default: above (negative-y) for horizontal handles, left for vertical
    const along = sourceVertical
      ? Math.abs(end.y - start.y) + Math.abs(end.x - start.x)
      : Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    const sweep = Math.max(80, Math.min(220, along * 0.25 + 40));
    const exit = 28;

    const cp1x = sourceVertical ? start.x + perpSign * sweep : start.x + srcN.x * exit;
    const cp1y = sourceVertical ? start.y + srcN.y * exit : start.y + perpSign * sweep;
    const cp2x = targetVertical ? end.x + perpSign * sweep : end.x + tgtN.x * exit;
    const cp2y = targetVertical ? end.y + tgtN.y * exit : end.y + perpSign * sweep;

    // Apex of cubic at t=0.5: B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
    const apexX = 0.125 * start.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * end.x;
    const apexY = 0.125 * start.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * end.y;

    return {
      path: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
      points: [start, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, end],
      labelPos: { x: apexX, y: apexY }
    };
  }

  const offSrc = controlOffset(distSrc, curvature);
  const offTgt = controlOffset(distTgt, curvature);

  let cp1x = start.x + srcN.x * offSrc;
  let cp1y = start.y + srcN.y * offSrc;
  let cp2x = end.x + tgtN.x * offTgt;
  let cp2y = end.y + tgtN.y * offTgt;

  // Diagonal blend: rotate end tangents toward the line direction so the
  // arrowhead aligns with the line when start/end are far apart on the
  // perpendicular axis. Capped at 0.7 (not 1.0) so the cubic never
  // collapses into a degenerate straight diagonal.
  if (sourceVertical === targetVertical) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const adx = Math.abs(end.x - start.x);
    const ady = Math.abs(end.y - start.y);
    const BLEND_CAP = 0.7;
    const blend = sourceVertical
      ? Math.min(BLEND_CAP, adx / (ady * 0.4 + 1))
      : Math.min(BLEND_CAP, ady / (adx * 0.4 + 1));
    if (sourceVertical) {
      cp1x = start.x + (midX - start.x) * blend;
      cp2x = end.x - (end.x - midX) * blend;
    } else {
      cp1y = start.y + (midY - start.y) * blend;
      cp2y = end.y - (end.y - midY) * blend;
    }
  }

  return {
    path: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
    points: [start, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, end],
    labelPos: null
  };
}

interface ResolvedEdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerEnd: EdgeMarker;
  markerStart: EdgeMarker;
  routing: EdgeRouting;
  curvature: number;
}

function resolveEdgeStyle(
  edge: ResolvedEdge,
  diagramDefault: EdgeStyle | undefined,
  diagramRouting: EdgeRouting | undefined
): ResolvedEdgeStyle {
  const merged: EdgeStyle = { ...(diagramDefault ?? {}), ...(edge.style ?? {}) };
  return {
    stroke: merged.stroke ?? DEFAULT_EDGE_STROKE,
    strokeWidth: merged.strokeWidth ?? DEFAULT_EDGE_WIDTH,
    strokeDasharray: merged.strokeDasharray,
    markerEnd: merged.markerEnd ?? "arrow",
    markerStart: merged.markerStart ?? "none",
    routing: edge.routing ?? diagramRouting ?? "bezier",
    curvature: merged.curvature ?? 0.5
  };
}

interface ResolvedNodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  textColor: string;
  borderRadius?: number;
  opacity: number;
  shadow: boolean;
}

function resolveNodeStyle(
  node: WireNode,
  toneColor: ToneColor,
  diagramDefault: NodeStyle | undefined
): ResolvedNodeStyle {
  const merged: NodeStyle = { ...(diagramDefault ?? {}), ...(node.style ?? {}) };
  return {
    fill: merged.fill ?? toneColor.fill,
    stroke: merged.stroke ?? toneColor.stroke,
    strokeWidth: merged.strokeWidth ?? 1.5,
    strokeDasharray: merged.strokeDasharray,
    textColor: merged.textColor ?? toneColor.text,
    borderRadius: merged.borderRadius,
    opacity: merged.opacity ?? 1,
    shadow: merged.shadow ?? false
  };
}

/** Sanitize a color string for use in an SVG id. */
function colorKey(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, "");
}

function markerId(shape: EdgeMarker, color: string, dir: "start" | "end"): string {
  return `wire-${shape}-${dir}-${colorKey(color)}`;
}

function markerDef(shape: EdgeMarker, color: string, dir: "start" | "end"): string {
  if (shape === "none") return "";
  const id = markerId(shape, color, dir);
  // Use orient="auto" everywhere (universally supported in headless
  // rasterizers like resvg) and markerUnits="userSpaceOnUse" so marker
  // size is independent of stroke width — otherwise a strokeWidth: 4
  // edge gets a 4× bigger arrowhead than a default-weight edge, which
  // looks broken in PNG output.
  //
  // For start markers we MIRROR the marker shape (tip on the left side
  // of the viewBox) so when `auto` rotates the marker along the path
  // tangent, the tip ends up pointing backwards out of the start point
  // — the same visual we'd get from the unsupported `auto-start-reverse`.
  const u = ` markerUnits="userSpaceOnUse"`;
  if (shape === "arrow") {
    if (dir === "end") {
      return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10"${u} orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`;
    }
    return `<marker id="${id}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="10" markerHeight="10"${u} orient="auto"><path d="M10,0 L0,5 L10,10 z" fill="${color}"/></marker>`;
  }
  if (shape === "circle") {
    return `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8"${u} orient="auto"><circle cx="5" cy="5" r="4" fill="${color}"/></marker>`;
  }
  if (shape === "diamond") {
    const refX = dir === "end" ? 9 : 1;
    return `<marker id="${id}" viewBox="0 0 10 10" refX="${refX}" refY="5" markerWidth="10" markerHeight="10"${u} orient="auto"><path d="M0,5 L5,0 L10,5 L5,10 z" fill="${color}"/></marker>`;
  }
  return "";
}

const SHADOW_FILTER_ID = "wire-shadow";
const SHADOW_FILTER_DEF =
  `<filter id="${SHADOW_FILTER_ID}" x="-20%" y="-20%" width="140%" height="140%">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="3"/>` +
  `<feOffset dx="0" dy="2" result="offsetblur"/>` +
  `<feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>` +
  `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
  `</filter>`;

export function renderToSvg(diagram: WireDiagram, opts: RenderSvgOptions = {}): string {
  const padding = opts.padding ?? 24;
  const background = opts.background ?? "#ffffff";
  const toneColors = { ...TONE_COLORS, ...(opts.toneColors ?? {}) };
  const titleWrap = opts.titleWrapChars ?? TITLE_WRAP_CHARS;

  const dimsById = new Map<string, NodeDims>();
  for (const node of diagram.nodes) {
    dimsById.set(node.id, nodeDims(node, titleWrap));
  }

  const layout = layoutDiagram(diagram, { rankSep: 90, nodeSep: 60 });

  for (const lp of layout.nodes) {
    const dims = dimsById.get(lp.id);
    if (!dims) continue;
    if (dims.width !== lp.width || dims.height !== lp.height) {
      const dx = (dims.width - lp.width) / 2;
      const dy = (dims.height - lp.height) / 2;
      lp.x -= dx;
      lp.y -= dy;
      lp.width = dims.width;
      lp.height = dims.height;
    }
  }

  const positionsById = new Map(layout.nodes.map((p) => [p.id, p]));
  for (const node of diagram.nodes) {
    if (node.kind !== "group") continue;
    const childIds = diagram.nodes.filter((c: WireNode) => c.parent === node.id).map((c: WireNode) => c.id);
    if (childIds.length === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of childIds) {
      const cp = positionsById.get(id);
      if (!cp) continue;
      minX = Math.min(minX, cp.x);
      minY = Math.min(minY, cp.y);
      maxX = Math.max(maxX, cp.x + cp.width);
      maxY = Math.max(maxY, cp.y + cp.height);
    }
    if (Number.isFinite(minX)) {
      const PAD = 24;
      const HEADER = 24;
      const gp = positionsById.get(node.id);
      if (gp) {
        gp.x = minX - PAD;
        gp.y = minY - PAD - HEADER;
        gp.width = maxX - minX + PAD * 2;
        gp.height = maxY - minY + PAD * 2 + HEADER;
      }
    }
  }

  const allBounds = layout.nodes.reduce(
    (acc, p) => ({
      maxX: Math.max(acc.maxX, p.x + p.width),
      maxY: Math.max(acc.maxY, p.y + p.height),
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y)
    }),
    { maxX: 0, maxY: 0, minX: 0, minY: 0 }
  );

  const fallbackSides = defaultSides(layout.direction);
  const axis: "horizontal" | "vertical" =
    (layout.direction === "LR" || layout.direction === "RL") ? "horizontal" : "vertical";

  const nodesById = new Map<string, WireNode>(diagram.nodes.map((n: WireNode) => [n.id, n] as const));

  // ---- pre-pass: resolve sides + slot indices for every drawable edge ----
  type DrawableEdge = {
    edge: ResolvedEdge;
    sourceNode: WireNode;
    targetNode: WireNode;
    sourceSide: Side;
    targetSide: Side;
    sourceSlot: number;
    sourceSlotCount: number;
    targetSlot: number;
    targetSlotCount: number;
    style: ResolvedEdgeStyle;
  };

  const drawables: DrawableEdge[] = [];
  // map of "nodeId|side|dir" -> running edge list for slot assignment.
  const sourceGroups = new Map<string, ResolvedEdge[]>();
  const targetGroups = new Map<string, ResolvedEdge[]>();

  for (const edge of layout.edges) {
    const sourceNode = nodesById.get(edge.from);
    const targetNode = nodesById.get(edge.to);
    if (!sourceNode || !targetNode) continue;
    if (sourceNode.kind === "note" || targetNode.kind === "note") continue;
    if (!positionsById.has(edge.from) || !positionsById.has(edge.to)) continue;

    const sourceSide = resolveEdgeSide(
      edge.fromHandle,
      sourceNode.handles?.source,
      fallbackSides.from
    );
    const targetSide = resolveEdgeSide(
      edge.toHandle,
      targetNode.handles?.target,
      fallbackSides.to
    );

    const srcKey = `${sourceNode.id}|${sourceSide}`;
    const tgtKey = `${targetNode.id}|${targetSide}`;
    const srcList = sourceGroups.get(srcKey) ?? [];
    const tgtList = targetGroups.get(tgtKey) ?? [];
    srcList.push(edge);
    tgtList.push(edge);
    sourceGroups.set(srcKey, srcList);
    targetGroups.set(tgtKey, tgtList);

    const style = resolveEdgeStyle(edge, opts.edgeStyle, opts.edgeRouting);
    drawables.push({
      edge,
      sourceNode,
      targetNode,
      sourceSide,
      targetSide,
      sourceSlot: 0,
      sourceSlotCount: 0,
      targetSlot: 0,
      targetSlotCount: 0,
      style
    });
  }

  // Second pass: fill in slot index/count from the grouping.
  for (const d of drawables) {
    const srcGroup = sourceGroups.get(`${d.sourceNode.id}|${d.sourceSide}`)!;
    const tgtGroup = targetGroups.get(`${d.targetNode.id}|${d.targetSide}`)!;
    d.sourceSlot = srcGroup.indexOf(d.edge);
    d.sourceSlotCount = srcGroup.length;
    d.targetSlot = tgtGroup.indexOf(d.edge);
    d.targetSlotCount = tgtGroup.length;
  }

  // ---- compute edge geometry up-front so curve extrema can expand bounds ----
  const edgeGeoms = new Map<ResolvedEdge, EdgeGeom & { start: { x: number; y: number }; end: { x: number; y: number } }>();
  for (const d of drawables) {
    const fromPos = positionsById.get(d.edge.from)!;
    const toPos = positionsById.get(d.edge.to)!;
    const start = attachPoint(fromPos, d.sourceSide, d.sourceNode.kind, d.sourceSlot, d.sourceSlotCount);
    const end = attachPoint(toPos, d.targetSide, d.targetNode.kind, d.targetSlot, d.targetSlotCount);
    const geom = edgePath(start, end, d.sourceSide, d.targetSide, d.style.routing, d.style.curvature);
    edgeGeoms.set(d.edge, { ...geom, start, end });
    for (const p of geom.points) {
      if (p.x < allBounds.minX) allBounds.minX = p.x;
      if (p.y < allBounds.minY) allBounds.minY = p.y;
      if (p.x > allBounds.maxX) allBounds.maxX = p.x;
      if (p.y > allBounds.maxY) allBounds.maxY = p.y;
    }
  }

  const offsetX = -Math.min(0, allBounds.minX);
  const offsetY = -Math.min(0, allBounds.minY);
  const w = allBounds.maxX + offsetX + padding * 2;
  const h = allBounds.maxY + offsetY + padding * 2;

  // ---- collect required marker variants ----
  // key = `${shape}|${color}|${dir}`
  const requiredMarkers = new Map<string, { shape: EdgeMarker; color: string; dir: "start" | "end" }>();
  for (const d of drawables) {
    if (d.style.markerEnd !== "none") {
      const key = `${d.style.markerEnd}|${d.style.stroke}|end`;
      if (!requiredMarkers.has(key)) {
        requiredMarkers.set(key, { shape: d.style.markerEnd, color: d.style.stroke, dir: "end" });
      }
    }
    if (d.style.markerStart !== "none") {
      const key = `${d.style.markerStart}|${d.style.stroke}|start`;
      if (!requiredMarkers.has(key)) {
        requiredMarkers.set(key, { shape: d.style.markerStart, color: d.style.stroke, dir: "start" });
      }
    }
  }
  // Always include the default end-arrow so legacy callers never lose it.
  const defaultEndKey = `arrow|${DEFAULT_EDGE_STROKE}|end`;
  if (!requiredMarkers.has(defaultEndKey)) {
    requiredMarkers.set(defaultEndKey, { shape: "arrow", color: DEFAULT_EDGE_STROKE, dir: "end" });
  }

  // Decide whether any node opts in to the shadow filter.
  const anyNodeWantsShadow =
    (opts.nodeStyle?.shadow ?? false) ||
    diagram.nodes.some((n) => n.style?.shadow);

  // ---- emit svg ----
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">`
  );
  parts.push(`<rect width="100%" height="100%" fill="${background}"/>`);

  const defs: string[] = [];
  for (const m of requiredMarkers.values()) defs.push(markerDef(m.shape, m.color, m.dir));
  if (anyNodeWantsShadow) defs.push(SHADOW_FILTER_DEF);
  if (defs.length > 0) parts.push(`<defs>${defs.join("")}</defs>`);

  parts.push(`<g transform="translate(${padding + offsetX}, ${padding + offsetY})">`);

  // Groups first so they sit behind their children.
  for (const pos of layout.nodes) {
    const node = nodesById.get(pos.id);
    if (!node || node.kind !== "group") continue;
    parts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.25" stroke-dasharray="4 3"/>`
    );
    parts.push(
      `<text x="${pos.x + 12}" y="${pos.y + 16}" font-size="11" font-weight="700" fill="#475569">▣ ${escapeXml(node.title)}</text>`
    );
  }

  // Edges.
  for (const d of drawables) {
    const geom = edgeGeoms.get(d.edge)!;
    const { path: pathD, start, end, labelPos } = geom;
    const dashAttr = d.style.strokeDasharray ? ` stroke-dasharray="${escapeXml(d.style.strokeDasharray)}"` : "";
    const markerEndAttr =
      d.style.markerEnd === "none"
        ? ""
        : ` marker-end="url(#${markerId(d.style.markerEnd, d.style.stroke, "end")})"`;
    const markerStartAttr =
      d.style.markerStart === "none"
        ? ""
        : ` marker-start="url(#${markerId(d.style.markerStart, d.style.stroke, "start")})"`;
    parts.push(
      `<path d="${pathD}" fill="none" stroke="${d.style.stroke}" stroke-width="${d.style.strokeWidth}"${dashAttr}${markerEndAttr}${markerStartAttr}/>`
    );

    const label = d.edge.label ?? d.edge.branch ?? d.edge.fromBranch;
    if (label) {
      const labelStyle: EdgeLabelStyle = { ...(opts.edgeLabelStyle ?? {}), ...(d.edge.labelStyle ?? {}) };
      const fill = labelStyle.fill ?? DEFAULT_LABEL_FILL;
      const bg = labelStyle.background ?? DEFAULT_LABEL_BG;
      const border = labelStyle.border ?? DEFAULT_LABEL_BORDER;
      const fontSize = labelStyle.fontSize ?? 11;
      let lx: number;
      let ly: number;
      if (labelPos) {
        lx = labelPos.x;
        ly = labelPos.y;
      } else if (axis === "horizontal") {
        lx = (start.x + end.x) / 2;
        ly = (start.y + end.y) / 2 - 6;
      } else {
        lx = (start.x + end.x) / 2 + 8;
        ly = (start.y + end.y) / 2;
      }
      const labelW = label.length * (fontSize * 0.55) + 10;
      parts.push(
        `<rect x="${lx - labelW / 2}" y="${ly - fontSize + 2}" width="${labelW}" height="${fontSize + 5}" rx="3" fill="${bg}" fill-opacity="0.92" stroke="${border}" stroke-width="0.5"/>`
      );
      parts.push(
        `<text x="${lx}" y="${ly + 1}" text-anchor="middle" font-size="${fontSize}" fill="${fill}">${escapeXml(label)}</text>`
      );
    }
  }

  const DEFAULT_TONE: ToneColor = { fill: "#ffffff", stroke: "#d4d4d8", text: "#18181b" };

  // Nodes.
  for (const pos of layout.nodes) {
    const node = nodesById.get(pos.id);
    if (!node || node.kind === "group") continue;

    const tone = (node.tone ?? "default") as NonNullable<Tone>;
    const toneColor: ToneColor = toneColors[tone] ?? toneColors.default ?? DEFAULT_TONE;
    const style = resolveNodeStyle(node, toneColor, opts.nodeStyle);
    const shape = KIND_SHAPE[node.kind];
    const dims = dimsById.get(node.id)!;

    const cx = pos.x + pos.width / 2;
    const cy = pos.y + pos.height / 2;

    const dashAttr = style.strokeDasharray ? ` stroke-dasharray="${escapeXml(style.strokeDasharray)}"` : "";
    const opacityAttr = style.opacity < 1 ? ` opacity="${style.opacity}"` : "";
    const filterAttr = style.shadow ? ` filter="url(#${SHADOW_FILTER_ID})"` : "";

    if (shape === "diamond") {
      const points = [
        `${pos.x},${cy}`,
        `${cx},${pos.y}`,
        `${pos.x + pos.width},${cy}`,
        `${cx},${pos.y + pos.height}`
      ].join(" ");
      parts.push(
        `<polygon points="${points}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${opacityAttr}${filterAttr}/>`
      );
    } else if (shape === "ellipse") {
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${pos.width / 2}" ry="${pos.height / 2}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${opacityAttr}${filterAttr}/>`
      );
    } else if (shape === "note") {
      const noteFill = node.style?.fill ?? "#fef9c3";
      const noteStroke = node.style?.stroke ?? "#facc15";
      const noteDash = node.style?.strokeDasharray ?? "3 3";
      parts.push(
        `<rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" rx="${style.borderRadius ?? 4}" fill="${noteFill}" stroke="${noteStroke}" stroke-width="${style.strokeWidth}" stroke-dasharray="${escapeXml(noteDash)}"${opacityAttr}${filterAttr}/>`
      );
    } else {
      const rx = style.borderRadius ?? (shape === "rounded" ? 12 : 4);
      parts.push(
        `<rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" rx="${rx}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${opacityAttr}${filterAttr}/>`
      );
    }

    const titleLineCount = dims.titleLines.length;
    const descLineCount = dims.descLines.length;
    const totalH = titleLineCount * TITLE_LINE_PX + (descLineCount ? descLineCount * DESC_LINE_PX + 4 : 0);
    const titleStartY = cy - totalH / 2 + TITLE_LINE_PX - 4;

    const titleText = dims.titleLines
      .map(
        (line, i) =>
          `<tspan x="${cx}" y="${titleStartY + i * TITLE_LINE_PX}">${escapeXml(line)}</tspan>`
      )
      .join("");
    parts.push(
      `<text text-anchor="middle" font-size="${TITLE_FONT_PX}" font-weight="600" fill="${style.textColor}">${titleText}</text>`
    );

    if (dims.descLines.length) {
      const descStartY = titleStartY + titleLineCount * TITLE_LINE_PX + 6;
      const descText = dims.descLines
        .map(
          (line, i) =>
            `<tspan x="${cx}" y="${descStartY + i * DESC_LINE_PX}">${escapeXml(line)}</tspan>`
        )
        .join("");
      parts.push(
        `<text text-anchor="middle" font-size="${DESC_FONT_PX}" fill="${style.textColor}" opacity="0.78">${descText}</text>`
      );
    }

    if (node.kind === "note" && node.attachedTo) {
      const host = positionsById.get(node.attachedTo);
      if (host) {
        const hcx = host.x + host.width / 2;
        const hcy = host.y + host.height / 2;
        parts.push(
          `<line x1="${cx}" y1="${cy}" x2="${hcx}" y2="${hcy}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>`
        );
      }
    }
  }

  parts.push("</g></svg>");
  return parts.join("");
}
