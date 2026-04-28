import {
  layoutDiagram,
  type EdgeMarker,
  type EdgeRouting,
  type EdgeStyle,
  type LayoutDirection,
  type ResolvedEdge,
  type Side,
  type WireDiagram,
  type WireNode
} from "@aigentive/wire-core";
import type { WireCanvasEdge } from "./changeActions.js";

export interface Point {
  x: number;
  y: number;
}

export interface WireCanvasFrame {
  id: string;
  node: WireNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WireCanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface WireCanvasResolvedEdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerEnd: EdgeMarker;
  markerStart: EdgeMarker;
  routing: EdgeRouting;
  curvature: number;
}

export interface WireCanvasEdgeGeometry {
  edge: ResolvedEdge;
  canvasEdge: WireCanvasEdge;
  sourceNode: WireNode;
  targetNode: WireNode;
  sourceSide: Side;
  targetSide: Side;
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
  points: Point[];
  label: string | undefined;
  labelPoint: Point;
  style: WireCanvasResolvedEdgeStyle;
}

export interface WireCanvasModel {
  direction: LayoutDirection;
  frames: WireCanvasFrame[];
  framesById: Map<string, WireCanvasFrame>;
  nodeById: Map<string, WireNode>;
  edges: WireCanvasEdgeGeometry[];
  edgeById: Map<string, WireCanvasEdge>;
  explicitEdgeIds: Set<string>;
  bounds: WireCanvasBounds;
}

export interface BuildWireCanvasModelOptions {
  positionOverrides?: ReadonlyMap<string, Point>;
  edgeStyle?: EdgeStyle;
  edgeRouting?: EdgeRouting;
}

const DEFAULT_EDGE_STROKE = "#475569";
const DEFAULT_EDGE_WIDTH = 1.5;
const GROUP_PADDING_X = 32;
const GROUP_PADDING_TOP = 56;
const GROUP_PADDING_BOTTOM = 32;
const GROUP_MIN_WIDTH = 320;
const GROUP_MIN_HEIGHT = 200;

interface EdgePathResult {
  path: string;
  points: Point[];
  labelPoint: Point | undefined;
}

export function buildWireCanvasModel(
  diagram: WireDiagram,
  opts: BuildWireCanvasModelOptions = {}
): WireCanvasModel {
  const layout = layoutDiagram(diagram, { rankSep: 90, nodeSep: 60 });
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node] as const));
  const framesById = new Map<string, WireCanvasFrame>();

  for (const frame of layout.nodes) {
    const node = nodeById.get(frame.id);
    if (!node) continue;
    const override = opts.positionOverrides?.get(frame.id);
    framesById.set(frame.id, {
      id: frame.id,
      node,
      x: override?.x ?? frame.x,
      y: override?.y ?? frame.y,
      width: frame.width,
      height: frame.height
    });
  }

  applyPositionOverrides(opts.positionOverrides, framesById);
  fitGroupFrames(diagram, framesById);
  applyPositionOverrides(opts.positionOverrides, framesById);

  const fallbackSides = defaultSides(layout.direction);
  const sourceGroups = new Map<string, ResolvedEdge[]>();
  const targetGroups = new Map<string, ResolvedEdge[]>();
  const drawableSeeds: Array<{
    edge: ResolvedEdge;
    sourceNode: WireNode;
    targetNode: WireNode;
    sourceSide: Side;
    targetSide: Side;
    style: WireCanvasResolvedEdgeStyle;
  }> = [];

  for (const edge of layout.edges) {
    const sourceNode = nodeById.get(edge.from);
    const targetNode = nodeById.get(edge.to);
    if (!sourceNode || !targetNode) continue;
    if (sourceNode.kind === "note" || targetNode.kind === "note") continue;
    if (!framesById.has(edge.from) || !framesById.has(edge.to)) continue;

    const sourceSide = resolveEdgeSide(edge.fromHandle, sourceNode.handles?.source, fallbackSides.from);
    const targetSide = resolveEdgeSide(edge.toHandle, targetNode.handles?.target, fallbackSides.to);
    const sourceKey = `${sourceNode.id}|${sourceSide}`;
    const targetKey = `${targetNode.id}|${targetSide}`;
    const sourceList = sourceGroups.get(sourceKey) ?? [];
    const targetList = targetGroups.get(targetKey) ?? [];
    sourceList.push(edge);
    targetList.push(edge);
    sourceGroups.set(sourceKey, sourceList);
    targetGroups.set(targetKey, targetList);

    drawableSeeds.push({
      edge,
      sourceNode,
      targetNode,
      sourceSide,
      targetSide,
      style: resolveEdgeStyle(edge, opts.edgeStyle, opts.edgeRouting)
    });
  }

  const bounds = initialBounds(framesById);
  const edges: WireCanvasEdgeGeometry[] = [];
  const edgeById = new Map<string, WireCanvasEdge>();

  for (const seed of drawableSeeds) {
    const sourceFrame = framesById.get(seed.edge.from)!;
    const targetFrame = framesById.get(seed.edge.to)!;
    const sourceList = sourceGroups.get(`${seed.sourceNode.id}|${seed.sourceSide}`)!;
    const targetList = targetGroups.get(`${seed.targetNode.id}|${seed.targetSide}`)!;
    const sourcePoint = attachPoint(
      sourceFrame,
      seed.sourceSide,
      seed.sourceNode.kind,
      sourceList.indexOf(seed.edge),
      sourceList.length
    );
    const targetPoint = attachPoint(
      targetFrame,
      seed.targetSide,
      seed.targetNode.kind,
      targetList.indexOf(seed.edge),
      targetList.length
    );
    const path = edgePath(sourcePoint, targetPoint, seed.sourceSide, seed.targetSide, seed.style.routing, seed.style.curvature);
    for (const point of path.points) expandBounds(bounds, point);

    const label = seed.edge.label ?? seed.edge.branch ?? seed.edge.fromBranch;
    const labelPoint = path.labelPoint ?? defaultLabelPoint(sourcePoint, targetPoint, layout.direction);
    expandBounds(bounds, labelPoint);

    const canvasEdge: WireCanvasEdge = {
      id: seed.edge.id,
      source: seed.edge.from,
      target: seed.edge.to,
      data: {
        branch: seed.edge.branch ?? seed.edge.fromBranch,
        tone: seed.edge.tone,
        synthesized: seed.edge.synthesized
      }
    };
    edgeById.set(seed.edge.id, canvasEdge);
    edges.push({
      edge: seed.edge,
      canvasEdge,
      sourceNode: seed.sourceNode,
      targetNode: seed.targetNode,
      sourceSide: seed.sourceSide,
      targetSide: seed.targetSide,
      sourcePoint,
      targetPoint,
      path: path.path,
      points: path.points,
      label,
      labelPoint,
      style: seed.style
    });
  }

  return {
    direction: layout.direction,
    frames: orderFramesParentsFirst([...framesById.values()]),
    framesById,
    nodeById,
    edges,
    edgeById,
    explicitEdgeIds: new Set(diagram.edges.map((edge) => edge.id).filter((id): id is string => Boolean(id))),
    bounds: finalizeBounds(bounds)
  };
}

export function defaultSides(direction: LayoutDirection): { from: Side; to: Side } {
  switch (direction) {
    case "RL": return { from: "left", to: "right" };
    case "TB": return { from: "bottom", to: "top" };
    case "BT": return { from: "top", to: "bottom" };
    case "LR":
    default: return { from: "right", to: "left" };
  }
}

export function sourceSidesForNode(node: WireNode, direction: LayoutDirection): Side[] {
  return node.handles?.source?.length ? node.handles.source : [defaultSides(direction).from];
}

export function targetSidesForNode(node: WireNode, direction: LayoutDirection): Side[] {
  return node.handles?.target?.length ? node.handles.target : [defaultSides(direction).to];
}

export function handlePoint(frame: WireCanvasFrame, side: Side): Point {
  return attachPoint(frame, side, frame.node.kind, 0, 1);
}

export function markerId(shape: EdgeMarker, color: string, dir: "start" | "end"): string {
  return `wire-canvas-${shape}-${dir}-${colorKey(color)}`;
}

export function descendantsOfGroup(groupId: string, nodes: WireNode[]): WireNode[] {
  const descendants: WireNode[] = [];
  const visit = (parentId: string) => {
    for (const node of nodes) {
      if (node.parent !== parentId) continue;
      descendants.push(node);
      if (node.kind === "group") visit(node.id);
    }
  };
  visit(groupId);
  return descendants;
}

function fitGroupFrames(diagram: WireDiagram, framesById: Map<string, WireCanvasFrame>): void {
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
      .filter((frame): frame is WireCanvasFrame => Boolean(frame));
    if (childFrames.length === 0) continue;

    const minX = Math.min(...childFrames.map((frame) => frame.x));
    const minY = Math.min(...childFrames.map((frame) => frame.y));
    const maxX = Math.max(...childFrames.map((frame) => frame.x + frame.width));
    const maxY = Math.max(...childFrames.map((frame) => frame.y + frame.height));
    framesById.set(group.id, {
      id: group.id,
      node: group,
      x: group.position?.x ?? minX - GROUP_PADDING_X,
      y: group.position?.y ?? minY - GROUP_PADDING_TOP,
      width: group.size?.width ?? Math.max(GROUP_MIN_WIDTH, maxX - minX + GROUP_PADDING_X * 2),
      height: group.size?.height ?? Math.max(GROUP_MIN_HEIGHT, maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM)
    });
  }
}

function applyPositionOverrides(
  overrides: ReadonlyMap<string, Point> | undefined,
  framesById: Map<string, WireCanvasFrame>
): void {
  if (!overrides) return;
  for (const [id, position] of overrides) {
    const frame = framesById.get(id);
    if (!frame) continue;
    framesById.set(id, { ...frame, x: position.x, y: position.y });
  }
}

function orderFramesParentsFirst(frames: WireCanvasFrame[]): WireCanvasFrame[] {
  return [...frames].sort((a, b) => {
    if (a.node.parent && !b.node.parent) return 1;
    if (!a.node.parent && b.node.parent) return -1;
    if (a.node.parent === b.id) return 1;
    if (b.node.parent === a.id) return -1;
    if (a.node.kind === "group" && b.node.kind !== "group") return -1;
    if (a.node.kind !== "group" && b.node.kind === "group") return 1;
    return 0;
  });
}

function resolveEdgeSide(
  edgeOverride: Side | undefined,
  nodeHandles: Side[] | undefined,
  fallback: Side
): Side {
  return edgeOverride ?? nodeHandles?.[0] ?? fallback;
}

function resolveEdgeStyle(
  edge: ResolvedEdge,
  diagramDefault: EdgeStyle | undefined,
  diagramRouting: EdgeRouting | undefined
): WireCanvasResolvedEdgeStyle {
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

function attachPoint(
  frame: WireCanvasFrame,
  side: Side,
  kind: WireNode["kind"] | undefined,
  slotIndex: number,
  slotCount: number
): Point {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;

  if (kind === "condition") {
    if (side === "right") return { x: frame.x + frame.width, y: cy };
    if (side === "left") return { x: frame.x, y: cy };
    if (side === "top") return { x: cx, y: frame.y };
    return { x: cx, y: frame.y + frame.height };
  }

  const t = slotCount <= 1 ? 0.5 : 0.25 + (slotIndex / (slotCount - 1)) * 0.5;
  if (side === "right") return { x: frame.x + frame.width, y: frame.y + frame.height * t };
  if (side === "left") return { x: frame.x, y: frame.y + frame.height * t };
  if (side === "top") return { x: frame.x + frame.width * t, y: frame.y };
  return { x: frame.x + frame.width * t, y: frame.y + frame.height };
}

function handleNormal(side: Side): Point {
  switch (side) {
    case "right": return { x: 1, y: 0 };
    case "left": return { x: -1, y: 0 };
    case "top": return { x: 0, y: -1 };
    case "bottom": return { x: 0, y: 1 };
  }
}

function controlOffset(distance: number, curvature: number): number {
  if (distance >= 0) return 0.5 * distance;
  return curvature * 25 * Math.sqrt(-distance);
}

function edgePath(
  start: Point,
  end: Point,
  sourceSide: Side,
  targetSide: Side,
  routing: EdgeRouting,
  curvature: number
): EdgePathResult {
  if (routing === "straight") {
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, end],
      labelPoint: undefined
    };
  }

  const sourceVertical = sourceSide === "top" || sourceSide === "bottom";
  const targetVertical = targetSide === "top" || targetSide === "bottom";

  if (routing === "step") {
    if (!sourceVertical && !targetVertical) {
      const midX = (start.x + end.x) / 2;
      return {
        path: `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
        labelPoint: undefined
      };
    }
    if (sourceVertical && targetVertical) {
      const midY = (start.y + end.y) / 2;
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
        labelPoint: undefined
      };
    }
    if (sourceVertical) {
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: end.y }, end],
        labelPoint: undefined
      };
    }
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, { x: end.x, y: start.y }, end],
      labelPoint: undefined
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
        labelPoint: undefined
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
        labelPoint: undefined
      };
    }
    if (sourceVertical) {
      return {
        path: `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`,
        points: [start, { x: start.x, y: end.y }, end],
        labelPoint: undefined
      };
    }
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`,
      points: [start, { x: end.x, y: start.y }, end],
      labelPoint: undefined
    };
  }

  const sourceNormal = handleNormal(sourceSide);
  const targetNormal = handleNormal(targetSide);
  const distSrc = (end.x - start.x) * sourceNormal.x + (end.y - start.y) * sourceNormal.y;
  const distTgt = (start.x - end.x) * targetNormal.x + (start.y - end.y) * targetNormal.y;
  const isBackward = (distSrc < 0 || distTgt < 0) && sourceVertical === targetVertical;

  if (isBackward) {
    const perpSign = -1;
    const along = sourceVertical
      ? Math.abs(end.y - start.y) + Math.abs(end.x - start.x)
      : Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    const sweep = Math.max(80, Math.min(220, along * 0.25 + 40));
    const exit = 28;
    const cp1x = sourceVertical ? start.x + perpSign * sweep : start.x + sourceNormal.x * exit;
    const cp1y = sourceVertical ? start.y + sourceNormal.y * exit : start.y + perpSign * sweep;
    const cp2x = targetVertical ? end.x + perpSign * sweep : end.x + targetNormal.x * exit;
    const cp2y = targetVertical ? end.y + targetNormal.y * exit : end.y + perpSign * sweep;
    return {
      path: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
      points: [start, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, end],
      labelPoint: {
        x: 0.125 * start.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * end.x,
        y: 0.125 * start.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * end.y
      }
    };
  }

  const offSrc = controlOffset(distSrc, curvature);
  const offTgt = controlOffset(distTgt, curvature);
  let cp1x = start.x + sourceNormal.x * offSrc;
  let cp1y = start.y + sourceNormal.y * offSrc;
  let cp2x = end.x + targetNormal.x * offTgt;
  let cp2y = end.y + targetNormal.y * offTgt;

  if (sourceVertical === targetVertical) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const adx = Math.abs(end.x - start.x);
    const ady = Math.abs(end.y - start.y);
    const blendCap = 0.7;
    const blend = sourceVertical
      ? Math.min(blendCap, adx / (ady * 0.4 + 1))
      : Math.min(blendCap, ady / (adx * 0.4 + 1));
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
    labelPoint: undefined
  };
}

function defaultLabelPoint(start: Point, end: Point, direction: LayoutDirection): Point {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  if (direction === "LR" || direction === "RL") {
    return { x: midX, y: midY - 6 };
  }
  return { x: midX + 8, y: midY };
}

function initialBounds(framesById: Map<string, WireCanvasFrame>): WireCanvasBounds {
  if (framesById.size === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const frame of framesById.values()) {
    minX = Math.min(minX, frame.x);
    minY = Math.min(minY, frame.y);
    maxX = Math.max(maxX, frame.x + frame.width);
    maxY = Math.max(maxY, frame.y + frame.height);
  }
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function expandBounds(bounds: WireCanvasBounds, point: Point): void {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

function finalizeBounds(bounds: WireCanvasBounds): WireCanvasBounds {
  return {
    ...bounds,
    width: Math.max(1, bounds.maxX - bounds.minX),
    height: Math.max(1, bounds.maxY - bounds.minY)
  };
}

function colorKey(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, "");
}
