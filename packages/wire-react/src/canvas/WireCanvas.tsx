"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode
} from "react";
import type {
  EdgeLabelStyle,
  EdgeMarker,
  EdgeRouting,
  EdgeStyle,
  LayoutDirection,
  Side,
  WireAction,
  WireNode
} from "@aigentive/wire-core";
import { useWireActions, useWireContext } from "../hooks.js";
import type { WireMode, WireSelection, WireViewport } from "../provider/types.js";
import { wireActionsFromSelectionDelete } from "./changeActions.js";
import {
  buildWireCanvasModel,
  descendantsOfGroup,
  handlePoint,
  markerId,
  sourceSidesForNode,
  targetSidesForNode,
  type Point,
  type WireCanvasBounds,
  type WireCanvasEdgeGeometry,
  type WireCanvasFrame
} from "./geometry.js";
import {
  createWireNodeRenderContext,
  WireNodeCard,
  type WireNodeRenderer
} from "./nodeTypes.js";
import type { WireOptionCatalog } from "../options.js";

export interface WireEdgeRenderContext {
  edge: WireCanvasEdgeGeometry["edge"];
  sourceNode: WireNode;
  targetNode: WireNode;
  sourcePoint: Point;
  targetPoint: Point;
  sourceSide: Side;
  targetSide: Side;
  path: string;
  label?: string;
  selected: boolean;
  style: WireCanvasEdgeGeometry["style"];
}

export type WireEdgeRenderer = (context: WireEdgeRenderContext) => ReactNode;

export interface WireCanvasProps {
  mode?: "view" | "edit";
  selectOnNodeClick?: boolean;
  selectOnEdgeClick?: boolean;
  inspectOnNodeClick?: boolean;
  clearSelectionOnPaneClick?: boolean;
  fitView?: boolean;
  fitViewPadding?: number;
  panOnDrag?: boolean;
  zoomOnScroll?: boolean;
  zoomStep?: number;
  minZoom?: number;
  maxZoom?: number;
  showBackground?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  optionCatalog?: WireOptionCatalog;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  renderEdge?: WireEdgeRenderer;
  edgeStyle?: EdgeStyle;
  edgeRouting?: EdgeRouting;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_MIN_ZOOM = 0.15;
const DEFAULT_MAX_ZOOM = 4;
const DEFAULT_ZOOM_STEP = 1.1;
const WHEEL_ZOOM_DELTA = 120;
const GRID_SIZE = 24;
const HANDLE_SIZE = 12;
const FIT_BOUNDS_PADDING = 20;
const DEFAULT_LABEL_FILL = "#334155";
const DEFAULT_LABEL_BG = "#ffffff";
const DEFAULT_LABEL_BORDER = "#cbd5e1";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface DragState {
  pointerId: number;
  startClient: Point;
  startPositions: Map<string, Point>;
  moved: boolean;
}

interface PanState {
  pointerId: number;
  startClient: Point;
  startViewport: WireViewport;
  moved: boolean;
}

interface ConnectionState {
  pointerId: number;
  sourceId: string;
  sourceSide: Side;
  from: Point;
  to: Point;
}

export function WireCanvas(props: WireCanvasProps): ReactElement {
  return <WireCanvasInner {...props} />;
}

function WireCanvasInner({
  mode,
  selectOnNodeClick,
  selectOnEdgeClick,
  inspectOnNodeClick = true,
  clearSelectionOnPaneClick,
  fitView = true,
  fitViewPadding = 0.08,
  panOnDrag = true,
  zoomOnScroll = true,
  zoomStep = DEFAULT_ZOOM_STEP,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  showBackground = true,
  showControls = true,
  showMiniMap = false,
  optionCatalog,
  renderNodeCard,
  renderGroup,
  renderEdge,
  edgeStyle,
  edgeRouting,
  className,
  style
}: WireCanvasProps): ReactElement {
  const ctx = useWireContext();
  const actions = useWireActions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<WireViewport>(ctx.viewport);
  const selectionRef = useRef<WireSelection>(ctx.selection);
  const dragStateRef = useRef<DragState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const connectionStateRef = useRef<ConnectionState | null>(null);
  const suppressNodeClickRef = useRef(false);
  const suppressPaneClickRef = useRef(false);
  const dragPositionsRef = useRef<Map<string, Point> | undefined>(undefined);
  const viewportRafRef = useRef<number | null>(null);
  const pendingViewportRef = useRef<WireViewport | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingDragPositionsRef = useRef<Map<string, Point> | null>(null);
  const [dragPositions, setDragPositions] = useState<Map<string, Point> | undefined>();
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [fitReady, setFitReady] = useState(!fitView);
  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }> | undefined>();

  const effectiveMode = mode ?? ctx.mode;
  const interaction = resolveWireCanvasInteraction({
    mode: effectiveMode,
    selectOnNodeClick,
    selectOnEdgeClick,
    clearSelectionOnPaneClick
  });
  const editable = interaction.editable;
  const canPan = panOnDrag;
  const canZoom = zoomOnScroll;

  const model = useMemo(
    () => buildWireCanvasModel(ctx.diagram, { positionOverrides: dragPositions, sizeOverrides: measuredSizes, edgeStyle, edgeRouting }),
    [ctx.diagram, dragPositions, edgeRouting, edgeStyle, measuredSizes]
  );

  const handleSlotsByFrame = useMemo(() => {
    const map = new Map<string, Map<Side, { source: number; target: number }>>();
    const bumpSlot = (frameId: string, side: Side, role: "source" | "target") => {
      let perSide = map.get(frameId);
      if (!perSide) {
        perSide = new Map();
        map.set(frameId, perSide);
      }
      const counts = perSide.get(side) ?? { source: 0, target: 0 };
      counts[role] += 1;
      perSide.set(side, counts);
    };
    for (const edge of model.edges) {
      bumpSlot(edge.sourceNode.id, edge.sourceSide, "source");
      bumpSlot(edge.targetNode.id, edge.targetSide, "target");
    }
    return map;
  }, [model.edges]);

  useEffect(() => {
    viewportRef.current = ctx.viewport;
  }, [ctx.viewport]);

  useEffect(() => {
    selectionRef.current = ctx.selection;
  }, [ctx.selection]);

  useEffect(() => {
    dragPositionsRef.current = dragPositions;
  }, [dragPositions]);

  useIsomorphicLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const measure = () => {
      const next = new Map<string, { width: number; height: number }>();
      element.querySelectorAll<HTMLElement>("[data-wire-node]").forEach((nodeElement) => {
        const id = nodeElement.dataset.wireNodeId;
        if (!id) return;
        const width = Math.ceil(nodeElement.offsetWidth);
        const height = Math.ceil(nodeElement.offsetHeight);
        if (width > 0 && height > 0) next.set(id, { width, height });
      });
      setMeasuredSizes((current) => (sameMeasuredSizes(current, next) ? current : next));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    element.querySelectorAll<HTMLElement>("[data-wire-node]").forEach((nodeElement) => observer.observe(nodeElement));
    return () => observer.disconnect();
  }, [ctx.diagram, model.frames]);

  const dispatchMany = useCallback(
    (wireActions: WireAction[]) => {
      if (wireActions.length === 1) actions.dispatch(wireActions[0]!);
      else if (wireActions.length > 1) actions.dispatchMany(wireActions);
    },
    [actions]
  );

  const setWireViewport = useCallback(
    (viewport: WireViewport) => {
      const next: WireViewport = {
        x: viewport.x,
        y: viewport.y,
        zoom: clamp(viewport.zoom, minZoom, maxZoom)
      };
      viewportRef.current = next;
      pendingViewportRef.current = next;
      if (viewportRafRef.current !== null) return;
      if (typeof requestAnimationFrame === "undefined") {
        ctx.viewportActions.setViewport(next);
        return;
      }
      viewportRafRef.current = requestAnimationFrame(() => {
        viewportRafRef.current = null;
        const queued = pendingViewportRef.current;
        pendingViewportRef.current = null;
        if (queued) ctx.viewportActions.setViewport(queued);
      });
    },
    [ctx.viewportActions.setViewport, maxZoom, minZoom]
  );

  useEffect(() => {
    return () => {
      if (viewportRafRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(viewportRafRef.current);
        viewportRafRef.current = null;
      }
      if (dragRafRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, []);

  const setWireSelection = useCallback(
    (selection: WireSelection, source: "canvas" | "api" = "canvas") => {
      selectionRef.current = selection;
      ctx.selectionActions.setSelection(selection);
      ctx.eventActions.emit({ type: "selection.change", source, selection });
    },
    [ctx.eventActions.emit, ctx.selectionActions.setSelection]
  );

  const clearWireSelection = useCallback(() => {
    setWireSelection({ nodeIds: [], edgeIds: [] });
  }, [setWireSelection]);

  const fitToView = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setWireViewport(fitViewportForBounds(model.bounds, rect.width, rect.height, fitViewPadding, minZoom, maxZoom));
    setFitReady(true);
  }, [fitViewPadding, maxZoom, minZoom, model.bounds, setWireViewport]);

  useIsomorphicLayoutEffect(() => {
    if (!fitView) {
      setFitReady(true);
      return undefined;
    }
    fitToView();
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => fitToView());
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitToView, fitView]);

  useEffect(() => {
    if (!editable) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (isTextEntryTarget(event.target)) return;

      const nextActions = wireActionsFromSelectionDelete(selectionRef.current, model.edgeById, model.explicitEdgeIds);
      if (nextActions.length === 0) return;

      event.preventDefault();
      dispatchMany(nextActions);
      clearWireSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearWireSelection, dispatchMany, editable, model.edgeById, model.explicitEdgeIds]);

  const handleWheelEvent = useCallback(
    (event: WheelEvent) => {
      if (!canZoom) return;
      event.preventDefault();
      event.stopPropagation();
      const element = containerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const viewport = viewportRef.current;
      const wheelDelta = normalizeWheelDelta(event);
      if (wheelDelta === 0) return;
      const wheelSteps = clamp(Math.abs(wheelDelta) / WHEEL_ZOOM_DELTA, 0.04, 1);
      const zoomFactor = Math.pow(zoomStep, wheelDelta > 0 ? -wheelSteps : wheelSteps);
      const zoom = clamp(viewport.zoom * zoomFactor, minZoom, maxZoom);
      const world = {
        x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
        y: (event.clientY - rect.top - viewport.y) / viewport.zoom
      };
      setWireViewport({
        x: event.clientX - rect.left - world.x * zoom,
        y: event.clientY - rect.top - world.y * zoom,
        zoom
      });
    },
    [canZoom, maxZoom, minZoom, setWireViewport, zoomStep]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !canZoom) return undefined;
    element.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => element.removeEventListener("wheel", handleWheelEvent);
  }, [canZoom, handleWheelEvent]);

  const handlePanePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canPan || event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;
      panStateRef.current = {
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startViewport: viewportRef.current,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan]
  );

  const updatePan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pan = panStateRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      const dx = event.clientX - pan.startClient.x;
      const dy = event.clientY - pan.startClient.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
      setWireViewport({
        x: pan.startViewport.x + dx,
        y: pan.startViewport.y + dy,
        zoom: pan.startViewport.zoom
      });
    },
    [setWireViewport]
  );

  const endPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pan = panStateRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return false;
      panStateRef.current = null;
      if (pan.moved) suppressPaneClickRef.current = true;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return pan.moved;
    },
    []
  );

  const handlePanePointerMove = updatePan;
  const handlePanePointerUp = endPan;

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (suppressPaneClickRef.current) {
        suppressPaneClickRef.current = false;
        return;
      }
      if (isInteractiveTarget(event.target)) return;
      ctx.eventActions.emit({ type: "pane.click", source: "canvas" });
      if (interaction.clearSelectionOnPaneClick) clearWireSelection();
    },
    [clearWireSelection, ctx.eventActions, interaction.clearSelectionOnPaneClick]
  );

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, frame: WireCanvasFrame) => {
      if (event.button !== 0) return;
      if (isHandleTarget(event.target)) return;
      if (!editable) {
        if (!canPan) return;
        panStateRef.current = {
          pointerId: event.pointerId,
          startClient: { x: event.clientX, y: event.clientY },
          startViewport: viewportRef.current,
          moved: false
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      const ids = draggableNodeIds(frame.node, ctx.diagram.nodes, selectionRef.current);
      const startPositions = new Map<string, Point>();
      for (const id of ids) {
        const current = model.framesById.get(id);
        if (current) startPositions.set(id, { x: current.x, y: current.y });
      }
      if (startPositions.size === 0) return;

      dragStateRef.current = {
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startPositions,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, ctx.diagram.nodes, editable, model.framesById]
  );

  const handleNodePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable && panStateRef.current) {
      updatePan(event);
      return;
    }
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const viewport = viewportRef.current;
    const dx = (event.clientX - drag.startClient.x) / viewport.zoom;
    const dy = (event.clientY - drag.startClient.y) / viewport.zoom;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (!drag.moved) return;
    const next = new Map<string, Point>();
    for (const [id, start] of drag.startPositions) {
      next.set(id, { x: start.x + dx, y: start.y + dy });
    }
    dragPositionsRef.current = next;
    pendingDragPositionsRef.current = next;
    if (dragRafRef.current !== null) return;
    if (typeof requestAnimationFrame === "undefined") {
      setDragPositions(next);
      return;
    }
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      const queued = pendingDragPositionsRef.current;
      pendingDragPositionsRef.current = null;
      if (queued) setDragPositions(queued);
    });
  }, [editable, updatePan]);

  const handleNodePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editable && panStateRef.current) {
        if (endPan(event)) suppressNodeClickRef.current = true;
        return;
      }
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (dragRafRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      pendingDragPositionsRef.current = null;

      const positions = dragPositionsRef.current;
      setDragPositions(undefined);
      if (!drag.moved || !positions) return;

      suppressNodeClickRef.current = true;
      const nextActions: WireAction[] = [];
      for (const [id, position] of positions) {
        const start = drag.startPositions.get(id);
        if (!start || (start.x === position.x && start.y === position.y)) continue;
        nextActions.push({ type: "node.move", id, position });
      }
      dispatchMany(nextActions);
    },
    [dispatchMany, editable, endPan]
  );

  const handleConnectionPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, frame: WireCanvasFrame, side: Side) => {
      if (!editable || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const from = handlePoint(frame, side);
      const next = {
        pointerId: event.pointerId,
        sourceId: frame.id,
        sourceSide: side,
        from,
        to: from
      };
      connectionStateRef.current = next;
      setConnection(next);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [editable]
  );

  const handleConnectionPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = connectionStateRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const to = clientPointToWorld(event.clientX, event.clientY, containerRef.current, viewportRef.current);
    const next = { ...current, to };
    connectionStateRef.current = next;
    setConnection(next);
  }, []);

  const handleConnectionPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const current = connectionStateRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      connectionStateRef.current = null;
      setConnection(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const target = targetHandleFromPoint(event.clientX, event.clientY);
      if (!target || target.nodeId === current.sourceId) return;
      actions.dispatch({
        type: "edge.connect",
        edge: {
          from: current.sourceId,
          to: target.nodeId,
          fromHandle: current.sourceSide,
          toHandle: target.side
        }
      });
    },
    [actions]
  );

  const handleNodeClick = useCallback(
    (event: ReactMouseEvent, node: WireNode) => {
      event.stopPropagation();
      if (suppressNodeClickRef.current) {
        suppressNodeClickRef.current = false;
        return;
      }
      ctx.eventActions.emit({ type: "node.click", source: "canvas", nodeId: node.id });
      if (inspectOnNodeClick) {
        ctx.eventActions.emit({ type: "node.inspect", source: "canvas", nodeId: node.id });
      }
      if (!interaction.selectOnNodeClick) return;
      setWireSelection({ nodeIds: [node.id], edgeIds: [] });
    },
    [ctx.eventActions, inspectOnNodeClick, interaction.selectOnNodeClick, setWireSelection]
  );

  const handleEdgeClick = useCallback(
    (event: ReactMouseEvent, edgeId: string) => {
      event.stopPropagation();
      ctx.eventActions.emit({ type: "edge.click", source: "canvas", edgeId });
      if (!interaction.selectOnEdgeClick) return;
      setWireSelection({ nodeIds: [], edgeIds: [edgeId] });
    },
    [ctx.eventActions, interaction.selectOnEdgeClick, setWireSelection]
  );

  const selectedNodeIds = new Set(ctx.selection.nodeIds);
  const selectedEdgeIds = new Set(ctx.selection.edgeIds);
  const rootStyle = useMemo<CSSProperties>(
    () => ({
      width: "100%",
      height: "100%",
      minHeight: 420,
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#f8fafc",
      touchAction: "none",
      userSelect: dragPositions || connection ? "none" : undefined,
      cursor: panStateRef.current ? "grabbing" : canPan ? "grab" : "default",
      ...gridBackground(showBackground),
      ...style,
      visibility: fitReady ? style?.visibility : "hidden"
    }),
    [canPan, connection, ctx.viewport, dragPositions, fitReady, showBackground, style]
  );

  return (
    <div
      ref={containerRef}
      data-wire-canvas
      className={className}
      style={rootStyle}
      onPointerDown={handlePanePointerDown}
      onPointerMove={handlePanePointerMove}
      onPointerUp={handlePanePointerUp}
      onClick={handlePaneClick}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${ctx.viewport.x}px, ${ctx.viewport.y}px) scale(${ctx.viewport.zoom})`,
          transformOrigin: "0 0"
        }}
      >
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            overflow: "visible",
            pointerEvents: "none"
          }}
        >
          <WireMarkerDefs edges={model.edges} connection={connection} />
          <g>
            {model.edges.map((edge) => (
              <WireEdge
                key={edge.edge.id}
                geometry={edge}
                selected={selectedEdgeIds.has(edge.edge.id)}
                renderEdge={renderEdge}
                onClick={handleEdgeClick}
              />
            ))}
            {connection ? <DraftConnection connection={connection} /> : null}
          </g>
        </svg>

        {model.frames.map((frame) => {
          const selected = selectedNodeIds.has(frame.id);
          const renderer = frame.node.kind === "group"
            ? renderGroup ?? renderNodeCard ?? WireNodeCard
            : renderNodeCard ?? WireNodeCard;
          const renderContext = createWireNodeRenderContext({
            node: frame.node,
            selected,
            width: frame.width,
            height: frame.height,
            optionCatalog,
            renderNodeCard,
            renderGroup
          });

          return (
            <div
              key={frame.id}
              data-wire-interactive
              data-wire-node
              data-wire-node-id={frame.id}
              onPointerDown={(event) => handleNodePointerDown(event, frame)}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
              onClick={(event) => handleNodeClick(event, frame.node)}
              style={{
                position: "absolute",
                left: frame.x,
                top: frame.y,
                width: frame.width,
                minHeight: frame.height,
                zIndex: frame.node.kind === "group" ? 1 : frame.node.parent ? 3 : 2,
                cursor: editable || canPan ? "grab" : "pointer"
              }}
            >
              <div style={{ width: frame.width, minHeight: frame.height }}>
                {renderer(renderContext)}
              </div>
              <WireHandles
                frame={frame}
                direction={model.direction}
                editable={editable}
                slots={handleSlotsByFrame.get(frame.id)}
                onSourcePointerDown={handleConnectionPointerDown}
                onSourcePointerMove={handleConnectionPointerMove}
                onSourcePointerUp={handleConnectionPointerUp}
              />
            </div>
          );
        })}
      </div>

      {showMiniMap ? <WireMiniMap model={model} viewport={ctx.viewport} /> : null}
      {showControls ? (
        <WireControls
          onFit={fitToView}
          onZoomIn={() => setWireViewport(zoomViewport(ctx.viewport, zoomStep, minZoom, maxZoom))}
          onZoomOut={() => setWireViewport(zoomViewport(ctx.viewport, 1 / zoomStep, minZoom, maxZoom))}
        />
      ) : null}
    </div>
  );
}

function WireEdge({
  geometry,
  selected,
  renderEdge,
  onClick
}: {
  geometry: WireCanvasEdgeGeometry;
  selected: boolean;
  renderEdge?: WireEdgeRenderer;
  onClick: (event: ReactMouseEvent, edgeId: string) => void;
}): ReactElement {
  const stroke = selected ? "#2563eb" : geometry.style.stroke;
  const strokeWidth = selected ? geometry.style.strokeWidth + 1.25 : geometry.style.strokeWidth;
  const markerEnd = geometry.style.markerEnd === "none"
    ? undefined
    : `url(#${markerId(geometry.style.markerEnd, geometry.style.stroke, "end")})`;
  const markerStart = geometry.style.markerStart === "none"
    ? undefined
    : `url(#${markerId(geometry.style.markerStart, geometry.style.stroke, "start")})`;
  const context: WireEdgeRenderContext = {
    edge: geometry.edge,
    sourceNode: geometry.sourceNode,
    targetNode: geometry.targetNode,
    sourcePoint: geometry.sourcePoint,
    targetPoint: geometry.targetPoint,
    sourceSide: geometry.sourceSide,
    targetSide: geometry.targetSide,
    path: geometry.path,
    label: geometry.label,
    selected,
    style: geometry.style
  };

  return (
    <g data-wire-interactive data-wire-edge data-wire-edge-id={geometry.edge.id}>
      {renderEdge ? renderEdge(context) : (
        <path
          d={geometry.path}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={geometry.style.strokeDasharray}
          markerEnd={markerEnd}
          markerStart={markerStart}
          opacity={geometry.edge.synthesized ? 0.95 : 1}
        />
      )}
      <path
        d={geometry.path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, strokeWidth + 10)}
        pointerEvents="stroke"
        onClick={(event) => onClick(event, geometry.edge.id)}
      />
      {geometry.label ? <WireEdgeLabel geometry={geometry} /> : null}
    </g>
  );
}

function WireEdgeLabel({ geometry }: { geometry: WireCanvasEdgeGeometry }): ReactElement {
  const style: EdgeLabelStyle = geometry.edge.labelStyle ?? {};
  const fontSize = style.fontSize ?? 11;
  const label = geometry.label ?? "";
  const labelWidth = label.length * (fontSize * 0.56) + 12;
  return (
    <g pointerEvents="none">
      <rect
        x={geometry.labelPoint.x - labelWidth / 2}
        y={geometry.labelPoint.y - fontSize + 1}
        width={labelWidth}
        height={fontSize + 7}
        rx={4}
        fill={style.background ?? DEFAULT_LABEL_BG}
        stroke={style.border ?? DEFAULT_LABEL_BORDER}
        strokeWidth={0.5}
        fillOpacity={0.94}
      />
      <text
        x={geometry.labelPoint.x}
        y={geometry.labelPoint.y + 1}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fill={style.fill ?? DEFAULT_LABEL_FILL}
      >
        {label}
      </text>
    </g>
  );
}

function WireHandles({
  frame,
  direction,
  editable,
  slots,
  onSourcePointerDown,
  onSourcePointerMove,
  onSourcePointerUp
}: {
  frame: WireCanvasFrame;
  direction: LayoutDirection;
  editable: boolean;
  slots: Map<Side, { source: number; target: number }> | undefined;
  onSourcePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, frame: WireCanvasFrame, side: Side) => void;
  onSourcePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSourcePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}): ReactElement {
  const sourceSides = sourceSidesForNode(frame.node, direction);
  const targetSides = targetSidesForNode(frame.node, direction);
  const sides = uniqueSides([...targetSides, ...sourceSides]);
  const isCondition = frame.node.kind === "condition";

  return (
    <>
      {sides.flatMap((side) => {
        const isSource = sourceSides.includes(side);
        const isTarget = targetSides.includes(side);
        const counts = slots?.get(side);
        const sourceCount = counts?.source ?? 0;
        const targetCount = counts?.target ?? 0;
        const slotCount = isCondition ? 1 : Math.max(sourceCount, targetCount, 1);
        return Array.from({ length: slotCount }, (_, slotIndex) => (
          <button
            key={`${side}-${slotIndex}`}
            type="button"
            aria-label={`${frame.id} ${side} handle ${slotIndex + 1}`}
            data-wire-interactive
            data-wire-handle
            data-wire-node-id={frame.id}
            data-wire-side={side}
            data-wire-source-handle={isSource ? "true" : undefined}
            data-wire-target-handle={isTarget ? "true" : undefined}
            disabled={!editable || !isSource}
            onPointerDown={isSource ? (event) => onSourcePointerDown(event, frame, side) : undefined}
            onPointerMove={isSource ? onSourcePointerMove : undefined}
            onPointerUp={isSource ? onSourcePointerUp : undefined}
            style={{
              position: "absolute",
              ...handleSlotStyle(side, slotIndex, slotCount, frame.width, frame.height),
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              borderRadius: 999,
              border: "2px solid #ffffff",
              background: isSource && isTarget ? "#2563eb" : isSource ? "#475569" : "#ffffff",
              boxShadow: "0 0 0 1px #64748b",
              padding: 0,
              opacity: editable ? 1 : 0.68,
              cursor: editable && isSource ? "crosshair" : "default",
              pointerEvents: editable || isTarget ? "auto" : "none"
            }}
          />
        ));
      })}
    </>
  );
}

function WireControls({
  onFit,
  onZoomIn,
  onZoomOut
}: {
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}): ReactElement {
  return (
    <div
      data-wire-interactive
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        display: "inline-flex",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px) saturate(1.2)",
        WebkitBackdropFilter: "blur(14px) saturate(1.2)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -8px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)"
      }}
    >
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </ControlButton>
      <ControlButton label="Zoom out" onClick={onZoomOut} divider>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
      </ControlButton>
      <ControlButton label="Fit view" onClick={onFit} divider wide>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        <span style={{ marginLeft: 5, fontSize: 11.5, fontWeight: 600, color: "#334155" }}>Fit</span>
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  divider = false,
  wide = false,
  children
}: {
  label: string;
  onClick: () => void;
  divider?: boolean;
  wide?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{
        height: 30,
        ...(wide ? { padding: "0 12px" } : { width: 30 }),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        borderLeft: divider ? "1px solid rgba(15,23,42,0.08)" : "0",
        background: "transparent",
        color: "#475569",
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

function WireMiniMap({
  model,
  viewport
}: {
  model: ReturnType<typeof buildWireCanvasModel>;
  viewport: WireViewport;
}): ReactElement {
  const width = 184;
  const height = 104;
  const pad = 8;
  const scale = Math.min(
    (width - pad * 2) / model.bounds.width,
    (height - pad * 2) / model.bounds.height
  );
  const toX = (x: number) => pad + (x - model.bounds.minX) * scale;
  const toY = (y: number) => pad + (y - model.bounds.minY) * scale;
  const viewW = width / viewport.zoom * scale;
  const viewH = height / viewport.zoom * scale;
  const viewX = pad + (-viewport.x / viewport.zoom - model.bounds.minX) * scale;
  const viewY = pad + (-viewport.y / viewport.zoom - model.bounds.minY) * scale;

  return (
    <svg
      data-wire-interactive
      aria-label="Canvas minimap"
      width={width}
      height={height}
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px) saturate(1.2)",
        WebkitBackdropFilter: "blur(14px) saturate(1.2)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -8px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)"
      }}
    >
      {model.edges.map((edge) => (
        <path
          key={edge.edge.id}
          d={edge.path}
          transform={`translate(${pad - model.bounds.minX * scale} ${pad - model.bounds.minY * scale}) scale(${scale})`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1 / scale}
          opacity={0.7}
        />
      ))}
      {model.frames.map((frame) => (
        <rect
          key={frame.id}
          x={toX(frame.x)}
          y={toY(frame.y)}
          width={Math.max(2, frame.width * scale)}
          height={Math.max(2, frame.height * scale)}
          rx={2}
          fill={frame.node.kind === "group" ? "#f1f5f9" : "#64748b"}
          stroke={frame.node.kind === "group" ? "#94a3b8" : "#475569"}
          strokeWidth={0.8}
          opacity={frame.node.kind === "group" ? 0.75 : 0.9}
        />
      ))}
      <rect
        x={viewX}
        y={viewY}
        width={Math.max(8, viewW)}
        height={Math.max(8, viewH)}
        rx={3}
        fill="none"
        stroke="#2563eb"
        strokeWidth={1.2}
      />
    </svg>
  );
}

function WireMarkerDefs({
  edges,
  connection
}: {
  edges: WireCanvasEdgeGeometry[];
  connection: ConnectionState | null;
}): ReactElement {
  const markers = new Map<string, { shape: EdgeMarker; color: string; dir: "start" | "end" }>();
  for (const geometry of edges) {
    if (geometry.style.markerEnd !== "none") {
      markers.set(markerId(geometry.style.markerEnd, geometry.style.stroke, "end"), {
        shape: geometry.style.markerEnd,
        color: geometry.style.stroke,
        dir: "end"
      });
    }
    if (geometry.style.markerStart !== "none") {
      markers.set(markerId(geometry.style.markerStart, geometry.style.stroke, "start"), {
        shape: geometry.style.markerStart,
        color: geometry.style.stroke,
        dir: "start"
      });
    }
  }
  if (connection) {
    markers.set(markerId("arrow", "#2563eb", "end"), { shape: "arrow", color: "#2563eb", dir: "end" });
  }

  return (
    <defs>
      {[...markers.values()].map((marker) => (
        <WireMarker key={markerId(marker.shape, marker.color, marker.dir)} {...marker} />
      ))}
    </defs>
  );
}

function WireMarker({
  shape,
  color,
  dir
}: {
  shape: EdgeMarker;
  color: string;
  dir: "start" | "end";
}): ReactElement | null {
  if (shape === "none") return null;
  const id = markerId(shape, color, dir);
  if (shape === "arrow") {
    return (
      <marker id={id} viewBox="0 0 10 10" refX={dir === "end" ? 9 : 1} refY={5} markerWidth={10} markerHeight={10} markerUnits="userSpaceOnUse" orient="auto">
        <path d={dir === "end" ? "M0,0 L10,5 L0,10 z" : "M10,0 L0,5 L10,10 z"} fill={color} />
      </marker>
    );
  }
  if (shape === "circle") {
    return (
      <marker id={id} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={8} markerHeight={8} markerUnits="userSpaceOnUse" orient="auto">
        <circle cx={5} cy={5} r={4} fill={color} />
      </marker>
    );
  }
  return (
    <marker id={id} viewBox="0 0 10 10" refX={dir === "end" ? 9 : 1} refY={5} markerWidth={10} markerHeight={10} markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,5 L5,0 L10,5 L5,10 z" fill={color} />
    </marker>
  );
}

function DraftConnection({ connection }: { connection: ConnectionState }): ReactElement {
  const d = `M ${connection.from.x} ${connection.from.y} L ${connection.to.x} ${connection.to.y}`;
  return (
    <path
      d={d}
      fill="none"
      stroke="#2563eb"
      strokeWidth={1.75}
      strokeDasharray="5 5"
      markerEnd={`url(#${markerId("arrow", "#2563eb", "end")})`}
      pointerEvents="none"
    />
  );
}

export interface WireCanvasInteractionOptions {
  mode: WireMode | "view" | "edit";
  selectOnNodeClick?: boolean;
  selectOnEdgeClick?: boolean;
  clearSelectionOnPaneClick?: boolean;
}

export interface WireCanvasInteraction {
  editable: boolean;
  selectOnNodeClick: boolean;
  selectOnEdgeClick: boolean;
  clearSelectionOnPaneClick: boolean;
  elementsSelectable: boolean;
}

export function resolveWireCanvasInteraction({
  mode,
  selectOnNodeClick,
  selectOnEdgeClick,
  clearSelectionOnPaneClick
}: WireCanvasInteractionOptions): WireCanvasInteraction {
  const editable = mode === "edit";
  const nextSelectOnNodeClick = selectOnNodeClick ?? editable;
  const nextSelectOnEdgeClick = selectOnEdgeClick ?? editable;
  return {
    editable,
    selectOnNodeClick: nextSelectOnNodeClick,
    selectOnEdgeClick: nextSelectOnEdgeClick,
    clearSelectionOnPaneClick: clearSelectionOnPaneClick ?? editable,
    elementsSelectable: editable || nextSelectOnNodeClick || nextSelectOnEdgeClick
  };
}

function fitViewportForBounds(
  bounds: WireCanvasBounds,
  width: number,
  height: number,
  paddingRatio: number,
  minZoom: number,
  maxZoom: number
): WireViewport {
  if (width <= 0 || height <= 0) return { x: 0, y: 0, zoom: 1 };
  const paddedBounds = {
    minX: bounds.minX - FIT_BOUNDS_PADDING,
    minY: bounds.minY - FIT_BOUNDS_PADDING,
    width: bounds.width + FIT_BOUNDS_PADDING * 2,
    height: bounds.height + FIT_BOUNDS_PADDING * 2
  };
  const rawPadding = Math.max(16, Math.min(width, height) * paddingRatio);
  const padding = Math.min(rawPadding, width / 3, height / 3);
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const zoom = clamp(Math.min(availableWidth / paddedBounds.width, availableHeight / paddedBounds.height), minZoom, maxZoom);
  return {
    x: (width - paddedBounds.width * zoom) / 2 - paddedBounds.minX * zoom,
    y: (height - paddedBounds.height * zoom) / 2 - paddedBounds.minY * zoom,
    zoom
  };
}

function zoomViewport(viewport: WireViewport, factor: number, minZoom: number, maxZoom: number): WireViewport {
  return {
    ...viewport,
    zoom: clamp(viewport.zoom * factor, minZoom, maxZoom)
  };
}

function clientPointToWorld(clientX: number, clientY: number, element: HTMLElement | null, viewport: WireViewport): Point {
  const rect = element?.getBoundingClientRect();
  return {
    x: (clientX - (rect?.left ?? 0) - viewport.x) / viewport.zoom,
    y: (clientY - (rect?.top ?? 0) - viewport.y) / viewport.zoom
  };
}

function draggableNodeIds(node: WireNode, nodes: WireNode[], selection: WireSelection): string[] {
  const seedIds = selection.nodeIds.includes(node.id) && selection.nodeIds.length > 0 ? selection.nodeIds : [node.id];
  const ids = new Set<string>();
  const addNode = (id: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    const candidate = nodes.find((n) => n.id === id);
    if (candidate?.kind !== "group") return;
    for (const childId of candidate.children ?? []) addNode(childId);
    for (const child of descendantsOfGroup(candidate.id, nodes)) addNode(child.id);
  };
  for (const id of seedIds) addNode(id);
  return [...ids];
}

function uniqueSides(sides: Side[]): Side[] {
  return sides.filter((side, index) => sides.indexOf(side) === index);
}

function handleSlotStyle(
  side: Side,
  slotIndex: number,
  slotCount: number,
  frameWidth: number,
  frameHeight: number
): CSSProperties {
  const t = slotCount <= 1 ? 0.5 : 0.25 + (slotIndex / (slotCount - 1)) * 0.5;
  if (side === "left") {
    return { left: -HANDLE_SIZE / 2, top: t * frameHeight - HANDLE_SIZE / 2 };
  }
  if (side === "right") {
    return { right: -HANDLE_SIZE / 2, top: t * frameHeight - HANDLE_SIZE / 2 };
  }
  if (side === "top") {
    return { top: -HANDLE_SIZE / 2, left: t * frameWidth - HANDLE_SIZE / 2 };
  }
  return { bottom: -HANDLE_SIZE / 2, left: t * frameWidth - HANDLE_SIZE / 2 };
}

function sameMeasuredSizes(
  current: Map<string, { width: number; height: number }> | undefined,
  next: Map<string, { width: number; height: number }>
): boolean {
  if (!current || current.size !== next.size) return false;
  for (const [id, size] of next) {
    const existing = current.get(id);
    if (!existing || existing.width !== size.width || existing.height !== size.height) return false;
  }
  return true;
}

function gridBackground(showBackground: boolean): CSSProperties {
  if (!showBackground) return {};
  return {
    backgroundImage: "radial-gradient(circle, #cbd5e1 0.75px, transparent 0.75px)",
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
  };
}

function targetHandleFromPoint(clientX: number, clientY: number): { nodeId: string; side: Side } | undefined {
  if (typeof document === "undefined") return undefined;
  const element = document.elementFromPoint(clientX, clientY);
  const target = element instanceof HTMLElement
    ? element.closest<HTMLElement>("[data-wire-target-handle='true']")
    : undefined;
  const nodeId = target?.dataset.wireNodeId;
  const side = target?.dataset.wireSide;
  if (!nodeId || !isSide(side)) return undefined;
  return { nodeId, side };
}

function isInteractiveTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest("[data-wire-interactive]"));
}

function isHandleTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest("[data-wire-handle]"));
}

function isSide(value: string | undefined): value is Side {
  return value === "left" || value === "right" || value === "top" || value === "bottom";
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function normalizeWheelDelta(event: { deltaY: number; deltaMode: number }): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * 360;
  return event.deltaY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
