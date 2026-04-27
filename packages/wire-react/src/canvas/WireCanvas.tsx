"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toReactFlow } from "@aigentive/wire-renderers";
import type { WireAction } from "@aigentive/wire-core";
import { useWireActions, useWireContext } from "../hooks.js";
import type { WireSelection } from "../provider/types.js";
import {
  selectionFromEdgeChanges,
  selectionFromNodeChanges,
  wireActionsFromEdgeChanges,
  wireActionsFromNodeChanges,
  wireActionsFromSelectionDelete
} from "./changeActions.js";
import { DEFAULT_NODE_TYPES } from "./nodeTypes.js";
import type { WireNodeRenderer } from "./nodeTypes.js";
import { asSide, SIDE_TO_POSITION } from "./positions.js";
import type { WireOptionCatalog } from "../options.js";

export interface WireCanvasProps {
  mode?: "view" | "edit";
  selectOnNodeClick?: boolean;
  inspectOnNodeClick?: boolean;
  clearSelectionOnPaneClick?: boolean;
  fitView?: boolean;
  fitViewPadding?: number;
  showBackground?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  optionCatalog?: WireOptionCatalog;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  className?: string;
  style?: CSSProperties;
}

export function WireCanvas(props: WireCanvasProps): ReactElement {
  return (
    <ReactFlowProvider>
      <WireCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function WireCanvasInner({
  mode,
  selectOnNodeClick = true,
  inspectOnNodeClick = true,
  clearSelectionOnPaneClick = true,
  fitView = true,
  fitViewPadding = 0.08,
  showBackground = true,
  showControls = true,
  showMiniMap = false,
  optionCatalog,
  renderNodeCard,
  renderGroup,
  nodeTypes,
  edgeTypes,
  className,
  style
}: WireCanvasProps): ReactElement {
  const ctx = useWireContext();
  const actions = useWireActions();
  const effectiveMode = mode ?? ctx.mode;
  const editable = effectiveMode === "edit";

  const reactFlowState = useMemo(() => {
    const converted = toReactFlow(ctx.diagram);
    return {
      nodes: converted.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          optionCatalog,
          renderNodeCard,
          renderGroup
        },
        sourcePosition: node.sourcePosition ? SIDE_TO_POSITION[node.sourcePosition] : undefined,
        targetPosition: node.targetPosition ? SIDE_TO_POSITION[node.targetPosition] : undefined
      })) as Node[],
      edges: converted.edges as unknown as Edge[]
    };
  }, [ctx.diagram, optionCatalog, renderGroup, renderNodeCard]);
  const [nodes, setNodes] = useState<Node[]>(reactFlowState.nodes);
  const [edges, setEdges] = useState<Edge[]>(reactFlowState.edges);
  const selectionRef = useRef<WireSelection>(ctx.selection);

  useEffect(() => {
    setNodes(reactFlowState.nodes);
    setEdges(reactFlowState.edges);
  }, [reactFlowState]);

  useEffect(() => {
    selectionRef.current = ctx.selection;
  }, [ctx.selection]);

  const edgeById = useMemo(
    () => new Map(edges.map((edge) => [edge.id, edge])),
    [edges]
  );
  const explicitEdgeIds = useMemo(
    () => new Set(ctx.diagram.edges.map((edge) => edge.id).filter((id): id is string => Boolean(id))),
    [ctx.diagram.edges]
  );

  const dispatchMany = useCallback(
    (wireActions: WireAction[]) => {
      if (wireActions.length === 1) actions.dispatch(wireActions[0]!);
      else if (wireActions.length > 1) actions.dispatchMany(wireActions);
    },
    [actions]
  );

  const setWireSelection = useCallback(
    (selection: WireSelection, source: "canvas" | "api" = "canvas") => {
      selectionRef.current = selection;
      ctx.selectionActions.setSelection(selection);
      ctx.eventActions.emit({ type: "selection.change", source, selection });
    },
    [ctx.eventActions, ctx.selectionActions]
  );

  const clearWireSelection = useCallback(() => {
    setWireSelection({ nodeIds: [], edgeIds: [] });
  }, [setWireSelection]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
      const nextActions: WireAction[] = wireActionsFromNodeChanges(changes, ctx.diagram, nodes);
      const nextSelection = selectionFromNodeChanges(selectionRef.current, changes);
      if (nextSelection !== selectionRef.current) setWireSelection(nextSelection as WireSelection);
      dispatchMany(nextActions);
    },
    [ctx.diagram, dispatchMany, nodes, setWireSelection]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
      const nextActions: WireAction[] = wireActionsFromEdgeChanges(changes, edgeById, explicitEdgeIds);
      const nextSelection = selectionFromEdgeChanges(selectionRef.current, changes);
      if (nextSelection !== selectionRef.current) setWireSelection(nextSelection as WireSelection);
      dispatchMany(nextActions);
    },
    [dispatchMany, edgeById, explicitEdgeIds, setWireSelection]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      actions.dispatch({
        type: "edge.connect",
        edge: {
          from: connection.source,
          to: connection.target,
          fromHandle: asSide(connection.sourceHandle),
          toHandle: asSide(connection.targetHandle)
        }
      });
    },
    [actions]
  );

  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      if (!editable) return;
      ctx.eventActions.emit({ type: "node.click", source: "canvas", nodeId: node.id });
      if (inspectOnNodeClick) {
        ctx.eventActions.emit({ type: "node.inspect", source: "canvas", nodeId: node.id });
      }
      if (!selectOnNodeClick) return;
      setWireSelection({ nodeIds: [node.id], edgeIds: [] });
      setNodes((currentNodes) => currentNodes.map((candidate) => ({ ...candidate, selected: candidate.id === node.id })));
      setEdges((currentEdges) => currentEdges.map((candidate) => ({ ...candidate, selected: false })));
    },
    [ctx.eventActions, editable, inspectOnNodeClick, selectOnNodeClick, setWireSelection]
  );

  const handleEdgeClick = useCallback(
    (_event: ReactMouseEvent, edge: Edge) => {
      if (!editable) return;
      ctx.eventActions.emit({ type: "edge.click", source: "canvas", edgeId: edge.id });
      setWireSelection({ nodeIds: [], edgeIds: [edge.id] });
      setNodes((currentNodes) => currentNodes.map((candidate) => ({ ...candidate, selected: false })));
      setEdges((currentEdges) => currentEdges.map((candidate) => ({ ...candidate, selected: candidate.id === edge.id })));
    },
    [ctx.eventActions, editable, setWireSelection]
  );

  const handlePaneClick = useCallback(() => {
    if (!editable) return;
    ctx.eventActions.emit({ type: "pane.click", source: "canvas" });
    if (!clearSelectionOnPaneClick) return;
    clearWireSelection();
    setNodes((currentNodes) => currentNodes.map((candidate) => ({ ...candidate, selected: false })));
    setEdges((currentEdges) => currentEdges.map((candidate) => ({ ...candidate, selected: false })));
  }, [clearWireSelection, clearSelectionOnPaneClick, ctx.eventActions, editable]);

  useEffect(() => {
    if (!editable) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (isTextEntryTarget(event.target)) return;

      const nextActions = wireActionsFromSelectionDelete(selectionRef.current, edgeById, explicitEdgeIds);
      if (nextActions.length === 0) return;

      event.preventDefault();
      dispatchMany(nextActions);
      clearWireSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearWireSelection, dispatchMany, editable, edgeById, explicitEdgeIds]);

  const mergedNodeTypes = useMemo(() => ({ ...DEFAULT_NODE_TYPES, ...(nodeTypes ?? {}) }), [nodeTypes]);

  return (
    <div className={className} style={{ width: "100%", height: "100%", minHeight: 420, ...style }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={mergedNodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={editable ? handleNodesChange : undefined}
        onEdgesChange={editable ? handleEdgesChange : undefined}
        onConnect={editable ? handleConnect : undefined}
        onNodeClick={editable ? handleNodeClick : undefined}
        onEdgeClick={editable ? handleEdgeClick : undefined}
        onPaneClick={editable ? handlePaneClick : undefined}
        fitView={fitView}
        fitViewOptions={{ padding: fitViewPadding }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        deleteKeyCode={editable ? ["Backspace", "Delete"] : null}
        proOptions={{ hideAttribution: true }}
      >
        {showBackground ? <Background gap={24} size={1.5} color="#cbd5e1" /> : null}
        {showMiniMap ? <MiniMap pannable zoomable /> : null}
        {showControls ? <Controls style={{ left: 0, bottom: 0, margin: 0 }} /> : null}
      </ReactFlow>
    </div>
  );
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}
