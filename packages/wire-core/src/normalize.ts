import {
  type WireDiagram,
  type WireNode,
  type WireEdge,
  type Side,
  type EdgeStyle,
  type EdgeLabelStyle,
  type EdgeRouting,
  splitFromRef
} from "./schema.js";

/**
 * Internal normalized graph form: edges are explicit, `from` references on
 * nodes are unchanged (still source-of-truth), `after` is folded into `from`.
 */
export interface NormalizedGraph {
  diagram: WireDiagram;
  /** All edges — explicit `edges[]` plus edges synthesized from `from`. */
  resolvedEdges: ResolvedEdge[];
  nodeIndex: Map<string, WireNode>;
}

export interface ResolvedEdge {
  id: string;
  from: string;
  fromBranch?: string;
  to: string;
  branch?: string;
  label?: string;
  tone?: WireEdge["tone"];
  /** True when the edge was synthesized from a node's `from`/`after`, not from `edges[]`. */
  synthesized: boolean;
  /** Pinned source-side handle. Only carried for explicit edges. */
  fromHandle?: Side;
  /** Pinned target-side handle. Only carried for explicit edges. */
  toHandle?: Side;
  /** Edge stroke + marker overrides. Only carried for explicit edges. */
  style?: EdgeStyle;
  /** Edge label overrides. Only carried for explicit edges. */
  labelStyle?: EdgeLabelStyle;
  /** Routing strategy override. */
  routing?: EdgeRouting;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Normalize a diagram for downstream layout / rendering / validation.
 *
 * - Folds `after` into `from` (preserves both on the original node so
 *   round-trip JSON keeps the author's intent).
 * - Resolves `from` references on nodes into explicit edges.
 * - Returns an index by node id.
 *
 * Does NOT throw on bad refs — that's validation's job. Unresolved edges
 * are still emitted so the caller can show them.
 */
export function normalize(diagram: WireDiagram): NormalizedGraph {
  const nodeIndex = new Map<string, WireNode>();
  for (const node of diagram.nodes) {
    nodeIndex.set(node.id, node);
  }

  const resolvedEdges: ResolvedEdge[] = [];
  let edgeCounter = 0;
  const seenEdgeIds = new Set<string>();

  function nextEdgeId(seed: string): string {
    let id = seed;
    while (seenEdgeIds.has(id)) {
      edgeCounter += 1;
      id = `${seed}-${edgeCounter}`;
    }
    seenEdgeIds.add(id);
    return id;
  }

  // Synthesize edges from node.from / node.after.
  for (const node of diagram.nodes) {
    if (node.kind === "note") {
      // Notes use attachedTo, not from — never produce edges.
      continue;
    }
    const fromRefs = [
      ...asArray((node as { from?: string | string[] }).from),
      ...asArray((node as { after?: string | string[] }).after)
    ];
    for (const ref of fromRefs) {
      const { nodeId: fromId, branch } = splitFromRef(ref);
      const id = nextEdgeId(`${fromId}->${node.id}${branch ? `:${branch}` : ""}`);
      resolvedEdges.push({
        id,
        from: fromId,
        fromBranch: branch,
        to: node.id,
        branch,
        synthesized: true,
        tone: node.tone
      });
    }
  }

  // Append explicit edges.
  for (const edge of diagram.edges) {
    const { nodeId: fromId, branch: fromBranch } = splitFromRef(edge.from);
    const id = nextEdgeId(edge.id ?? `${fromId}->${edge.to}${edge.branch ? `:${edge.branch}` : ""}`);
    resolvedEdges.push({
      id,
      from: fromId,
      fromBranch: fromBranch ?? edge.branch,
      to: edge.to,
      branch: edge.branch ?? fromBranch,
      label: edge.label,
      tone: edge.tone,
      synthesized: false,
      fromHandle: edge.fromHandle,
      toHandle: edge.toHandle,
      style: edge.style,
      labelStyle: edge.labelStyle,
      routing: edge.routing
    });
  }

  return { diagram, resolvedEdges, nodeIndex };
}
