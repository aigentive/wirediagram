import {
  layoutDiagram,
  type LayoutNodePosition,
  type WireDiagram,
  type WireNode,
  type Tone,
  type Side,
  type EdgeMarker,
  type EdgeRouting,
  type NodeStyle,
  type EdgeStyle
} from "@aigentive/wire-core";
import { DEFAULT_TONE_CLASSES } from "./tone.js";

/**
 * Minimal subset of the React Flow node/edge shape so we don't
 * pull `@xyflow/react` into the type signature when consumers
 * only want the JSON. Compatible with `import { Node, Edge } from '@xyflow/react'`.
 */
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    title: string;
    description?: string;
    kind: WireNode["kind"];
    tone: NonNullable<Tone>;
    toneClass: string;
    /** Original wire node passed through, untouched. */
    wire: WireNode;
  };
  width?: number;
  height?: number;
  parentId?: string;
  /** First entry of node.handles.source. Defaults to layout-direction. */
  sourcePosition?: Side;
  /** First entry of node.handles.target. Defaults to layout-direction. */
  targetPosition?: Side;
  /** CSS style object derived from node.style. */
  style?: Record<string, string | number>;
}

export interface ReactFlowEdgeMarker {
  type: "arrowclosed" | "arrow" | "circle" | "diamond";
  color?: string;
  width?: number;
  height?: number;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: Side;
  targetHandle?: Side;
  label?: string;
  data?: {
    branch?: string;
    tone?: Tone;
    synthesized: boolean;
  };
  type?: string;
  animated?: boolean;
  style?: Record<string, string | number>;
  markerEnd?: ReactFlowEdgeMarker;
  markerStart?: ReactFlowEdgeMarker;
  labelStyle?: Record<string, string | number>;
  labelBgStyle?: Record<string, string | number>;
}

export interface ToReactFlowResult {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  bounds: { width: number; height: number };
}

export interface ToReactFlowOptions {
  toneClasses?: Partial<Record<NonNullable<Tone>, string>>;
  /** Override the React Flow `type` per kind. Defaults to the wire kind. */
  nodeTypeFor?: (kind: WireNode["kind"]) => string;
  /** Animate AI/condition outgoing edges. Default true. */
  animate?: boolean;
  /** Diagram-level default node style. Per-node `style` overrides this. */
  nodeStyle?: NodeStyle;
  /** Diagram-level default edge style. Per-edge `style` overrides this. */
  edgeStyle?: EdgeStyle;
  /** Diagram-level default edge routing. Per-edge `routing` overrides this. */
  edgeRouting?: EdgeRouting;
}

const DEFAULT_NODE_TYPE_FOR = (kind: WireNode["kind"]): string => `wire-${kind}`;

function defaultSidesFor(direction: WireDiagram["layout"]): { source: Side; target: Side } {
  switch (direction) {
    case "RL": return { source: "left", target: "right" };
    case "TB": return { source: "bottom", target: "top" };
    case "BT": return { source: "top", target: "bottom" };
    case "LR":
    default: return { source: "right", target: "left" };
  }
}

function nodeStyleToCss(
  nodeStyle: NodeStyle | undefined,
  diagramDefault: NodeStyle | undefined
): Record<string, string | number> | undefined {
  const merged: NodeStyle = { ...(diagramDefault ?? {}), ...(nodeStyle ?? {}) };
  const css: Record<string, string | number> = {};
  if (merged.fill !== undefined) css.background = merged.fill;
  if (merged.stroke !== undefined) css.borderColor = merged.stroke;
  if (merged.strokeWidth !== undefined) css.borderWidth = merged.strokeWidth;
  if (merged.strokeDasharray !== undefined) css.borderStyle = "dashed";
  if (merged.borderRadius !== undefined) css.borderRadius = merged.borderRadius;
  if (merged.opacity !== undefined) css.opacity = merged.opacity;
  if (merged.textColor !== undefined) css.color = merged.textColor;
  if (merged.shadow) css.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
  return Object.keys(css).length > 0 ? css : undefined;
}

function edgeStyleToCss(
  edgeStyle: EdgeStyle | undefined,
  diagramDefault: EdgeStyle | undefined
): Record<string, string | number> | undefined {
  const merged: EdgeStyle = { ...(diagramDefault ?? {}), ...(edgeStyle ?? {}) };
  const css: Record<string, string | number> = {};
  if (merged.stroke !== undefined) css.stroke = merged.stroke;
  if (merged.strokeWidth !== undefined) css.strokeWidth = merged.strokeWidth;
  if (merged.strokeDasharray !== undefined) css.strokeDasharray = merged.strokeDasharray;
  return Object.keys(css).length > 0 ? css : undefined;
}

function markerToReactFlow(
  marker: EdgeMarker | undefined,
  color: string | undefined
): ReactFlowEdgeMarker | undefined {
  if (!marker || marker === "none") return undefined;
  const type =
    marker === "arrow" ? "arrowclosed" :
    marker === "circle" ? "circle" :
    "diamond";
  return color ? { type, color } : { type };
}

const ROUTING_TO_RF_TYPE: Record<EdgeRouting, string> = {
  bezier: "default",
  smoothstep: "smoothstep",
  step: "step",
  straight: "straight"
};

/**
 * Convert a Wire diagram into React Flow `nodes` and `edges`. Layout is
 * performed by `wire-core`'s dagre engine. Notes and groups are passed
 * through as React Flow nodes too — the consuming app decides how to
 * render them.
 */
export function toReactFlow(
  diagram: WireDiagram,
  opts: ToReactFlowOptions = {}
): ToReactFlowResult {
  const layout = layoutDiagram(diagram);
  const positionsById = new Map<string, LayoutNodePosition>();
  for (const pos of layout.nodes) {
    positionsById.set(pos.id, pos);
  }

  const toneClasses = { ...DEFAULT_TONE_CLASSES, ...(opts.toneClasses ?? {}) };
  const nodeTypeFor = opts.nodeTypeFor ?? DEFAULT_NODE_TYPE_FOR;
  const animate = opts.animate ?? true;
  const fallbackSides = defaultSidesFor(layout.direction);

  const nodes: ReactFlowNode[] = diagram.nodes.map((node) => {
    const pos = positionsById.get(node.id) ?? { x: 0, y: 0, width: 220, height: 80 };
    const tone = (node.tone ?? "default") as NonNullable<Tone>;
    const rfNode: ReactFlowNode = {
      id: node.id,
      type: nodeTypeFor(node.kind),
      position: { x: pos.x, y: pos.y },
      data: {
        title: node.title,
        description: node.description,
        kind: node.kind,
        tone,
        toneClass: toneClasses[tone] ?? toneClasses.default,
        wire: node
      },
      width: pos.width,
      height: pos.height
    };
    if (node.parent) rfNode.parentId = node.parent;

    const sourcePos = node.handles?.source?.[0] ?? fallbackSides.source;
    const targetPos = node.handles?.target?.[0] ?? fallbackSides.target;
    rfNode.sourcePosition = sourcePos;
    rfNode.targetPosition = targetPos;

    const style = nodeStyleToCss(node.style, opts.nodeStyle);
    if (style) rfNode.style = style;
    return rfNode;
  });

  const edges: ReactFlowEdge[] = layout.edges.map((edge) => {
    const sourceNode = diagram.nodes.find((n) => n.id === edge.from);
    const isAnimated =
      animate &&
      sourceNode !== undefined &&
      (sourceNode.kind === "ai" || sourceNode.kind === "condition");
    const rfEdge: ReactFlowEdge = {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      data: {
        branch: edge.branch ?? edge.fromBranch,
        tone: edge.tone,
        synthesized: edge.synthesized
      }
    };
    const label = edge.label ?? edge.branch ?? edge.fromBranch;
    if (label) rfEdge.label = label;
    if (isAnimated) rfEdge.animated = true;
    if (edge.fromHandle) rfEdge.sourceHandle = edge.fromHandle;
    if (edge.toHandle) rfEdge.targetHandle = edge.toHandle;

    const routing: EdgeRouting | undefined = edge.routing ?? opts.edgeRouting;
    if (routing) rfEdge.type = ROUTING_TO_RF_TYPE[routing];

    const css = edgeStyleToCss(edge.style, opts.edgeStyle);
    if (css) rfEdge.style = css;

    const mergedStyle: EdgeStyle = { ...(opts.edgeStyle ?? {}), ...(edge.style ?? {}) };
    const markerEnd = markerToReactFlow(mergedStyle.markerEnd, mergedStyle.stroke);
    const markerStart = markerToReactFlow(mergedStyle.markerStart, mergedStyle.stroke);
    if (markerEnd) rfEdge.markerEnd = markerEnd;
    if (markerStart) rfEdge.markerStart = markerStart;

    if (edge.labelStyle) {
      const ls: Record<string, string | number> = {};
      if (edge.labelStyle.fill !== undefined) ls.fill = edge.labelStyle.fill;
      if (edge.labelStyle.fontSize !== undefined) ls.fontSize = edge.labelStyle.fontSize;
      if (Object.keys(ls).length > 0) rfEdge.labelStyle = ls;
      const bgs: Record<string, string | number> = {};
      if (edge.labelStyle.background !== undefined) bgs.fill = edge.labelStyle.background;
      if (edge.labelStyle.border !== undefined) bgs.stroke = edge.labelStyle.border;
      if (Object.keys(bgs).length > 0) rfEdge.labelBgStyle = bgs;
    }
    return rfEdge;
  });

  return { nodes, edges, bounds: layout.bounds };
}
