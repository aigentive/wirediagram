import { normalize, type ResolvedEdge, type WireDiagram, type WireEdge, type WireNode } from "@aigentive/wire-core";
import type { WireSelection } from "../provider/types.js";

export type WireInspectedTarget =
  | { type: "node"; node: WireNode }
  | { type: "edge"; edge: ResolvedEdge; explicitEdge?: WireEdge; editable: boolean }
  | { type: "mixed" }
  | { type: "empty" };

export interface ResolveWireInspectionTargetOptions {
  nodeId?: string;
  edgeId?: string;
  selection?: WireSelection;
}

export function resolveWireInspectionTarget(
  diagram: WireDiagram,
  { nodeId, edgeId, selection }: ResolveWireInspectionTargetOptions
): WireInspectedTarget {
  if (nodeId) {
    const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
    return node ? { type: "node", node } : { type: "empty" };
  }

  if (edgeId) {
    return resolveEdgeTarget(diagram, edgeId);
  }

  const selectedNodeIds = selection?.nodeIds ?? [];
  const selectedEdgeIds = selection?.edgeIds ?? [];
  if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
    const node = diagram.nodes.find((candidate) => candidate.id === selectedNodeIds[0]);
    return node ? { type: "node", node } : { type: "empty" };
  }
  if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
    return resolveEdgeTarget(diagram, selectedEdgeIds[0]!);
  }
  if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) return { type: "mixed" };
  return { type: "empty" };
}

function resolveEdgeTarget(diagram: WireDiagram, edgeId: string): WireInspectedTarget {
  const explicitEdge = diagram.edges.find((edge) => edge.id === edgeId);
  const resolved = normalize(diagram).resolvedEdges.find((edge) => edge.id === edgeId);
  if (!resolved && !explicitEdge) return { type: "empty" };
  if (resolved) {
    return {
      type: "edge",
      edge: resolved,
      explicitEdge,
      editable: Boolean(explicitEdge?.id) && !resolved.synthesized
    };
  }
  return {
    type: "edge",
    edge: {
      id: edgeId,
      from: explicitEdge!.from,
      to: explicitEdge!.to,
      branch: explicitEdge!.branch,
      label: explicitEdge!.label,
      tone: explicitEdge!.tone,
      synthesized: false,
      fromHandle: explicitEdge!.fromHandle,
      toHandle: explicitEdge!.toHandle,
      style: explicitEdge!.style,
      labelStyle: explicitEdge!.labelStyle,
      routing: explicitEdge!.routing
    },
    explicitEdge,
    editable: Boolean(explicitEdge!.id)
  };
}
