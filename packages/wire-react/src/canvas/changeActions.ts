import type { Edge, EdgeChange, NodeChange } from "@xyflow/react";
import type { WireAction } from "@aigentive/wire-core";

export interface SelectionLike {
  nodeIds: readonly string[];
  edgeIds: readonly string[];
}

export function wireActionsFromNodeChanges(changes: NodeChange[]): WireAction[] {
  const nextActions: WireAction[] = [];
  for (const change of changes) {
    if (change.type === "remove") {
      nextActions.push({ type: "node.remove", id: change.id });
    } else if (change.type === "position" && change.position && change.dragging === false) {
      nextActions.push({ type: "node.move", id: change.id, position: change.position });
    }
  }
  return nextActions;
}

export function selectionFromNodeChanges(selection: SelectionLike, changes: NodeChange[]): SelectionLike {
  const selectedNodeIds = new Set(selection.nodeIds);
  let changedSelection = false;
  let selectedNode = false;

  for (const change of changes) {
    if (change.type !== "select") continue;
    changedSelection = true;
    if (change.selected) {
      selectedNode = true;
      selectedNodeIds.add(change.id);
    } else {
      selectedNodeIds.delete(change.id);
    }
  }

  if (!changedSelection) return selection;
  return {
    nodeIds: [...selectedNodeIds],
    edgeIds: selectedNode ? [] : selection.edgeIds
  };
}

export function selectionFromEdgeChanges(selection: SelectionLike, changes: EdgeChange[]): SelectionLike {
  const selectedEdgeIds = new Set(selection.edgeIds);
  let changedSelection = false;
  let selectedEdge = false;

  for (const change of changes) {
    if (change.type !== "select") continue;
    changedSelection = true;
    if (change.selected) {
      selectedEdge = true;
      selectedEdgeIds.add(change.id);
    } else {
      selectedEdgeIds.delete(change.id);
    }
  }

  if (!changedSelection) return selection;
  return {
    nodeIds: selectedEdge ? [] : selection.nodeIds,
    edgeIds: [...selectedEdgeIds]
  };
}

export function wireActionsFromEdgeChanges(
  changes: EdgeChange[],
  edgeById: ReadonlyMap<string, Edge>,
  explicitEdgeIds: ReadonlySet<string>
): WireAction[] {
  const nextActions: WireAction[] = [];
  for (const change of changes) {
    if (change.type !== "remove") continue;
    const edge = edgeById.get(change.id);
    if (!edge) continue;
    if (explicitEdgeIds.has(change.id)) {
      nextActions.push({ type: "edge.remove", id: change.id });
    } else {
      const branch = typeof edge.data?.branch === "string" ? edge.data.branch : undefined;
      nextActions.push({ type: "edge.disconnect", from: edge.source, to: edge.target, branch });
    }
  }
  return nextActions;
}

export function wireActionsFromSelectionDelete(
  selection: SelectionLike,
  edgeById: ReadonlyMap<string, Edge>,
  explicitEdgeIds: ReadonlySet<string>
): WireAction[] {
  const selectedNodeIds = new Set(selection.nodeIds);
  const edgeChanges: EdgeChange[] = [];
  for (const edgeId of selection.edgeIds) {
    const edge = edgeById.get(edgeId);
    if (!edge) continue;
    if (selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)) continue;
    edgeChanges.push({ type: "remove", id: edgeId });
  }

  return [
    ...wireActionsFromEdgeChanges(edgeChanges, edgeById, explicitEdgeIds),
    ...selection.nodeIds.map((id) => ({ type: "node.remove", id }) satisfies WireAction)
  ];
}
