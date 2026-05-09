import dagre from "@dagrejs/dagre";
import {
  type WireDiagram,
  type LayoutDirection,
  splitFromRef
} from "./schema.js";
import { normalize, type ResolvedEdge } from "./normalize.js";

export interface LayoutOptions {
  /** Override the diagram's `layout` field. */
  direction?: LayoutDirection;
  /** Default node width when no `size` is provided. */
  defaultNodeWidth?: number;
  /** Default node height when no `size` is provided. */
  defaultNodeHeight?: number;
  /** Spacing between nodes on the rank axis (perpendicular to flow). */
  rankSep?: number;
  /** Spacing between nodes on the same rank. */
  nodeSep?: number;
}

export interface LayoutNodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  direction: LayoutDirection;
  nodes: LayoutNodePosition[];
  edges: ResolvedEdge[];
  /** Diagram bounds — useful for SVG viewBox. */
  bounds: { width: number; height: number };
}

const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 80;

const NOTE_NODE_W = 220;
const NOTE_NODE_H = 88;
const NOTE_OFFSET = 32;

const GROUP_NODE_W = 320;
const GROUP_NODE_H = 200;

function dagreDirection(d: LayoutDirection): "LR" | "TB" | "RL" | "BT" {
  return d;
}

/**
 * Compute layout coordinates for every node using dagre. Notes attached to
 * other nodes are placed adjacent to their host (not part of the dag flow).
 *
 * Positions for nodes that already declare `position` are respected — dagre
 * is only asked to lay out the rest.
 */
export function layoutDiagram(
  diagram: WireDiagram,
  opts: LayoutOptions = {}
): LayoutResult {
  const direction = opts.direction ?? diagram.layout ?? "LR";
  const nodeW = opts.defaultNodeWidth ?? DEFAULT_NODE_W;
  const nodeH = opts.defaultNodeHeight ?? DEFAULT_NODE_H;

  const { resolvedEdges, nodeIndex } = normalize(diagram);

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: dagreDirection(direction),
    nodesep: opts.nodeSep ?? 60,
    ranksep: opts.rankSep ?? 90,
    marginx: 20,
    marginy: 20
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add only nodes that participate in flow (skip notes — placed manually).
  for (const node of diagram.nodes) {
    if (node.kind === "note") continue;
    const w = node.size?.width ?? (node.kind === "group" ? GROUP_NODE_W : nodeW);
    const h = node.size?.height ?? (node.kind === "group" ? GROUP_NODE_H : nodeH);
    g.setNode(node.id, { width: w, height: h });
  }

  for (const edge of resolvedEdges) {
    if (!nodeIndex.has(edge.from) || !nodeIndex.has(edge.to)) continue;
    if (nodeIndex.get(edge.from)?.kind === "note") continue;
    if (nodeIndex.get(edge.to)?.kind === "note") continue;
    g.setEdge(edge.from, edge.to, {}, edge.id);
  }

  dagre.layout(g);

  const positions: LayoutNodePosition[] = [];
  let maxX = 0;
  let maxY = 0;

  for (const node of diagram.nodes) {
    if (node.kind === "note") continue;
    const dnode = g.node(node.id);
    const explicit = node.position;
    const width = dnode?.width ?? nodeW;
    const height = dnode?.height ?? nodeH;
    // dagre returns center coords — convert to top-left for renderer convenience.
    // Explicit positions are author-supplied top-left and pass through as-is.
    const tlx = explicit ? explicit.x : (dnode?.x ?? 0) - width / 2;
    const tly = explicit ? explicit.y : (dnode?.y ?? 0) - height / 2;
    positions.push({ id: node.id, x: tlx, y: tly, width, height });
    maxX = Math.max(maxX, tlx + width);
    maxY = Math.max(maxY, tly + height);
  }

  // Place notes next to their host (or near origin if unattached).
  for (const node of diagram.nodes) {
    if (node.kind !== "note") continue;
    const w = node.size?.width ?? NOTE_NODE_W;
    const h = node.size?.height ?? NOTE_NODE_H;
    let x = node.position?.x ?? 0;
    let y = node.position?.y ?? 0;

    if (!node.position && node.attachedTo) {
      const host = positions.find((p) => p.id === node.attachedTo);
      if (host) {
        // Place note offset from host depending on flow direction.
        if (direction === "LR" || direction === "RL") {
          x = host.x;
          y = host.y - h - NOTE_OFFSET;
        } else {
          x = host.x + host.width + NOTE_OFFSET;
          y = host.y;
        }
      }
    }
    positions.push({ id: node.id, x, y, width: w, height: h });
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return {
    direction,
    nodes: positions,
    edges: resolvedEdges,
    bounds: { width: Math.max(maxX, 1), height: Math.max(maxY, 1) }
  };
}

export { splitFromRef };
