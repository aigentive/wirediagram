import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { WireAction, WireDiagram, WireNode } from "@aigentive/wire-core";

export interface SelectionLike {
  nodeIds: readonly string[];
  edgeIds: readonly string[];
}

export function wireActionsFromNodeChanges(
  changes: NodeChange[],
  diagram?: WireDiagram,
  currentNodes?: Node[]
): WireAction[] {
  const nextActions: WireAction[] = [];
  for (const change of changes) {
    if (change.type === "remove") {
      nextActions.push({ type: "node.remove", id: change.id });
    }
  }

  const moveChanges = changes.filter(
    (change): change is NodeChange & { type: "position"; position: { x: number; y: number } } =>
      change.type === "position" && Boolean(change.position) && change.dragging === false
  );

  if (diagram && currentNodes && moveChanges.length > 0) {
    const rfNodeById = new Map(currentNodes.map((node) => [node.id, node]));
    const diagramNodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
    const positionChangeById = new Map(moveChanges.map((change) => [change.id, change.position]));
    const movedIds = new Set<string>();

    for (const change of moveChanges) {
      const position = absoluteReactFlowPosition(change.id, rfNodeById, positionChangeById);
      if (!position) continue;
      nextActions.push({ type: "node.move", id: change.id, position });
      movedIds.add(change.id);

      const node = diagramNodeById.get(change.id);
      if (node?.kind !== "group") continue;

      for (const child of descendantsOfGroup(change.id, diagram.nodes)) {
        if (movedIds.has(child.id) || positionChangeById.has(child.id)) continue;
        const childPosition = absoluteReactFlowPosition(child.id, rfNodeById, positionChangeById);
        if (!childPosition) continue;
        nextActions.push({ type: "node.move", id: child.id, position: childPosition });
        movedIds.add(child.id);
      }
    }
    return nextActions;
  }

  for (const change of changes) {
    if (change.type === "position" && change.position && change.dragging === false) {
      nextActions.push({ type: "node.move", id: change.id, position: change.position });
    }
  }
  return nextActions;
}

function absoluteReactFlowPosition(
  id: string,
  rfNodeById: ReadonlyMap<string, Node>,
  positionChangeById: ReadonlyMap<string, { x: number; y: number }>
): { x: number; y: number } | undefined {
  const node = rfNodeById.get(id);
  if (!node) return undefined;
  const position = positionChangeById.get(id) ?? node.position;
  if (!node.parentId) return position;
  const parentPosition = absoluteReactFlowPosition(node.parentId, rfNodeById, positionChangeById);
  if (!parentPosition) return position;
  return {
    x: parentPosition.x + position.x,
    y: parentPosition.y + position.y
  };
}

function descendantsOfGroup(groupId: string, nodes: WireNode[]): WireNode[] {
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
