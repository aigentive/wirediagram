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
 * Minimal subset of the legacy graph node/edge shape so we don't
 * pull a third-party graph canvas into the type signature when consumers
 * only want the JSON.
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
  extent?: "parent";
  zIndex?: number;
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
  /** Override the adapter `type` per kind. Defaults to the wire kind. */
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
const GROUP_PADDING_X = 32;
const GROUP_PADDING_TOP = 56;
const GROUP_PADDING_BOTTOM = 32;
const GROUP_MIN_WIDTH = 320;
const GROUP_MIN_HEIGHT = 200;

interface NodeFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
 * Convert a Wire diagram into adapter-shaped `nodes` and `edges`. Layout is
 * performed by `wire-core`'s dagre engine. Notes and groups are passed
 * through too; the consuming app decides how to render them.
 */
export function toReactFlow(
  diagram: WireDiagram,
  opts: ToReactFlowOptions = {}
): ToReactFlowResult {
  const layout = layoutDiagram(diagram);
  const framesById = new Map<string, NodeFrame>();
  for (const pos of layout.nodes) {
    framesById.set(pos.id, pos);
  }
  fitGroupFrames(diagram, framesById);

  const toneClasses = { ...DEFAULT_TONE_CLASSES, ...(opts.toneClasses ?? {}) };
  const nodeTypeFor = opts.nodeTypeFor ?? DEFAULT_NODE_TYPE_FOR;
  const animate = opts.animate ?? true;
  const fallbackSides = defaultSidesFor(layout.direction);
  const orderedNodes = orderParentsBeforeChildren(diagram.nodes);

  const nodes: ReactFlowNode[] = orderedNodes.map((node) => {
    const pos = framesById.get(node.id) ?? { x: 0, y: 0, width: 220, height: 80 };
    const parent = node.parent ? framesById.get(node.parent) : undefined;
    const tone = (node.tone ?? "default") as NonNullable<Tone>;
    const rfNode: ReactFlowNode = {
      id: node.id,
      type: nodeTypeFor(node.kind),
      position: parent ? { x: pos.x - parent.x, y: pos.y - parent.y } : { x: pos.x, y: pos.y },
      data: {
        title: node.title,
        description: node.description,
        kind: node.kind,
        tone,
        toneClass: toneClasses[tone] ?? toneClasses.default,
        wire: node
      },
      width: pos.width,
      height: pos.height,
      zIndex: node.kind === "group" ? 0 : node.parent ? 2 : 1
    };
    if (node.parent) {
      rfNode.parentId = node.parent;
      rfNode.extent = "parent";
    }

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

  return { nodes, edges, bounds: boundsFromFrames(framesById) };
}

function fitGroupFrames(diagram: WireDiagram, framesById: Map<string, NodeFrame>): void {
  const childrenByParent = new Map<string, WireNode[]>();
  for (const node of diagram.nodes) {
    if (!node.parent) continue;
    const children = childrenByParent.get(node.parent) ?? [];
    children.push(node);
    childrenByParent.set(node.parent, children);
  }

  for (const group of diagram.nodes) {
    if (group.kind !== "group") continue;
    const childIds = new Set([...(group.children ?? []), ...(childrenByParent.get(group.id) ?? []).map((node) => node.id)]);
    const childFrames = [...childIds]
      .map((id) => framesById.get(id))
      .filter((frame): frame is NodeFrame => Boolean(frame));
    if (childFrames.length === 0) continue;

    const minX = Math.min(...childFrames.map((frame) => frame.x));
    const minY = Math.min(...childFrames.map((frame) => frame.y));
    const maxX = Math.max(...childFrames.map((frame) => frame.x + frame.width));
    const maxY = Math.max(...childFrames.map((frame) => frame.y + frame.height));
    const x = group.position?.x ?? minX - GROUP_PADDING_X;
    const y = group.position?.y ?? minY - GROUP_PADDING_TOP;
    const width = group.size?.width ?? Math.max(GROUP_MIN_WIDTH, maxX - minX + GROUP_PADDING_X * 2);
    const height = group.size?.height ?? Math.max(GROUP_MIN_HEIGHT, maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM);
    framesById.set(group.id, { x, y, width, height });
  }
}

function orderParentsBeforeChildren(nodes: WireNode[]): WireNode[] {
  return [...nodes].sort((a, b) => {
    if (a.parent && !b.parent) return 1;
    if (!a.parent && b.parent) return -1;
    if (a.parent === b.id) return 1;
    if (b.parent === a.id) return -1;
    return 0;
  });
}

function boundsFromFrames(framesById: Map<string, NodeFrame>): { width: number; height: number } {
  let width = 1;
  let height = 1;
  for (const frame of framesById.values()) {
    width = Math.max(width, frame.x + frame.width);
    height = Math.max(height, frame.y + frame.height);
  }
  return { width, height };
}
