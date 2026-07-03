"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject
} from "react";
import type {
  EdgeLabelStyle,
  EdgeMarker,
  EdgeRouting,
  EdgeStyle,
  LayoutDirection,
  Side,
  WireAction,
  WireDiagram,
  WireNode
} from "@aigentive/wire-core";
import { useWireActions, useWireContext } from "../hooks.js";
import type { WireMode, WireSelection, WireViewport, WireViewportActions } from "../provider/types.js";
import { normalizeWireSelection, sameWireSelection } from "../provider/runtimeState.js";
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
  type WireCanvasFrame,
  type WireCanvasModel
} from "./geometry.js";
import {
  createWireNodeRenderContext,
  WireNodeCard,
  type WireNodeRenderer
} from "./nodeTypes.js";
import type { WireOptionCatalog } from "../options.js";
import { cx, themeClass, type WireColorMode } from "../components/classes.js";
import { dispatchWireInspectorFocusRequest } from "../components/workspaceFocusEvents.js";

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
  inspectOnEdgeClick?: boolean;
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
  readOnly?: boolean;
  colorMode?: WireColorMode;
  unstyled?: boolean;
  classNames?: {
    root?: string;
    viewport?: string;
    background?: string;
    node?: string;
    group?: string;
    edge?: string;
    handle?: string;
    controls?: string;
    minimap?: string;
    status?: string;
    search?: string;
    connectionPicker?: string;
  };
  keyboardA11y?: boolean;
  nodesFocusable?: boolean;
  edgesFocusable?: boolean;
  autoPanOnNodeFocus?: boolean;
  optionCatalog?: WireOptionCatalog;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  renderEdge?: WireEdgeRenderer;
  edgeStyle?: EdgeStyle;
  edgeRouting?: EdgeRouting;
  ariaLabelConfig?: {
    canvas?: string;
    node?: (node: WireNode) => string;
    edge?: (edge: WireEdgeRenderContext["edge"]) => string;
    handle?: (context: { node: WireNode; side: Side; role: "source" | "target" }) => string;
    minimap?: string;
    validationStatus?: string;
    search?: string;
    connectionTarget?: string;
    controls?: {
      zoomIn?: string;
      zoomOut?: string;
      fitView?: string;
      fitSelection?: string;
    };
  };
  isValidConnection?: (context: {
    sourceNode: WireNode;
    targetNode: WireNode;
    sourceSide: Side;
    targetSide: Side;
    diagram: WireDiagram;
  }) => boolean | string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_MIN_ZOOM = 0.15;
const DEFAULT_MAX_ZOOM = 4;
const DEFAULT_ZOOM_STEP = 1.1;
const DEFAULT_FIT_VIEW_PADDING = 0.2;
const LARGE_DIAGRAM_NODE_THRESHOLD = 1000;
const LARGE_DIAGRAM_EDGE_THRESHOLD = 1200;
const WHEEL_ZOOM_DELTA = 120;
const GRID_SIZE = 24;
const HANDLE_SIZE = 9;
const FIT_BOUNDS_PADDING = 20;
const DEFAULT_LABEL_FILL = "#334155";
const DEFAULT_LABEL_BG = "#ffffff";
const DEFAULT_LABEL_BORDER = "#cbd5e1";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface DragState {
  pointerId: number;
  startClient: Point;
  startPositions: Map<string, Point>;
  commitFrames: WireCanvasFrame[];
  moved: boolean;
}

interface PanState {
  pointerId: number;
  startClient: Point;
  startViewport: WireViewport;
  moved: boolean;
}

interface ConnectionCandidate {
  nodeId: string;
  side: Side;
  point: Point;
}

interface ConnectionState {
  pointerId: number;
  sourceId: string;
  sourceSide: Side;
  from: Point;
  to: Point;
  candidate: ConnectionCandidate | null;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface MiniMapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WireCanvasFocusItem {
  type: "node" | "edge";
  id: string;
}

interface WireCanvasStatus {
  message: string;
  key: number;
}

interface WireCanvasSearchState {
  query: string;
  activeIndex: number;
  previousItem: WireCanvasFocusItem | null;
}

interface WireCanvasSearchResult extends WireCanvasFocusItem {
  label: string;
  searchText: string;
}

interface WireCanvasConnectionPickerState {
  sourceId: string;
  sourceSide: Side;
  targetSide: Side;
  query: string;
  activeIndex: number;
  message: string | null;
  messageKey: number;
}

interface WireCanvasConnectionTarget {
  nodeId: string;
  label: string;
  side: Side;
  distance: number;
  diagramIndex: number;
}

interface PendingConnectionFocus {
  sourceId: string;
  targetId: string;
  sourceSide: Side;
  targetSide: Side;
}

export function WireCanvas(props: WireCanvasProps): ReactElement {
  return <WireCanvasInner {...props} />;
}

function WireCanvasInner({
  mode,
  selectOnNodeClick,
  selectOnEdgeClick,
  inspectOnNodeClick = true,
  inspectOnEdgeClick = true,
  clearSelectionOnPaneClick,
  fitView = true,
  fitViewPadding = DEFAULT_FIT_VIEW_PADDING,
  panOnDrag = true,
  zoomOnScroll = true,
  zoomStep = DEFAULT_ZOOM_STEP,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  showBackground = true,
  showControls = true,
  showMiniMap = false,
  readOnly = false,
  colorMode,
  unstyled = false,
  classNames,
  keyboardA11y,
  nodesFocusable,
  edgesFocusable,
  autoPanOnNodeFocus = true,
  optionCatalog,
  renderNodeCard,
  renderGroup,
  renderEdge,
  edgeStyle,
  edgeRouting,
  ariaLabelConfig,
  isValidConnection,
  className,
  style
}: WireCanvasProps): ReactElement {
  const ctx = useWireContext();
  const actions = useWireActions();
  const reactId = useId();
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
  const pendingViewportEventRef = useRef<Parameters<typeof ctx.viewportActions.setViewport>[1]>();
  const dragRafRef = useRef<number | null>(null);
  const pendingDragPositionsRef = useRef<Map<string, Point> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const connectionPickerInputRef = useRef<HTMLInputElement | null>(null);
  const pendingConnectionFocusRef = useRef<PendingConnectionFocus | null>(null);
  const modelBoundsRef = useRef<WireCanvasBounds | null>(null);
  const initialFitDoneRef = useRef(!fitView);
  const largeDiagramAnnouncementRef = useRef<{ active: boolean; key: string | null }>({ active: false, key: null });
  const [dragPositions, setDragPositions] = useState<Map<string, Point> | undefined>();
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [search, setSearch] = useState<WireCanvasSearchState | null>(null);
  const [connectionPicker, setConnectionPicker] = useState<WireCanvasConnectionPickerState | null>(null);
  const [slowRender, setSlowRender] = useState(false);
  const [fitReady, setFitReady] = useState(!fitView);
  const [canvasSize, setCanvasSize] = useState<CanvasSize | undefined>();
  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }> | undefined>();
  const [activeItem, setActiveItem] = useState<WireCanvasFocusItem | null>(null);
  const [status, setStatus] = useState<WireCanvasStatus | null>(null);
  const [connectionFeedback, setConnectionFeedback] = useState<WireCanvasStatus | null>(null);

  const effectiveMode = mode ?? canvasInteractionModeForWireMode(ctx.mode);
  const keyboardEnabled = keyboardA11y ?? true;
  const nodeFocusEnabled = keyboardEnabled && (nodesFocusable ?? true);
  const edgeFocusEnabled = keyboardEnabled && (edgesFocusable ?? true);
  const statusId = `wire-canvas-status-${reactId.replace(/:/g, "")}`;
  const searchInputId = `wire-canvas-search-${reactId.replace(/:/g, "")}`;
  const searchListId = `wire-canvas-search-results-${reactId.replace(/:/g, "")}`;
  const connectionPickerInputId = `wire-canvas-connection-target-${reactId.replace(/:/g, "")}`;
  const connectionPickerListId = `wire-canvas-connection-results-${reactId.replace(/:/g, "")}`;
  const connectionFeedbackId = `wire-canvas-connection-feedback-${reactId.replace(/:/g, "")}`;
  const interaction = resolveWireCanvasInteraction({
    mode: effectiveMode,
    selectOnNodeClick,
    selectOnEdgeClick,
    clearSelectionOnPaneClick
  });
  const editable = interaction.editable && !readOnly;
  const canPan = panOnDrag;
  const canZoom = zoomOnScroll;

  const model = useMemo(
    () => buildWireCanvasModel(ctx.diagram, { positionOverrides: dragPositions, sizeOverrides: measuredSizes, edgeStyle, edgeRouting }),
    [ctx.diagram, dragPositions, edgeRouting, edgeStyle, measuredSizes]
  );
  modelBoundsRef.current = model.bounds;
  const largeDiagram = model.frames.length > LARGE_DIAGRAM_NODE_THRESHOLD || model.edges.length > LARGE_DIAGRAM_EDGE_THRESHOLD;
  const focusItems = useMemo(
    () => canvasFocusItems(model, nodeFocusEnabled, edgeFocusEnabled),
    [edgeFocusEnabled, model, nodeFocusEnabled]
  );
  const searchResults = useMemo(
    () => search ? canvasSearchResults(focusItems, model, search.query) : [],
    [focusItems, model, search]
  );
  const activeSearchResult = searchResults.length > 0
    ? searchResults[Math.min(search?.activeIndex ?? 0, searchResults.length - 1)] ?? null
    : null;
  const connectionTargets = useMemo(
    () => connectionPicker ? canvasConnectionTargets(model, connectionPicker) : [],
    [connectionPicker, model]
  );
  const activeConnectionTarget = connectionTargets.length > 0
    ? connectionTargets[Math.min(connectionPicker?.activeIndex ?? 0, connectionTargets.length - 1)] ?? null
    : null;
  const selectedItemCount = ctx.selection.nodeIds.length + ctx.selection.edgeIds.length;
  const hasSelection = selectedItemCount > 0;

  const announce = useCallback((message: string) => {
    setStatus((current) => ({ message, key: (current?.key ?? 0) + 1 }));
  }, []);

  const announceConnectionFeedback = useCallback((message: string) => {
    announce(message);
    setConnectionFeedback((current) => ({ message, key: (current?.key ?? 0) + 1 }));
  }, [announce]);

  const focusCanvasItem = useCallback((item: WireCanvasFocusItem | null) => {
    setActiveItem(item);
    if (!item) return;
    requestAnimationFrameOrTimeout(() => {
      focusElementForCanvasItem(containerRef.current, item);
    });
  }, []);

  useEffect(() => {
    const key = `${ctx.diagram.id ?? "diagram"}:${model.frames.length}:${model.edges.length}`;
    const previous = largeDiagramAnnouncementRef.current;
    if (largeDiagram) {
      if (!previous.active || previous.key !== key) {
        announce(`Large diagram mode enabled for ${model.frames.length} nodes and ${model.edges.length} edges.`);
      }
      largeDiagramAnnouncementRef.current = { active: true, key };
      return;
    }
    if (previous.active) {
      announce("Large diagram mode disabled.");
    }
    largeDiagramAnnouncementRef.current = { active: false, key };
  }, [announce, ctx.diagram.id, largeDiagram, model.edges.length, model.frames.length]);

  useEffect(() => {
    if (!largeDiagram) {
      setSlowRender(false);
      return undefined;
    }

    let complete = false;
    const timeout = setTimeout(() => {
      if (complete) return;
      setSlowRender(true);
      announce("Rendering large diagram.");
    }, 250);
    const finish = () => {
      complete = true;
      clearTimeout(timeout);
      setSlowRender(false);
    };
    if (typeof requestAnimationFrame === "undefined") {
      const handle = setTimeout(finish, 0);
      return () => {
        complete = true;
        clearTimeout(timeout);
        clearTimeout(handle);
      };
    }
    const frame = requestAnimationFrame(finish);
    return () => {
      complete = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [announce, largeDiagram, model.edges.length, model.frames.length]);

  useEffect(() => {
    if (!keyboardEnabled) {
      setActiveItem(null);
      return;
    }
    if (focusItems.length === 0) {
      setActiveItem(null);
      return;
    }
    setActiveItem((current) => current && focusItems.some((item) => sameFocusItem(item, current)) ? current : focusItems[0]!);
  }, [focusItems, keyboardEnabled]);

  useEffect(() => {
    if (!search) return;
    setSearch((current) => current ? {
      ...current,
      activeIndex: clampIndex(current.activeIndex, searchResults.length)
    } : current);
  }, [search?.query, searchResults.length]);

  useEffect(() => {
    if (!connectionPicker) return;
    setConnectionPicker((current) => current ? {
      ...current,
      activeIndex: clampIndex(current.activeIndex, connectionTargets.length)
    } : current);
  }, [connectionPicker?.query, connectionPicker?.sourceSide, connectionPicker?.targetSide, connectionTargets.length]);

  useEffect(() => {
    if (!search) return;
    requestAnimationFrameOrTimeout(() => searchInputRef.current?.focus());
  }, [Boolean(search)]);

  useEffect(() => {
    if (!connectionPicker) return;
    requestAnimationFrameOrTimeout(() => connectionPickerInputRef.current?.focus());
  }, [Boolean(connectionPicker)]);

  useEffect(() => {
    const pending = pendingConnectionFocusRef.current;
    if (!pending || !edgeFocusEnabled) return;
    const edge = model.edges.find((candidate) =>
      candidate.edge.from === pending.sourceId
      && candidate.edge.to === pending.targetId
      && (candidate.edge.fromHandle ?? candidate.sourceSide) === pending.sourceSide
      && (candidate.edge.toHandle ?? candidate.targetSide) === pending.targetSide
    );
    if (!edge) return;
    pendingConnectionFocusRef.current = null;
    focusCanvasItem({ type: "edge", id: edge.edge.id });
  }, [edgeFocusEnabled, focusCanvasItem, model.edges]);

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

    const measureCanvas = () => {
      const rect = element.getBoundingClientRect();
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setCanvasSize((current) => (sameCanvasSize(current, next) ? current : next));
    };

    const measure = () => {
      measureCanvas();
      const next = new Map<string, { width: number; height: number }>();
      if (!largeDiagram) {
        element.querySelectorAll<HTMLElement>("[data-wire-node]").forEach((nodeElement) => {
          const id = nodeElement.dataset.wireNodeId;
          if (!id) return;
          const width = Math.ceil(nodeElement.offsetWidth);
          const height = Math.ceil(nodeElement.offsetHeight);
          if (width > 0 && height > 0) next.set(id, { width, height });
        });
      }
      setMeasuredSizes((current) => (sameMeasuredSizes(current, next) ? current : next.size > 0 ? next : undefined));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (!largeDiagram) {
      element.querySelectorAll<HTMLElement>("[data-wire-node]").forEach((nodeElement) => observer.observe(nodeElement));
    }
    return () => observer.disconnect();
  }, [ctx.diagram, largeDiagram, model.frames]);

  const dispatchMany = useCallback(
    (wireActions: WireAction[]) => {
      if (wireActions.length === 1) actions.dispatch(wireActions[0]!);
      else if (wireActions.length > 1) actions.dispatchMany(wireActions);
    },
    [actions]
  );

  const setWireViewport = useCallback(
    (viewport: WireViewport, event?: Parameters<typeof ctx.viewportActions.setViewport>[1]) => {
      const next: WireViewport = {
        x: viewport.x,
        y: viewport.y,
        zoom: clamp(viewport.zoom, minZoom, maxZoom)
      };
      viewportRef.current = next;
      pendingViewportRef.current = next;
      pendingViewportEventRef.current = event;
      if (viewportRafRef.current !== null) return;
      if (typeof requestAnimationFrame === "undefined") {
        ctx.viewportActions.setViewport(next, event);
        return;
      }
      viewportRafRef.current = requestAnimationFrame(() => {
        viewportRafRef.current = null;
        const queued = pendingViewportRef.current;
        const queuedEvent = pendingViewportEventRef.current;
        pendingViewportRef.current = null;
        pendingViewportEventRef.current = undefined;
        if (queued) ctx.viewportActions.setViewport(queued, queuedEvent);
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
    (selection: WireSelection, source: "canvas" | "api" = "canvas", cause: "node" | "edge" | "pane" | "keyboard" | "api" = "api") => {
      const previousSelection = selectionRef.current;
      const nextSelection = normalizeWireSelection(selection);
      if (sameWireSelection(previousSelection, nextSelection)) return;
      selectionRef.current = nextSelection;
      ctx.selectionActions.setSelection(nextSelection, { source, previousSelection, cause });
      ctx.eventActions.emit({ type: "selection.change", source, selection: nextSelection, previousSelection, cause });
    },
    [ctx.eventActions.emit, ctx.selectionActions.setSelection]
  );

  const clearWireSelection = useCallback((cause: "pane" | "keyboard" | "api" = "api") => {
    setWireSelection({ nodeIds: [], edgeIds: [] }, "canvas", cause);
  }, [setWireSelection]);

  const clearDragPreview = useCallback(() => {
    if (dragRafRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingDragPositionsRef.current = null;
    dragPositionsRef.current = undefined;
    setDragPositions(undefined);
  }, []);

  const fitToView = useCallback((): boolean => {
    const element = containerRef.current;
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const bounds = modelBoundsRef.current;
    if (!bounds) return false;
    setWireViewport(
      fitViewportForBounds(bounds, rect.width, rect.height, fitViewPadding, minZoom, maxZoom),
      { source: "canvas", cause: "fit-view", intent: "fit-view" }
    );
    setFitReady(true);
    return true;
  }, [fitViewPadding, maxZoom, minZoom, setWireViewport]);

  const fitSelectionToView = useCallback((): boolean => {
    const element = containerRef.current;
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const selectionBounds = boundsForSelection(ctx.selection, model);
    if (!selectionBounds) {
      announce("No selected items to fit.");
      return false;
    }
    setWireViewport(
      fitViewportForBounds(selectionBounds.bounds, rect.width, rect.height, fitViewPadding, minZoom, maxZoom),
      { source: "canvas", cause: "fit-view", intent: "fit-selection" }
    );
    setFitReady(true);
    const selectedFocusItems = selectedFocusItemsForSelection(ctx.selection, model, nodeFocusEnabled, edgeFocusEnabled);
    const nextFocus = activeItem && selectedFocusItems.some((item) => sameFocusItem(item, activeItem))
      ? activeItem
      : selectedFocusItems[0] ?? null;
    if (nextFocus) focusCanvasItem(nextFocus);
    announce(`Fitted ${selectionBounds.count} selected ${selectionBounds.count === 1 ? "item" : "items"}.`);
    return true;
  }, [
    activeItem,
    announce,
    ctx.selection,
    edgeFocusEnabled,
    fitViewPadding,
    focusCanvasItem,
    maxZoom,
    minZoom,
    model,
    nodeFocusEnabled,
    setWireViewport
  ]);

  useIsomorphicLayoutEffect(() => {
    if (!fitView) {
      initialFitDoneRef.current = false;
      setFitReady(true);
      return undefined;
    }
    if (initialFitDoneRef.current) {
      setFitReady(true);
      return undefined;
    }

    const attemptInitialFit = () => {
      if (!initialFitDoneRef.current && fitToView()) {
        initialFitDoneRef.current = true;
        return true;
      }
      return false;
    };

    if (attemptInitialFit()) return undefined;

    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      setFitReady(true);
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      if (attemptInitialFit()) observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitToView, fitView]);

  const closeSearch = useCallback((restoreFocus: boolean) => {
    setSearch((current) => {
      if (restoreFocus && current?.previousItem) {
        focusCanvasItem(current.previousItem);
      }
      return null;
    });
  }, [focusCanvasItem]);

  const openSearch = useCallback((previousItem: WireCanvasFocusItem | null) => {
    setConnectionPicker(null);
    setSearch({ query: "", activeIndex: 0, previousItem });
    announce("Search opened.");
  }, [announce]);

  const closeConnectionPicker = useCallback((restoreSourceFocus: boolean) => {
    setConnectionPicker((current) => {
      if (restoreSourceFocus && current) focusCanvasItem({ type: "node", id: current.sourceId });
      return null;
    });
  }, [focusCanvasItem]);

  const openConnectionPicker = useCallback((item: WireCanvasFocusItem) => {
    if (item.type !== "node") return;
    const frame = model.framesById.get(item.id);
    if (!frame) return;
    const sourceSide = sourceSidesForNode(frame.node, model.direction)[0] ?? "right";
    const targetSide = firstTargetSideForConnection(model, item.id) ?? "left";
    setSearch(null);
    setConnectionFeedback(null);
    setConnectionPicker({
      sourceId: item.id,
      sourceSide,
      targetSide,
      query: "",
      activeIndex: 0,
      message: null,
      messageKey: 0
    });
    announce(`Choose a connection target for ${frame.node.title || frame.id}.`);
  }, [announce, model]);

  const commitConnectionPicker = useCallback(() => {
    if (!connectionPicker) return;
    const target = activeConnectionTarget;
    const reject = (message: string) => {
      announceConnectionFeedback(message);
      setConnectionPicker((current) => current ? {
        ...current,
        message,
        messageKey: current.messageKey + 1
      } : current);
    };

    if (!target) {
      reject("No valid target is selected.");
      return;
    }

    const sourceNode = model.nodeById.get(connectionPicker.sourceId);
    const targetNode = model.nodeById.get(target.nodeId);
    if (!sourceNode || !targetNode) {
      reject("No valid target is selected.");
      return;
    }

    const validationResult = isValidConnection?.({
      sourceNode,
      targetNode,
      sourceSide: connectionPicker.sourceSide,
      targetSide: target.side,
      diagram: ctx.diagram
    }) ?? true;

    if (validationResult !== true) {
      reject(typeof validationResult === "string" ? validationResult : "Connection not allowed.");
      return;
    }

    actions.dispatch({
      type: "edge.connect",
      edge: {
        from: connectionPicker.sourceId,
        to: target.nodeId,
        fromHandle: connectionPicker.sourceSide,
        toHandle: target.side
      }
    });
    pendingConnectionFocusRef.current = {
      sourceId: connectionPicker.sourceId,
      targetId: target.nodeId,
      sourceSide: connectionPicker.sourceSide,
      targetSide: target.side
    };
    setConnectionPicker(null);
    setConnectionFeedback(null);
    announce(`Connected ${sourceNode.title || sourceNode.id} to ${targetNode.title || targetNode.id}.`);
    focusCanvasItem({ type: "node", id: connectionPicker.sourceId });
  }, [actions, activeConnectionTarget, announce, announceConnectionFeedback, connectionPicker, ctx.diagram, focusCanvasItem, isValidConnection, model.nodeById]);

  const handleSearchKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!search) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setSearch((current) => current ? {
        ...current,
        activeIndex: nextCompositeIndex(current.activeIndex, searchResults.length, direction)
      } : current);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setSearch((current) => current ? {
        ...current,
        activeIndex: event.key === "Home" ? 0 : Math.max(0, searchResults.length - 1)
      } : current);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!activeSearchResult) {
        announce("No diagram item is selected.");
        return;
      }
      setSearch(null);
      focusCanvasItem(activeSearchResult);
      announce(`${activeSearchResult.label} focused.`);
    }
  }, [activeSearchResult, announce, closeSearch, focusCanvasItem, search, searchResults.length]);

  const handleConnectionPickerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!connectionPicker) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeConnectionPicker(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setConnectionPicker((current) => current ? {
        ...current,
        activeIndex: nextCompositeIndex(current.activeIndex, connectionTargets.length, direction),
        message: null
      } : current);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setConnectionPicker((current) => current ? {
        ...current,
        activeIndex: event.key === "Home" ? 0 : Math.max(0, connectionTargets.length - 1),
        message: null
      } : current);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitConnectionPicker();
    }
  }, [closeConnectionPicker, commitConnectionPicker, connectionPicker, connectionTargets.length]);

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!keyboardEnabled || event.defaultPrevented || shouldIgnoreCanvasKeyboardEvent(event.target, event.currentTarget)) return;
      const eventItem = focusItemFromElement(event.target);
      const item = eventItem ?? activeItem;

      if (event.key === "Escape") {
        if (connectionPicker) {
          event.preventDefault();
          closeConnectionPicker(true);
          return;
        }
        if (selectionRef.current.nodeIds.length > 0 || selectionRef.current.edgeIds.length > 0) {
          event.preventDefault();
          clearWireSelection("keyboard");
          announce("Selection cleared.");
        }
        return;
      }

      if (event.key === "/" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openSearch(item);
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && editable) {
        const keyboardSelection = selectionForKeyboardCommand(selectionRef.current, item);
        const nextActions = wireActionsFromSelectionDelete(keyboardSelection, model.edgeById, model.explicitEdgeIds);
        if (nextActions.length === 0) return;
        event.preventDefault();
        dispatchMany(nextActions);
        clearWireSelection("keyboard");
        announce("Selection deleted.");
        return;
      }

      if (event.key.toLowerCase() === "c" && !event.altKey && !event.ctrlKey && !event.metaKey && editable && item?.type === "node") {
        event.preventDefault();
        openConnectionPicker(item);
        return;
      }

      if (event.key === "Enter" && event.shiftKey && !event.altKey && item) {
        event.preventDefault();
        if (item.type === "node") {
          setWireSelection({ nodeIds: [item.id], edgeIds: [] }, "canvas", "keyboard");
          ctx.eventActions.emit({ type: "node.inspect", source: "canvas", nodeId: item.id, input: "keyboard" });
        } else {
          setWireSelection({ nodeIds: [], edgeIds: [item.id] }, "canvas", "keyboard");
          ctx.eventActions.emit({ type: "edge.click", source: "canvas", edgeId: item.id, input: "keyboard", intent: inspectOnEdgeClick ? "inspect" : "select" });
        }
        dispatchWireInspectorFocusRequest(event.currentTarget, { item });
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && item) {
        event.preventDefault();
        if (item.type === "node") {
          setWireSelection({ nodeIds: [item.id], edgeIds: [] }, "canvas", "keyboard");
          ctx.eventActions.emit({ type: "node.click", source: "canvas", nodeId: item.id, input: "keyboard" });
          if (inspectOnNodeClick) ctx.eventActions.emit({ type: "node.inspect", source: "canvas", nodeId: item.id, input: "keyboard" });
        } else {
          setWireSelection({ nodeIds: [], edgeIds: [item.id] }, "canvas", "keyboard");
          ctx.eventActions.emit({ type: "edge.click", source: "canvas", edgeId: item.id, input: "keyboard", intent: inspectOnEdgeClick ? "inspect" : "select" });
        }
        return;
      }

      if (event.key.startsWith("Arrow") && editable && item?.type === "node") {
        const delta = keyboardNudgeDelta(event);
        if (!delta) return;
        event.preventDefault();
        const keyboardSelection = selectionForKeyboardCommand(selectionRef.current, item);
        if (keyboardSelection.nodeIds.length === 0) return;
        if (selectionRef.current.nodeIds.length === 0) {
          setWireSelection({ nodeIds: [item.id], edgeIds: [] }, "canvas", "keyboard");
        }
        const nextActions: WireAction[] = [];
        for (const id of keyboardSelection.nodeIds) {
          const frame = model.framesById.get(id);
          if (!frame) continue;
          nextActions.push({ type: "node.move", id, position: { x: frame.x + delta.x, y: frame.y + delta.y } });
        }
        dispatchMany(nextActions);
        return;
      }

      const nextFocus = nextFocusItemForKey(event, focusItems, item);
      if (nextFocus) {
        event.preventDefault();
        focusCanvasItem(nextFocus);
      }
    },
    [
      activeItem,
      announce,
      clearWireSelection,
      closeConnectionPicker,
      connectionPicker,
      ctx.eventActions,
      dispatchMany,
      editable,
      focusCanvasItem,
      focusItems,
      inspectOnEdgeClick,
      inspectOnNodeClick,
      keyboardEnabled,
      model.edgeById,
      model.explicitEdgeIds,
      model.framesById,
      openConnectionPicker,
      openSearch,
      setWireSelection
    ]
  );

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
      }, { source: "canvas", cause: "zoom" });
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
      if (keyboardEnabled) event.currentTarget.focus();
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
    [canPan, keyboardEnabled]
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
      }, { source: "canvas", cause: "pan" });
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

  const handlePanePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panStateRef.current = null;
  }, []);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (suppressPaneClickRef.current) {
        suppressPaneClickRef.current = false;
        return;
      }
      if (isInteractiveTarget(event.target)) return;
      ctx.eventActions.emit({ type: "pane.click", source: "canvas" });
      if (interaction.clearSelectionOnPaneClick) clearWireSelection("pane");
    },
    [clearWireSelection, ctx.eventActions, interaction.clearSelectionOnPaneClick]
  );

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, frame: WireCanvasFrame) => {
      if (event.button !== 0) return;
      if (isHandleTarget(event.target)) return;
      event.stopPropagation();
      if (nodeFocusEnabled) {
        setActiveItem({ type: "node", id: frame.id });
        event.currentTarget.focus();
      }
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
      if (interaction.selectOnNodeClick && !selectionRef.current.nodeIds.includes(frame.id)) {
        setWireSelection({ nodeIds: [frame.id], edgeIds: [] }, "canvas", "node");
      }
      if (inspectOnNodeClick) {
        ctx.eventActions.emit({ type: "node.inspect", source: "canvas", nodeId: frame.id });
      }
      ctx.eventActions.emit({ type: "node.click", source: "canvas", nodeId: frame.id });
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
        commitFrames: model.frames.map((candidate) => ({ ...candidate })),
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, ctx.diagram.nodes, ctx.eventActions, editable, inspectOnNodeClick, interaction.selectOnNodeClick, model.frames, model.framesById, nodeFocusEnabled, setWireSelection]
  );

  const handleNodePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable && panStateRef.current) {
      event.stopPropagation();
      updatePan(event);
      return;
    }
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const nextDrag = positionsForDragClient(drag, { x: event.clientX, y: event.clientY }, viewportRef.current);
    if (nextDrag.moved) drag.moved = true;
    if (!drag.moved) return;
    const next = nextDrag.positions;
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

  const commitNodeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, releaseCapture: boolean): boolean => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return false;
      event.stopPropagation();

      const finalDrag = positionsForDragClient(drag, { x: event.clientX, y: event.clientY }, viewportRef.current);
      if (finalDrag.moved) {
        drag.moved = true;
        dragPositionsRef.current = finalDrag.positions;
      }

      dragStateRef.current = null;
      if (releaseCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const positions = dragPositionsRef.current;
      if (!drag.moved || !positions) {
        clearDragPreview();
        return false;
      }

      suppressNodeClickRef.current = true;
      const nextActions = wireActionsFromCanvasDragCommit(drag.commitFrames, positions);
      try {
        dispatchMany(nextActions);
      } finally {
        clearDragPreview();
      }
      return true;
    },
    [clearDragPreview, dispatchMany]
  );

  const handleNodePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editable && panStateRef.current) {
        event.stopPropagation();
        if (endPan(event)) suppressNodeClickRef.current = true;
        return;
      }
      commitNodeDrag(event, true);
    },
    [commitNodeDrag, editable, endPan]
  );

  const handleNodePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editable && panStateRef.current?.pointerId === event.pointerId) {
        panStateRef.current = null;
        return;
      }
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      clearDragPreview();
    },
    [clearDragPreview, editable]
  );

  const handleNodeLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editable && panStateRef.current?.pointerId === event.pointerId) {
        panStateRef.current = null;
        return;
      }
      commitNodeDrag(event, false);
    },
    [commitNodeDrag, editable]
  );

  const handleConnectionPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, frame: WireCanvasFrame, side: Side) => {
      if (!editable || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const from = handlePoint(frame, side);
      const next: ConnectionState = {
        pointerId: event.pointerId,
        sourceId: frame.id,
        sourceSide: side,
        from,
        to: from,
        candidate: null
      };
      connectionStateRef.current = next;
      setConnection(next);
      setConnectionFeedback(null);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [editable]
  );

  const handleConnectionPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = connectionStateRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const candidate = findConnectionCandidate(
      event.clientX,
      event.clientY,
      current.sourceId,
      current.from,
      model.framesById,
      model.direction
    );
    const to = candidate
      ? candidate.point
      : clientPointToWorld(event.clientX, event.clientY, containerRef.current, viewportRef.current);
    const next: ConnectionState = { ...current, to, candidate };
    connectionStateRef.current = next;
    setConnection(next);
  }, [model.direction, model.framesById]);

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

      const target = current.candidate
        ?? targetHandleFromPoint(event.clientX, event.clientY)
        ?? findConnectionCandidate(
          event.clientX,
          event.clientY,
          current.sourceId,
          current.from,
          model.framesById,
          model.direction
        );
      if (!target || target.nodeId === current.sourceId) return;
      const sourceNode = model.nodeById.get(current.sourceId);
      const targetNode = model.nodeById.get(target.nodeId);
      if (!sourceNode || !targetNode) return;
      if (isValidConnection) {
        const validationResult = isValidConnection({
          sourceNode,
          targetNode,
          sourceSide: current.sourceSide,
          targetSide: target.side,
          diagram: ctx.diagram
        });
        if (validationResult !== true) {
          announceConnectionFeedback(typeof validationResult === "string" ? validationResult : "Connection not allowed.");
          return;
        }
      }
      actions.dispatch({
        type: "edge.connect",
        edge: {
          from: current.sourceId,
          to: target.nodeId,
          fromHandle: current.sourceSide,
          toHandle: target.side
        }
      });
      setConnectionFeedback(null);
      announce(`Connected ${sourceNode.title} to ${targetNode.title}.`);
    },
    [actions, announce, announceConnectionFeedback, ctx.diagram, isValidConnection, model.direction, model.framesById, model.nodeById]
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
      setWireSelection({ nodeIds: [node.id], edgeIds: [] }, "canvas", "node");
    },
    [ctx.eventActions, inspectOnNodeClick, interaction.selectOnNodeClick, setWireSelection]
  );

  const handleEdgeClick = useCallback(
    (event: ReactMouseEvent, edgeId: string) => {
      event.stopPropagation();
      if (edgeFocusEnabled) {
        setActiveItem({ type: "edge", id: edgeId });
        focusElementForCanvasItem(containerRef.current, { type: "edge", id: edgeId });
      }
      ctx.eventActions.emit({ type: "edge.click", source: "canvas", edgeId, intent: inspectOnEdgeClick ? "inspect" : "select" });
      if (!interaction.selectOnEdgeClick) return;
      setWireSelection({ nodeIds: [], edgeIds: [edgeId] }, "canvas", "edge");
    },
    [ctx.eventActions, edgeFocusEnabled, inspectOnEdgeClick, interaction.selectOnEdgeClick, setWireSelection]
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
      backgroundColor: "transparent",
      touchAction: "none",
      userSelect: dragPositions || connection ? "none" : undefined,
      cursor: panStateRef.current ? "grabbing" : canPan ? "grab" : "default",
      ...gridBackground(showBackground && !unstyled),
      ...style,
      visibility: fitReady ? style?.visibility : "hidden"
    }),
    [canPan, connection, ctx.viewport, dragPositions, fitReady, showBackground, style, unstyled]
  );

  return (
    <div
      ref={containerRef}
      data-wire-canvas
      data-wire-large-diagram={largeDiagram ? "true" : undefined}
      data-wire-render-mode={largeDiagram ? "large" : "normal"}
      role="region"
      aria-label={nonEmptyString(ariaLabelConfig?.canvas, "Wire diagram canvas")}
      aria-describedby={statusId}
      aria-busy={slowRender ? true : undefined}
      tabIndex={keyboardEnabled ? 0 : undefined}
      className={cx("wire-canvas", !unstyled && "wire-canvas--styled", largeDiagram && "wire-canvas--large", themeClass(colorMode), classNames?.root, className)}
      data-wire-theme={colorMode}
      style={rootStyle}
      onKeyDown={handleCanvasKeyDown}
      onFocus={(event) => {
        if (event.target === event.currentTarget && !activeItem && focusItems[0]) {
          setActiveItem(focusItems[0]);
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        if (!search && !connectionPicker) setActiveItem(null);
      }}
      onPointerDown={handlePanePointerDown}
      onPointerMove={handlePanePointerMove}
      onPointerUp={handlePanePointerUp}
      onPointerCancel={handlePanePointerCancel}
      onClick={handlePaneClick}
    >
      {keyboardEnabled ? (
        <button
          type="button"
          data-wire-interactive
          className={cx("wire-canvas__skip-control", !unstyled && "wire-canvas__skip-control--styled")}
          aria-label="Skip to inspector and controls"
          onClick={(event) => {
            const selectedFocusItems = selectedFocusItemsForSelection(ctx.selection, model, nodeFocusEnabled, edgeFocusEnabled);
            const item = activeItem ?? selectedFocusItems[0] ?? focusItems[0] ?? null;
            dispatchWireInspectorFocusRequest(containerRef.current ?? event.currentTarget, { item });
            announce("Skipped to inspector and controls.");
          }}
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 10,
            ...(!unstyled ? {
              border: "1px solid var(--wire-border)",
              borderRadius: 6,
              background: "var(--wire-bg-surface)",
              color: "var(--wire-fg-secondary)",
              boxShadow: "var(--wire-card-shadow)",
              font: "inherit",
              fontSize: 12,
              fontWeight: 650,
              padding: "6px 8px"
            } : null)
          }}
        >
          Skip to inspector and controls
        </button>
      ) : null}
      {showBackground ? (
        <div
          aria-hidden
          data-wire-background
          className={cx("wire-canvas__background", classNames?.background)}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none"
          }}
        />
      ) : null}
      <div
        className={cx("wire-canvas__viewport", classNames?.viewport)}
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
                focused={activeItem?.type === "edge" && activeItem.id === edge.edge.id}
                focusable={edgeFocusEnabled}
                statusId={statusId}
                ariaLabel={ariaLabelForEdge(edge.edge, ariaLabelConfig)}
                className={classNames?.edge}
                unstyled={unstyled}
                renderEdge={renderEdge}
                onFocus={() => setActiveItem({ type: "edge", id: edge.edge.id })}
                onClick={handleEdgeClick}
              />
            ))}
            {connection ? <DraftConnection connection={connection} /> : null}
          </g>
        </svg>

        {model.frames.map((frame) => {
          const selected = selectedNodeIds.has(frame.id);
          const isConnectionSource = connection?.sourceId === frame.id;
          const isConnectionCandidate = connection?.candidate?.nodeId === frame.id;
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
          const rendererContext = {
            ...renderContext,
            unstyled,
            classNames: {
              root: frame.node.kind === "group" ? classNames?.group : classNames?.node
            }
          };

          return (
            <div
              key={frame.id}
              data-wire-interactive
              data-wire-node
              data-wire-node-id={frame.id}
              data-wire-state-focused={activeItem?.type === "node" && activeItem.id === frame.id ? "true" : undefined}
              role={nodeFocusEnabled ? "button" : undefined}
              aria-label={ariaLabelForNode(frame.node, ariaLabelConfig)}
              aria-describedby={keyboardEnabled ? statusId : undefined}
              tabIndex={nodeFocusEnabled ? (activeItem?.type === "node" && activeItem.id === frame.id ? 0 : -1) : undefined}
              className={cx("wire-node", !unstyled && "wire-node--styled", frame.node.kind === "group" ? classNames?.group : classNames?.node)}
              onFocus={() => {
                setActiveItem({ type: "node", id: frame.id });
                if (autoPanOnNodeFocus) ensureFrameVisible(frame, viewportRef.current, canvasSize, setWireViewport);
              }}
              onPointerDown={(event) => handleNodePointerDown(event, frame)}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
              onPointerCancel={handleNodePointerCancel}
              onLostPointerCapture={handleNodeLostPointerCapture}
              onClick={(event) => handleNodeClick(event, frame.node)}
              style={{
                position: "absolute",
                left: frame.x,
                top: frame.y,
                width: frame.width,
                ...(frame.node.kind === "group" ? { height: frame.height } : null),
                zIndex: frame.node.kind === "group" ? 1 : frame.node.parent ? 3 : 2,
                cursor: editable || canPan ? "grab" : "pointer"
              }}
            >
              <div
                style={{
                  width: frame.width,
                  ...(frame.node.kind === "group" ? { height: frame.height } : null)
                }}
              >
                {renderer(rendererContext)}
              </div>
              {isConnectionCandidate ? (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: 12,
                    border: "2px solid #2563eb",
                    boxShadow: "0 0 0 4px rgba(37,99,235,0.12)",
                    pointerEvents: "none"
                  }}
                />
              ) : null}
              <WireHandles
                frame={frame}
                direction={model.direction}
                editable={editable}
                unstyled={unstyled}
                className={classNames?.handle}
                slots={handleSlotsByFrame.get(frame.id)}
                connecting={Boolean(connection)}
                connectionSourceSide={isConnectionSource ? connection?.sourceSide ?? null : null}
                candidateSide={isConnectionCandidate ? connection?.candidate?.side ?? null : null}
                onSourcePointerDown={handleConnectionPointerDown}
                onSourcePointerMove={handleConnectionPointerMove}
                onSourcePointerUp={handleConnectionPointerUp}
              />
            </div>
          );
        })}
      </div>

      {search ? (
        <WireCanvasSearch
          inputRef={searchInputRef}
          inputId={searchInputId}
          listId={searchListId}
          label={nonEmptyString(ariaLabelConfig?.search, "Search diagram items")}
          className={classNames?.search}
          unstyled={unstyled}
          query={search.query}
          results={searchResults}
          activeResult={activeSearchResult}
          onQueryChange={(query) => setSearch((current) => current ? { ...current, query, activeIndex: 0 } : current)}
          onKeyDown={handleSearchKeyDown}
          onBlur={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            closeSearch(false);
          }}
          onResultPointerDown={(result) => {
            setSearch(null);
            focusCanvasItem(result);
            announce(`${result.label} focused.`);
          }}
        />
      ) : null}

      {connectionPicker ? (
        <WireCanvasConnectionPicker
          inputRef={connectionPickerInputRef}
          inputId={connectionPickerInputId}
          listId={connectionPickerListId}
          feedbackId={connectionFeedbackId}
          label={nonEmptyString(ariaLabelConfig?.connectionTarget, "Choose connection target")}
          className={classNames?.connectionPicker}
          unstyled={unstyled}
          query={connectionPicker.query}
          sourceSides={connectionSourceSides(model, connectionPicker)}
          sourceSide={connectionPicker.sourceSide}
          targetSides={connectionTargetSides(model, activeConnectionTarget)}
          targetSide={connectionPicker.targetSide}
          results={connectionTargets}
          activeResult={activeConnectionTarget}
          message={connectionPicker.message}
          messageKey={connectionPicker.messageKey}
          onQueryChange={(query) => setConnectionPicker((current) => current ? { ...current, query, activeIndex: 0, message: null } : current)}
          onSourceSideChange={(sourceSide) => setConnectionPicker((current) => current ? { ...current, sourceSide, activeIndex: 0, message: null } : current)}
          onTargetSideChange={(targetSide) => setConnectionPicker((current) => current ? { ...current, targetSide, activeIndex: 0, message: null } : current)}
          onActiveIndexChange={(activeIndex) => setConnectionPicker((current) => current ? { ...current, activeIndex, message: null } : current)}
          onKeyDown={handleConnectionPickerKeyDown}
          onBlur={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            closeConnectionPicker(false);
          }}
        />
      ) : null}

      {connectionFeedback ? (
        <div
          key={connectionFeedback.key}
          id={connectionFeedbackId}
          className="wire-canvas__connection-feedback"
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            left: "50%",
            top: 14,
            transform: "translateX(-50%)",
            maxWidth: "min(420px, calc(100% - 32px))",
            borderRadius: 8,
            border: "1px solid var(--wire-status-invalid, #b91c1c)",
            background: "var(--wire-status-invalid-bg, #fef2f2)",
            color: "var(--wire-status-invalid, #b91c1c)",
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 650,
            boxShadow: "var(--wire-card-shadow)"
          }}
        >
          {connectionFeedback.message}
        </div>
      ) : null}

      <div
        key={status?.key ?? 0}
        id={statusId}
        className={cx("wire-canvas__status", classNames?.status)}
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap"
        }}
      >
        {status?.message ?? ""}
      </div>

      {showMiniMap ? (
        <WireMiniMap
          model={model}
          viewport={ctx.viewport}
          selection={ctx.selection}
          canvasSize={canvasSize}
          largeDiagram={largeDiagram}
          ariaLabel={nonEmptyString(ariaLabelConfig?.minimap, "Canvas minimap")}
          className={classNames?.minimap}
          unstyled={unstyled}
        />
      ) : null}
      {showControls ? (
        <WireControls
          className={classNames?.controls}
          unstyled={unstyled}
          labels={{
            zoomIn: nonEmptyString(ariaLabelConfig?.controls?.zoomIn, "Zoom in"),
            zoomOut: nonEmptyString(ariaLabelConfig?.controls?.zoomOut, "Zoom out"),
            fitView: nonEmptyString(ariaLabelConfig?.controls?.fitView, "Fit view"),
            fitSelection: nonEmptyString(ariaLabelConfig?.controls?.fitSelection, "Fit selection")
          }}
          onFit={fitToView}
          onFitSelection={hasSelection ? fitSelectionToView : undefined}
          onZoomIn={() => setWireViewport(zoomViewport(ctx.viewport, zoomStep, minZoom, maxZoom), { source: "canvas", cause: "zoom" })}
          onZoomOut={() => setWireViewport(zoomViewport(ctx.viewport, 1 / zoomStep, minZoom, maxZoom), { source: "canvas", cause: "zoom" })}
        />
      ) : null}
    </div>
  );
}

function WireEdge({
  geometry,
  selected,
  focused,
  focusable,
  statusId,
  ariaLabel,
  className,
  unstyled,
  renderEdge,
  onFocus,
  onClick
}: {
  geometry: WireCanvasEdgeGeometry;
  selected: boolean;
  focused: boolean;
  focusable: boolean;
  statusId: string;
  ariaLabel: string;
  className?: string;
  unstyled: boolean;
  renderEdge?: WireEdgeRenderer;
  onFocus: () => void;
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
    <g
      className={cx("wire-edge", !unstyled && "wire-edge--styled", className)}
      data-wire-interactive
      data-wire-edge
      data-wire-edge-id={geometry.edge.id}
      data-wire-state-focused={focused ? "true" : undefined}
      role={focusable ? "button" : undefined}
      aria-label={ariaLabel}
      aria-describedby={focusable ? statusId : undefined}
      tabIndex={focusable ? (focused ? 0 : -1) : undefined}
      onFocus={onFocus}
    >
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
  unstyled,
  className,
  slots,
  connecting,
  connectionSourceSide,
  candidateSide,
  onSourcePointerDown,
  onSourcePointerMove,
  onSourcePointerUp
}: {
  frame: WireCanvasFrame;
  direction: LayoutDirection;
  editable: boolean;
  unstyled: boolean;
  className?: string;
  slots: Map<Side, { source: number; target: number }> | undefined;
  connecting: boolean;
  connectionSourceSide: Side | null;
  candidateSide: Side | null;
  onSourcePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, frame: WireCanvasFrame, side: Side) => void;
  onSourcePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSourcePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}): ReactElement {
  const sourceSides = sourceSidesForNode(frame.node, direction);
  const targetSides = targetSidesForNode(frame.node, direction);
  const sides = uniqueSides([...targetSides, ...sourceSides]);

  return (
    <>
      {sides.flatMap((side) => {
        const isSource = sourceSides.includes(side);
        const isTarget = targetSides.includes(side);
        const slotCount = 1;
        const isActiveSource = connectionSourceSide === side;
        const isActiveCandidate = candidateSide === side;
        const highlight = isActiveSource || isActiveCandidate;
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
            className={cx("wire-handle", !unstyled && "wire-handle--styled", className)}
            disabled={!editable || !isSource}
            onPointerDown={isSource ? (event) => onSourcePointerDown(event, frame, side) : undefined}
            onPointerMove={isSource ? onSourcePointerMove : undefined}
            onPointerUp={isSource ? onSourcePointerUp : undefined}
            style={{
              position: "absolute",
              ...handleSlotStyle(side, slotIndex, slotCount, frame.width, frame.height, highlight),
              width: highlight ? HANDLE_SIZE + 4 : HANDLE_SIZE,
              height: highlight ? HANDLE_SIZE + 4 : HANDLE_SIZE,
              padding: 0,
              opacity: editable ? 1 : 0.68,
              cursor: editable && isSource ? "crosshair" : "default",
              pointerEvents: editable || isTarget ? "auto" : "none",
              zIndex: highlight ? 4 : connecting ? 2 : 1,
              ...(!unstyled ? {
                borderRadius: 999,
                border: highlight ? "2px solid #2563eb" : "1.5px solid #94a3b8",
                background: highlight
                  ? "#ffffff"
                  : isSource && isTarget
                    ? "#2563eb"
                    : "#ffffff",
                boxShadow: highlight ? "0 0 0 3px rgba(37,99,235,0.18)" : "none",
                transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease"
              } : null)
            }}
          />
        ));
      })}
    </>
  );
}

function WireControls({
  className,
  unstyled,
  labels,
  onFit,
  onFitSelection,
  onZoomIn,
  onZoomOut
}: {
  className?: string;
  unstyled: boolean;
  labels: { zoomIn: string; zoomOut: string; fitView: string; fitSelection: string };
  onFit: () => void;
  onFitSelection?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}): ReactElement {
  return (
    <div
      data-wire-interactive
      className={cx("wire-controls", !unstyled && "wire-controls--styled", className)}
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        display: "inline-flex",
        alignItems: "center",
        ...(!unstyled ? {
          overflow: "hidden",
          borderRadius: 10,
          border: "1px solid var(--wire-canvas-control-border, rgba(15,23,42,0.08))",
          background: "var(--wire-canvas-control-bg, rgba(255,255,255,0.88))",
          backdropFilter: "blur(14px) saturate(1.2)",
          WebkitBackdropFilter: "blur(14px) saturate(1.2)",
          boxShadow:
            "var(--wire-canvas-control-shadow, 0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -8px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04))"
        } : null)
      }}
    >
      <ControlButton label={labels.zoomIn} unstyled={unstyled} onClick={onZoomIn}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </ControlButton>
      <ControlButton label={labels.zoomOut} unstyled={unstyled} onClick={onZoomOut} divider>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
      </ControlButton>
      <ControlButton label={labels.fitView} unstyled={unstyled} onClick={onFit} divider wide>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        <span style={unstyled ? undefined : { marginLeft: 5, fontSize: 11.5, fontWeight: 600, color: "var(--wire-fg-secondary)" }}>Fit</span>
      </ControlButton>
      {onFitSelection ? (
        <ControlButton label={labels.fitSelection} unstyled={unstyled} onClick={onFitSelection} divider wide>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>
          <span style={unstyled ? undefined : { marginLeft: 5, fontSize: 11.5, fontWeight: 600, color: "var(--wire-fg-secondary)" }}>Selection</span>
        </ControlButton>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  unstyled,
  onClick,
  divider = false,
  wide = false,
  children
}: {
  label: string;
  unstyled: boolean;
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
        cursor: "pointer",
        ...(!unstyled ? {
          border: 0,
          borderLeft: divider ? "1px solid var(--wire-canvas-control-divider, rgba(15,23,42,0.08))" : "0",
          background: "transparent",
          color: "var(--wire-fg-secondary)"
        } : null)
      }}
    >
      {children}
    </button>
  );
}

function WireCanvasSearch({
  inputRef,
  inputId,
  listId,
  label,
  className,
  unstyled,
  query,
  results,
  activeResult,
  onQueryChange,
  onKeyDown,
  onBlur,
  onResultPointerDown
}: {
  inputRef: RefObject<HTMLInputElement>;
  inputId: string;
  listId: string;
  label: string;
  className?: string;
  unstyled: boolean;
  query: string;
  results: WireCanvasSearchResult[];
  activeResult: WireCanvasSearchResult | null;
  onQueryChange: (query: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBlur: (event: ReactFocusEvent<HTMLDivElement>) => void;
  onResultPointerDown: (result: WireCanvasSearchResult) => void;
}): ReactElement {
  return (
    <div
      data-wire-interactive
      className={cx("wire-canvas-search", !unstyled && "wire-canvas-search--styled", className)}
      onBlur={onBlur}
      style={{
        position: "absolute",
        left: 16,
        top: 16,
        width: "min(360px, calc(100% - 32px))",
        zIndex: 8,
        ...(!unstyled ? {
          borderRadius: 8,
          border: "1px solid var(--wire-border)",
          background: "var(--wire-bg-surface)",
          color: "var(--wire-fg-primary)",
          boxShadow: "var(--wire-card-shadow)",
          padding: 10
        } : null)
      }}
    >
      <label htmlFor={inputId} style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--wire-fg-secondary)", marginBottom: 6 }}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={activeResult ? `${listId}-${activeResult.type}-${activeResult.id}` : undefined}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          minHeight: 32,
          boxSizing: "border-box",
          border: "1px solid var(--wire-border)",
          borderRadius: 6,
          background: "var(--wire-bg-surface)",
          color: "var(--wire-fg-primary)",
          font: "inherit",
          fontSize: 12.5,
          padding: "4px 8px"
        }}
      />
      <div id={listId} role="listbox" aria-label={`${label} results`} style={{ display: "grid", gap: 2, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
        {results.length > 0 ? results.map((result) => {
          const active = activeResult?.type === result.type && activeResult.id === result.id;
          return (
            <div
              key={`${result.type}-${result.id}`}
              id={`${listId}-${result.type}-${result.id}`}
              role="option"
              aria-selected={active}
              onPointerDown={(event) => {
                event.preventDefault();
                onResultPointerDown(result);
              }}
              style={{
                borderRadius: 6,
                background: active ? "var(--wire-bg-sunken)" : "transparent",
                color: "var(--wire-fg-primary)",
                cursor: "pointer",
                fontSize: 12,
                padding: "6px 8px"
              }}
            >
              {result.label}
            </div>
          );
        }) : (
          <div role="option" aria-selected="false" style={{ color: "var(--wire-fg-tertiary)", fontSize: 12, padding: "6px 8px" }}>
            No results
          </div>
        )}
      </div>
      <div role="status" aria-live="polite" style={{ marginTop: 6, color: "var(--wire-fg-tertiary)", fontSize: 11.5 }}>
        {results.length === 0 ? "No results" : `${results.length} result${results.length === 1 ? "" : "s"}${activeResult ? `, ${activeResult.label}` : ""}`}
      </div>
    </div>
  );
}

function WireCanvasConnectionPicker({
  inputRef,
  inputId,
  listId,
  feedbackId,
  label,
  className,
  unstyled,
  query,
  sourceSides,
  sourceSide,
  targetSides,
  targetSide,
  results,
  activeResult,
  message,
  messageKey,
  onQueryChange,
  onSourceSideChange,
  onTargetSideChange,
  onActiveIndexChange,
  onKeyDown,
  onBlur
}: {
  inputRef: RefObject<HTMLInputElement>;
  inputId: string;
  listId: string;
  feedbackId: string;
  label: string;
  className?: string;
  unstyled: boolean;
  query: string;
  sourceSides: Side[];
  sourceSide: Side;
  targetSides: Side[];
  targetSide: Side;
  results: WireCanvasConnectionTarget[];
  activeResult: WireCanvasConnectionTarget | null;
  message: string | null;
  messageKey: number;
  onQueryChange: (query: string) => void;
  onSourceSideChange: (side: Side) => void;
  onTargetSideChange: (side: Side) => void;
  onActiveIndexChange: (index: number) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBlur: (event: ReactFocusEvent<HTMLDivElement>) => void;
}): ReactElement {
  return (
    <div
      data-wire-interactive
      className={cx("wire-canvas-connection-picker", !unstyled && "wire-canvas-connection-picker--styled", className)}
      onBlur={onBlur}
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: "min(390px, calc(100% - 32px))",
        zIndex: 9,
        ...(!unstyled ? {
          borderRadius: 8,
          border: `1px solid ${message ? "var(--wire-status-invalid, #b91c1c)" : "var(--wire-border)"}`,
          background: "var(--wire-bg-surface)",
          color: "var(--wire-fg-primary)",
          boxShadow: "var(--wire-card-shadow)",
          padding: 10
        } : null)
      }}
    >
      <label htmlFor={inputId} style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--wire-fg-secondary)", marginBottom: 6 }}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? feedbackId : undefined}
        aria-activedescendant={activeResult ? `${listId}-${activeResult.nodeId}` : undefined}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          minHeight: 32,
          boxSizing: "border-box",
          border: "1px solid var(--wire-border)",
          borderRadius: 6,
          background: "var(--wire-bg-surface)",
          color: "var(--wire-fg-primary)",
          font: "inherit",
          fontSize: 12.5,
          padding: "4px 8px"
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label style={{ display: "grid", gap: 3, color: "var(--wire-fg-secondary)", fontSize: 11.5, fontWeight: 650 }}>
          Source side
          <select value={sourceSide} onChange={(event) => onSourceSideChange(event.currentTarget.value as Side)} style={sideSelectStyle()}>
            {sourceSides.map((side) => <option key={side} value={side}>{side}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 3, color: "var(--wire-fg-secondary)", fontSize: 11.5, fontWeight: 650 }}>
          Target side
          <select value={targetSide} onChange={(event) => onTargetSideChange(event.currentTarget.value as Side)} style={sideSelectStyle()}>
            {targetSides.map((side) => <option key={side} value={side}>{side}</option>)}
          </select>
        </label>
      </div>
      <div id={listId} role="listbox" aria-label={`${label} results`} style={{ display: "grid", gap: 2, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
        {results.length > 0 ? results.map((result, index) => {
          const active = activeResult?.nodeId === result.nodeId;
          return (
            <div
              key={result.nodeId}
              id={`${listId}-${result.nodeId}`}
              role="option"
              aria-selected={active}
              onPointerDown={(event) => {
                event.preventDefault();
                onActiveIndexChange(index);
                inputRef.current?.focus();
              }}
              style={{
                borderRadius: 6,
                background: active ? "var(--wire-bg-sunken)" : "transparent",
                color: "var(--wire-fg-primary)",
                cursor: "pointer",
                fontSize: 12,
                padding: "6px 8px"
              }}
            >
              {result.label}
            </div>
          );
        }) : (
          <div role="option" aria-selected="false" style={{ color: "var(--wire-fg-tertiary)", fontSize: 12, padding: "6px 8px" }}>
            No valid targets
          </div>
        )}
      </div>
      <div
        key={messageKey}
        id={feedbackId}
        role="status"
        aria-live="polite"
        style={{
          marginTop: 6,
          color: message ? "var(--wire-status-invalid, #b91c1c)" : "var(--wire-fg-tertiary)",
          fontSize: 11.5,
          fontWeight: message ? 650 : 500
        }}
      >
        {message ?? (results.length === 0 ? "No valid targets" : `${results.length} target${results.length === 1 ? "" : "s"}${activeResult ? `, ${activeResult.label}` : ""}`)}
      </div>
    </div>
  );
}

function WireMiniMap({
  model,
  viewport,
  selection,
  canvasSize,
  largeDiagram,
  ariaLabel,
  className,
  unstyled
}: {
  model: ReturnType<typeof buildWireCanvasModel>;
  viewport: WireViewport;
  selection: WireSelection;
  canvasSize?: CanvasSize;
  largeDiagram: boolean;
  ariaLabel: string;
  className?: string;
  unstyled: boolean;
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
  const viewportRect = miniMapViewportRect({
    bounds: model.bounds,
    viewport,
    canvasSize,
    pad,
    scale
  });
  const contentRect: MiniMapRect = { x: pad, y: pad, width: width - pad * 2, height: height - pad * 2 };
  const selectionBounds = largeDiagram ? boundsForSelection(selection, model)?.bounds : null;
  const selectionRect = selectionBounds
    ? clipMiniMapRect({
      x: toX(selectionBounds.minX),
      y: toY(selectionBounds.minY),
      width: Math.max(2, selectionBounds.width * scale),
      height: Math.max(2, selectionBounds.height * scale)
    }, contentRect)
    : null;

  return (
    <svg
      data-wire-interactive
      data-wire-minimap-mode={largeDiagram ? "large" : "full"}
      className={cx("wire-minimap", !unstyled && "wire-minimap--styled", className)}
      aria-label={ariaLabel}
      width={width}
      height={height}
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        ...(!unstyled ? {
          borderRadius: 10,
          border: "1px solid var(--wire-canvas-control-border, rgba(15,23,42,0.08))",
          background: "var(--wire-canvas-control-bg, rgba(255,255,255,0.88))",
          backdropFilter: "blur(14px) saturate(1.2)",
          WebkitBackdropFilter: "blur(14px) saturate(1.2)",
          boxShadow:
            "var(--wire-canvas-control-shadow, 0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -8px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04))"
        } : null)
      }}
    >
      {largeDiagram ? (
        <rect
          data-wire-minimap-bounds
          x={contentRect.x}
          y={contentRect.y}
          width={contentRect.width}
          height={contentRect.height}
          rx={2}
          fill="var(--wire-bg-sunken, #f1f5f9)"
          stroke="var(--wire-canvas-minimap-edge, #94a3b8)"
          strokeWidth={0.8}
          opacity={0.85}
        />
      ) : (
        <>
          {model.edges.map((edge) => (
            <path
              key={edge.edge.id}
              d={edge.path}
              transform={`translate(${pad - model.bounds.minX * scale} ${pad - model.bounds.minY * scale}) scale(${scale})`}
              fill="none"
              stroke="var(--wire-canvas-minimap-edge, #94a3b8)"
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
              rx={1}
              fill={frame.node.kind === "group" ? "var(--wire-canvas-minimap-group, #f1f5f9)" : "var(--wire-canvas-minimap-node, #cbd5e1)"}
              stroke="none"
              opacity={frame.node.kind === "group" ? 0.75 : 1}
            />
          ))}
        </>
      )}
      {selectionRect ? (
        <rect
          data-wire-minimap-selection
          x={selectionRect.x}
          y={selectionRect.y}
          width={selectionRect.width}
          height={selectionRect.height}
          rx={3}
          fill="rgba(37, 99, 235, 0.14)"
          stroke="var(--wire-canvas-minimap-viewport, #2563eb)"
          strokeWidth={1.1}
        />
      ) : null}
      {viewportRect ? (
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          rx={3}
          fill="none"
          stroke="var(--wire-canvas-minimap-viewport, #2563eb)"
          strokeWidth={1.2}
        />
      ) : null}
    </svg>
  );
}

export function miniMapViewportRect({
  bounds,
  viewport,
  canvasSize,
  pad,
  scale
}: {
  bounds: WireCanvasBounds;
  viewport: WireViewport;
  canvasSize?: CanvasSize;
  pad: number;
  scale: number;
}): MiniMapRect | null {
  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0 || viewport.zoom <= 0) return null;
  const contentRect = {
    x: pad,
    y: pad,
    width: Math.max(1, bounds.width * scale),
    height: Math.max(1, bounds.height * scale)
  };
  const visibleWorld = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: canvasSize.width / viewport.zoom,
    height: canvasSize.height / viewport.zoom
  };
  const rawRect = {
    x: pad + (visibleWorld.x - bounds.minX) * scale,
    y: pad + (visibleWorld.y - bounds.minY) * scale,
    width: visibleWorld.width * scale,
    height: visibleWorld.height * scale
  };
  return clipMiniMapRect(rawRect, contentRect);
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
  const snapped = connection.candidate !== null;
  const d = `M ${connection.from.x} ${connection.from.y} L ${connection.to.x} ${connection.to.y}`;
  return (
    <path
      d={d}
      fill="none"
      stroke="#2563eb"
      strokeWidth={snapped ? 2.25 : 1.75}
      strokeDasharray={snapped ? undefined : "5 5"}
      strokeLinecap="round"
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

export function canvasInteractionModeForWireMode(mode: WireMode): "view" | "edit" {
  return mode === "view" ? "view" : "edit";
}

export function wireActionsFromCanvasDragCommit(
  frames: readonly WireCanvasFrame[],
  movedPositions: ReadonlyMap<string, Point>
): WireAction[] {
  const actions: WireAction[] = [];
  for (const frame of frames) {
    const position = movedPositions.get(frame.id) ?? { x: frame.x, y: frame.y };
    if (samePoint(frame.node.position, position)) continue;
    actions.push({ type: "node.move", id: frame.id, position });
  }
  return actions;
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

function positionsForDragClient(
  drag: DragState,
  client: Point,
  viewport: WireViewport
): { positions: Map<string, Point>; moved: boolean } {
  const dx = (client.x - drag.startClient.x) / viewport.zoom;
  const dy = (client.y - drag.startClient.y) / viewport.zoom;
  const positions = new Map<string, Point>();
  for (const [id, start] of drag.startPositions) {
    positions.set(id, { x: start.x + dx, y: start.y + dy });
  }
  return {
    positions,
    moved: Math.abs(dx) + Math.abs(dy) > 2
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
  _slotIndex: number,
  _slotCount: number,
  frameWidth: number,
  frameHeight: number,
  highlight: boolean
): CSSProperties {
  const size = highlight ? HANDLE_SIZE + 4 : HANDLE_SIZE;
  if (side === "left") {
    return { left: -size / 2, top: frameHeight / 2 - size / 2 };
  }
  if (side === "right") {
    return { right: -size / 2, top: frameHeight / 2 - size / 2 };
  }
  if (side === "top") {
    return { top: -size / 2, left: frameWidth / 2 - size / 2 };
  }
  return { bottom: -size / 2, left: frameWidth / 2 - size / 2 };
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

function sameCanvasSize(current: CanvasSize | undefined, next: CanvasSize): boolean {
  return Boolean(current && current.width === next.width && current.height === next.height);
}

function samePoint(current: Point | undefined, next: Point): boolean {
  return Boolean(current && current.x === next.x && current.y === next.y);
}

function clipMiniMapRect(rect: MiniMapRect, bounds: MiniMapRect): MiniMapRect | null {
  const x1 = Math.max(rect.x, bounds.x);
  const y1 = Math.max(rect.y, bounds.y);
  const x2 = Math.min(rect.x + rect.width, bounds.x + bounds.width);
  const y2 = Math.min(rect.y + rect.height, bounds.y + bounds.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

function gridBackground(showBackground: boolean): CSSProperties {
  if (!showBackground) return {};
  return {
    backgroundImage: "radial-gradient(circle, #cbd5e1 0.75px, transparent 0.75px)",
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
  };
}

function targetHandleFromPoint(clientX: number, clientY: number): ConnectionCandidate | undefined {
  if (typeof document === "undefined") return undefined;
  const element = document.elementFromPoint(clientX, clientY);
  const target = element instanceof HTMLElement
    ? element.closest<HTMLElement>("[data-wire-target-handle='true']")
    : undefined;
  const nodeId = target?.dataset.wireNodeId;
  const side = target?.dataset.wireSide;
  if (!nodeId || !isSide(side)) return undefined;
  return { nodeId, side, point: { x: 0, y: 0 } };
}

function findConnectionCandidate(
  clientX: number,
  clientY: number,
  sourceId: string,
  fromPoint: Point,
  framesById: Map<string, WireCanvasFrame>,
  direction: LayoutDirection
): ConnectionCandidate | null {
  if (typeof document === "undefined") return null;
  const element = document.elementFromPoint(clientX, clientY);
  if (!(element instanceof Element)) return null;
  const nodeEl = element.closest<HTMLElement>("[data-wire-node]");
  const nodeId = nodeEl?.dataset.wireNodeId;
  if (!nodeId || nodeId === sourceId) return null;
  const frame = framesById.get(nodeId);
  if (!frame) return null;
  const targetSides = targetSidesForNode(frame.node, direction);
  if (targetSides.length === 0) return null;

  let bestSide = targetSides[0]!;
  let bestDistance = Infinity;
  for (const side of targetSides) {
    const point = handlePoint(frame, side);
    const dx = point.x - fromPoint.x;
    const dy = point.y - fromPoint.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSide = side;
    }
  }
  return { nodeId, side: bestSide, point: handlePoint(frame, bestSide) };
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

function canvasFocusItems(model: WireCanvasModel, nodesFocusable: boolean, edgesFocusable: boolean): WireCanvasFocusItem[] {
  return [
    ...(nodesFocusable ? model.frames.filter((frame) => frame.node.kind !== "group").map((frame) => ({ type: "node" as const, id: frame.id })) : []),
    ...(edgesFocusable ? model.edges.map((edge) => ({ type: "edge" as const, id: edge.edge.id })) : [])
  ];
}

function selectedFocusItemsForSelection(
  selection: WireSelection,
  model: WireCanvasModel,
  nodesFocusable: boolean,
  edgesFocusable: boolean
): WireCanvasFocusItem[] {
  return [
    ...(nodesFocusable
      ? selection.nodeIds
        .map((id) => model.framesById.get(id))
        .filter((frame): frame is WireCanvasFrame => Boolean(frame && frame.node.kind !== "group"))
        .map((frame) => ({ type: "node" as const, id: frame.id }))
      : []),
    ...(edgesFocusable
      ? selection.edgeIds
        .filter((id) => model.edgeById.has(id))
        .map((id) => ({ type: "edge" as const, id }))
      : [])
  ];
}

function boundsForSelection(
  selection: WireSelection,
  model: WireCanvasModel
): { bounds: WireCanvasBounds; count: number } | null {
  const frames = new Map<string, WireCanvasFrame>();
  let count = 0;

  for (const id of selection.nodeIds) {
    const frame = model.framesById.get(id);
    if (!frame) continue;
    frames.set(frame.id, frame);
    count += 1;
  }

  for (const id of selection.edgeIds) {
    const edge = model.edges.find((candidate) => candidate.edge.id === id);
    if (!edge) continue;
    count += 1;
    const sourceFrame = model.framesById.get(edge.sourceNode.id);
    const targetFrame = model.framesById.get(edge.targetNode.id);
    if (sourceFrame) frames.set(sourceFrame.id, sourceFrame);
    if (targetFrame) frames.set(targetFrame.id, targetFrame);
  }

  const bounds = boundsForFrames([...frames.values()]);
  return bounds && count > 0 ? { bounds, count } : null;
}

function boundsForFrames(frames: WireCanvasFrame[]): WireCanvasBounds | null {
  if (frames.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const frame of frames) {
    minX = Math.min(minX, frame.x);
    minY = Math.min(minY, frame.y);
    maxX = Math.max(maxX, frame.x + frame.width);
    maxY = Math.max(maxY, frame.y + frame.height);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function canvasSearchResults(
  items: WireCanvasFocusItem[],
  model: WireCanvasModel,
  query: string
): WireCanvasSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  return items
    .map((item) => {
      const label = canvasFocusItemLabel(item, model);
      return {
        ...item,
        label,
        searchText: normalizeSearchText(`${label} ${item.id}`)
      };
    })
    .filter((item) => !normalizedQuery || item.searchText.includes(normalizedQuery));
}

function canvasFocusItemLabel(item: WireCanvasFocusItem, model: WireCanvasModel): string {
  if (item.type === "node") {
    const node = model.nodeById.get(item.id);
    return node ? `${node.title || node.id} ${node.kind} node` : `${item.id} node`;
  }
  const geometry = model.edges.find((edge) => edge.edge.id === item.id);
  if (!geometry) return `${item.id} edge`;
  return geometry.edge.label
    ? `${geometry.edge.label} edge`
    : `Edge from ${geometry.edge.from} to ${geometry.edge.to}`;
}

function canvasConnectionTargets(
  model: WireCanvasModel,
  picker: WireCanvasConnectionPickerState
): WireCanvasConnectionTarget[] {
  const sourceFrame = model.framesById.get(picker.sourceId);
  if (!sourceFrame) return [];
  const sourcePoint = handlePoint(sourceFrame, picker.sourceSide);
  const query = normalizeSearchText(picker.query);
  return model.frames
    .map((frame, diagramIndex): WireCanvasConnectionTarget | null => {
      if (frame.id === picker.sourceId || frame.node.kind === "group") return null;
      const targetSides = targetSidesForNode(frame.node, model.direction);
      if (targetSides.length === 0) return null;
      const side = targetSides.includes(picker.targetSide) ? picker.targetSide : targetSides[0]!;
      const targetPoint = handlePoint(frame, side);
      const label = frame.node.title || frame.id;
      const distance = squaredDistance(sourcePoint, targetPoint);
      return { nodeId: frame.id, label, side, distance, diagramIndex };
    })
    .filter((target): target is WireCanvasConnectionTarget => {
      if (!target) return false;
      return !query || normalizeSearchText(`${target.label} ${target.nodeId}`).includes(query);
    })
    .sort((left, right) => left.distance - right.distance || left.diagramIndex - right.diagramIndex);
}

function connectionSourceSides(model: WireCanvasModel, picker: WireCanvasConnectionPickerState): Side[] {
  const frame = model.framesById.get(picker.sourceId);
  return frame ? sourceSidesForNode(frame.node, model.direction) : [picker.sourceSide];
}

function connectionTargetSides(model: WireCanvasModel, activeTarget: WireCanvasConnectionTarget | null): Side[] {
  const frame = activeTarget ? model.framesById.get(activeTarget.nodeId) : undefined;
  return frame ? targetSidesForNode(frame.node, model.direction) : ["left", "right", "top", "bottom"];
}

function firstTargetSideForConnection(model: WireCanvasModel, sourceId: string): Side | undefined {
  for (const frame of model.frames) {
    if (frame.id === sourceId || frame.node.kind === "group") continue;
    const sides = targetSidesForNode(frame.node, model.direction);
    if (sides[0]) return sides[0];
  }
  return undefined;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function squaredDistance(left: Point, right: Point): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function sameFocusItem(left: WireCanvasFocusItem, right: WireCanvasFocusItem): boolean {
  return left.type === right.type && left.id === right.id;
}

function focusElementForCanvasItem(root: HTMLElement | null, item: WireCanvasFocusItem): void {
  const elements = root?.querySelectorAll<HTMLElement | SVGGElement>(
    item.type === "node" ? "[data-wire-node-id]" : "[data-wire-edge-id]"
  );
  const element = [...(elements ?? [])].find((candidate) =>
    item.type === "node"
      ? candidate.dataset.wireNodeId === item.id
      : candidate.dataset.wireEdgeId === item.id
  );
  element?.focus();
}

function focusItemFromElement(target: EventTarget): WireCanvasFocusItem | null {
  if (!(target instanceof Element)) return null;
  const edge = target.closest<HTMLElement | SVGGElement>("[data-wire-edge-id]");
  if (edge?.dataset.wireEdgeId) return { type: "edge", id: edge.dataset.wireEdgeId };
  const node = target.closest<HTMLElement>("[data-wire-node-id]");
  if (node?.dataset.wireNodeId) return { type: "node", id: node.dataset.wireNodeId };
  return null;
}

function shouldIgnoreCanvasKeyboardEvent(target: EventTarget, root: HTMLElement): boolean {
  if (target === root) return false;
  if (isTextEntryTarget(target)) return true;
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-wire-keyboard='ignore']")) return true;
  const managedItem = target.closest("[data-wire-node-id], [data-wire-edge-id]");
  if (managedItem) return false;
  return Boolean(target.closest("button,a[href],summary,[contenteditable='true'],[role='button'],[role='link'],[role='menuitem'],[role='checkbox'],[role='radio'],[role='switch'],[role='slider'],[role='spinbutton'],[role='combobox'],[role='listbox'],[role='textbox'],[role='searchbox'],[role='tab'],[role='option'],[role='treeitem'],[role='gridcell'],[role='menu'],[role='menubar'],[role='tablist'],[role='grid'],[role='tree'],[role='dialog']"));
}

function keyboardNudgeDelta(event: ReactKeyboardEvent): Point | null {
  const amount = event.altKey ? 1 : event.shiftKey ? 32 : 8;
  if (event.key === "ArrowLeft") return { x: -amount, y: 0 };
  if (event.key === "ArrowRight") return { x: amount, y: 0 };
  if (event.key === "ArrowUp") return { x: 0, y: -amount };
  if (event.key === "ArrowDown") return { x: 0, y: amount };
  return null;
}

function selectionForKeyboardCommand(selection: WireSelection, item: WireCanvasFocusItem | null): WireSelection {
  if (selection.nodeIds.length > 0 || selection.edgeIds.length > 0 || !item) return selection;
  return item.type === "node"
    ? { nodeIds: [item.id], edgeIds: [] }
    : { nodeIds: [], edgeIds: [item.id] };
}

function nextFocusItemForKey(
  event: ReactKeyboardEvent,
  items: WireCanvasFocusItem[],
  current: WireCanvasFocusItem | null
): WireCanvasFocusItem | null {
  if (items.length === 0) return null;
  const currentIndex = Math.max(0, current ? items.findIndex((item) => sameFocusItem(item, current)) : 0);
  if (event.key === "Home") return items[0]!;
  if (event.key === "End") return items[items.length - 1]!;
  if (event.key === "n") return nextItemOfType(items, currentIndex, "node", 1);
  if (event.key === "p") return nextItemOfType(items, currentIndex, "node", -1);
  if (event.key === "e") return nextItemOfType(items, currentIndex, "edge", event.shiftKey ? -1 : 1);
  return null;
}

function nextItemOfType(items: WireCanvasFocusItem[], currentIndex: number, type: WireCanvasFocusItem["type"], direction: 1 | -1): WireCanvasFocusItem | null {
  if (!items.some((item) => item.type === type)) return null;
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (currentIndex + offset * direction + items.length) % items.length;
    const item = items[index]!;
    if (item.type === type) return item;
  }
  return null;
}

function ariaLabelForNode(node: WireNode, config: WireCanvasProps["ariaLabelConfig"]): string {
  const override = config?.node?.(node)?.trim();
  if (override) return override;
  return `${node.title || node.id} ${node.kind} node`;
}

function ariaLabelForEdge(edge: WireEdgeRenderContext["edge"], config: WireCanvasProps["ariaLabelConfig"]): string {
  const override = config?.edge?.(edge)?.trim();
  if (override) return override;
  return edge.label ? `${edge.label} edge` : `Edge from ${edge.from} to ${edge.to}`;
}

function nonEmptyString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function ensureFrameVisible(
  frame: WireCanvasFrame,
  viewport: WireViewport,
  canvasSize: CanvasSize | undefined,
  setViewport: (viewport: WireViewport, event?: Parameters<WireViewportActions["setViewport"]>[1]) => void
): void {
  if (!canvasSize) return;
  const margin = 24;
  const left = frame.x * viewport.zoom + viewport.x;
  const right = (frame.x + frame.width) * viewport.zoom + viewport.x;
  const top = frame.y * viewport.zoom + viewport.y;
  const bottom = (frame.y + frame.height) * viewport.zoom + viewport.y;
  let dx = 0;
  let dy = 0;
  if (left < margin) dx = margin - left;
  else if (right > canvasSize.width - margin) dx = canvasSize.width - margin - right;
  if (top < margin) dy = margin - top;
  else if (bottom > canvasSize.height - margin) dy = canvasSize.height - margin - bottom;
  if (dx !== 0 || dy !== 0) {
    setViewport({ ...viewport, x: viewport.x + dx, y: viewport.y + dy }, { source: "canvas", cause: "keyboard" });
  }
}

function normalizeWheelDelta(event: { deltaY: number; deltaMode: number }): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * 360;
  return event.deltaY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return clamp(index, 0, length - 1);
}

function nextCompositeIndex(index: number, length: number, direction: 1 | -1): number {
  if (length <= 0) return 0;
  return (index + direction + length) % length;
}

function requestAnimationFrameOrTimeout(callback: () => void): void {
  if (typeof requestAnimationFrame === "undefined") {
    setTimeout(callback, 0);
    return;
  }
  requestAnimationFrame(callback);
}

function sideSelectStyle(): CSSProperties {
  return {
    width: "100%",
    minHeight: 30,
    border: "1px solid var(--wire-border)",
    borderRadius: 6,
    background: "var(--wire-bg-surface)",
    color: "var(--wire-fg-primary)",
    font: "inherit",
    fontSize: 12,
    padding: "3px 6px"
  };
}
