import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { ApplyWireActionResult, WireAction, WireDiagram } from "@aigentive/wire-core";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";
import type { WireNodeRenderer } from "../canvas/nodeTypes.js";
import { WireProvider } from "../provider/WireProvider.js";
import type { WireChangeEvent, WireEvent, WireEventSource, WireMode, WireSelection, WireViewport } from "../provider/types.js";
import type { WireOptionCatalog } from "../options.js";
import { cx, themeClass, type WireColorMode } from "./classes.js";
import { WireGroupFrame, WireNodeCardView } from "./WireNodeCardView.js";
import { WireInspector, type WireInspectorProps } from "./WireInspector.js";
import { WireNodeList } from "./WireNodeList.js";
import {
  WIRE_INSPECTOR_FOCUS_REQUEST_EVENT,
  type WireInspectorFocusRequestDetail,
  type WireWorkspaceFocusItem
} from "./workspaceFocusEvents.js";

export interface WireWorkspaceProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
  onEvent?: (event: WireEvent) => void;
  validateOnChange?: boolean;
  history?: boolean;
  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: Extract<WireEvent, { type: "selection.change" }>) => void;
  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
    intent?: "fit-view" | "fit-selection";
  }) => void;
  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: {
    source: WireEventSource;
    mode: WireMode;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }) => void;
  dirty?: boolean;
  defaultDirty?: boolean;
  onDirtyChange?: (dirty: boolean, event: {
    source: WireEventSource;
    dirty: boolean;
    previousDirty?: boolean;
    cause?: "edit" | "undo" | "redo" | "reset" | "api";
  }) => void;
  optionCatalog?: WireOptionCatalog;
  readOnly?: boolean;
  colorMode?: WireColorMode;
  unstyled?: boolean;
  classNames?: {
    root?: string;
    header?: string;
    sidebar?: string;
    canvasRegion?: string;
    canvas?: string;
    inspector?: string;
    nodeList?: string;
    optionPanel?: string;
    validationPanel?: string;
  };
  inspectNodeId?: string;
  defaultInspectNodeId?: string;
  onInspectNodeChange?: (nodeId: string | undefined, event: WireEvent) => void;
  inspectEdgeId?: string;
  defaultInspectEdgeId?: string;
  onInspectEdgeChange?: (edgeId: string | undefined, event: WireEvent) => void;
  clearInspectOnPaneClick?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  sidebar?: ReactNode;
  inspector?: ReactNode;
  showNodeList?: boolean;
  showOptions?: boolean;
  showValidation?: boolean;
  layout?: "fixed" | "embedded";
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  canvasProps?: Omit<WireCanvasProps, "mode" | "optionCatalog" | "renderNodeCard" | "renderGroup">;
  inspectorProps?: Omit<WireInspectorProps, "nodeId" | "edgeId" | "optionCatalog">;
  className?: string;
  sidebarClassName?: string;
  canvasClassName?: string;
  inspectorClassName?: string;
  style?: CSSProperties;
}

export function WireWorkspace({
  diagram,
  defaultDiagram,
  onChange,
  onAction,
  onEvent,
  validateOnChange,
  history,
  selection,
  defaultSelection,
  onSelectionChange,
  viewport,
  defaultViewport,
  onViewportChange,
  mode,
  defaultMode,
  onModeChange,
  dirty,
  defaultDirty,
  onDirtyChange,
  optionCatalog,
  readOnly = false,
  colorMode,
  unstyled = false,
  classNames,
  inspectNodeId,
  defaultInspectNodeId,
  onInspectNodeChange,
  inspectEdgeId,
  defaultInspectEdgeId,
  onInspectEdgeChange,
  clearInspectOnPaneClick = false,
  title = "Wire",
  subtitle,
  sidebar,
  inspector,
  showNodeList = true,
  showOptions = true,
  showValidation = true,
  layout = "fixed",
  renderNodeCard = WireNodeCardView,
  renderGroup = WireGroupFrame,
  canvasProps,
  inspectorProps,
  className,
  sidebarClassName,
  canvasClassName,
  inspectorClassName,
  style
}: WireWorkspaceProps): ReactElement {
  const [internalInspectNodeId, setInternalInspectNodeId] = useState<string | undefined>(defaultInspectNodeId);
  const [internalInspectEdgeId, setInternalInspectEdgeId] = useState<string | undefined>(defaultInspectEdgeId);
  const mainRef = useRef<HTMLElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const lastCanvasFocusItemRef = useRef<WireWorkspaceFocusItem | null>(null);
  const activeInspectNodeId = inspectNodeId ?? internalInspectNodeId;
  const activeInspectEdgeId = activeInspectNodeId ? undefined : inspectEdgeId ?? internalInspectEdgeId;

  const setInspectTarget = useCallback(
    (nodeId: string | undefined, event: WireEvent) => {
      const edgeId = undefined;
      if (inspectNodeId === undefined) setInternalInspectNodeId(nodeId);
      if (inspectEdgeId === undefined) setInternalInspectEdgeId(edgeId);
      onInspectNodeChange?.(nodeId, event);
      onInspectEdgeChange?.(edgeId, event);
    },
    [inspectEdgeId, inspectNodeId, onInspectEdgeChange, onInspectNodeChange]
  );

  const setInspectEdge = useCallback(
    (edgeId: string | undefined, event: WireEvent) => {
      const nodeId = undefined;
      if (inspectNodeId === undefined) setInternalInspectNodeId(nodeId);
      if (inspectEdgeId === undefined) setInternalInspectEdgeId(edgeId);
      onInspectNodeChange?.(nodeId, event);
      onInspectEdgeChange?.(edgeId, event);
    },
    [inspectEdgeId, inspectNodeId, onInspectEdgeChange, onInspectNodeChange]
  );

  const handleEvent = useCallback(
    (event: WireEvent) => {
      if (event.type === "node.inspect") {
        setInspectTarget(event.nodeId, event);
      } else if (event.type === "edge.click" && event.intent === "inspect") {
        setInspectEdge(event.edgeId, event);
      } else if (event.type === "pane.click" && clearInspectOnPaneClick) {
        setInspectTarget(undefined, event);
      }
      onEvent?.(event);
    },
    [clearInspectOnPaneClick, onEvent, setInspectEdge, setInspectTarget]
  );

  const inspectorTabs: WireInspectorProps["tabs"] = [
    ...(showOptions ? (optionCatalog ? ["configure" as const, "style" as const] : ["style" as const]) : []),
    ...(showOptions ? ["edge" as const, "json" as const] : []),
    ...(showValidation ? ["validation" as const] : [])
  ];

  useEffect(() => {
    if (activeInspectNodeId) lastCanvasFocusItemRef.current = { type: "node", id: activeInspectNodeId };
    else if (activeInspectEdgeId) lastCanvasFocusItemRef.current = { type: "edge", id: activeInspectEdgeId };
  }, [activeInspectEdgeId, activeInspectNodeId]);

  useEffect(() => {
    const element = mainRef.current;
    if (!element) return undefined;
    const handleInspectorFocusRequest = (event: Event) => {
      const detail = (event as CustomEvent<WireInspectorFocusRequestDetail>).detail;
      lastCanvasFocusItemRef.current = detail?.item ?? lastCanvasFocusItemRef.current;
      event.preventDefault();
      focusWorkspaceInspector(inspectorRef.current);
    };
    element.addEventListener(WIRE_INSPECTOR_FOCUS_REQUEST_EVENT, handleInspectorFocusRequest);
    return () => element.removeEventListener(WIRE_INSPECTOR_FOCUS_REQUEST_EVENT, handleInspectorFocusRequest);
  }, []);

  return (
    <WireProvider
      diagram={diagram}
      defaultDiagram={defaultDiagram}
      onChange={onChange}
      onAction={onAction}
      onEvent={handleEvent}
      validateOnChange={validateOnChange}
      history={history}
      selection={selection}
      defaultSelection={defaultSelection}
      onSelectionChange={onSelectionChange}
      viewport={viewport}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      mode={mode}
      defaultMode={defaultMode}
      onModeChange={onModeChange}
      dirty={dirty}
      defaultDirty={defaultDirty}
      onDirtyChange={onDirtyChange}
    >
      <main
        ref={mainRef}
        className={cx(
          "wire-workspace",
          !unstyled && "wire-workspace--styled",
          !unstyled && (layout === "fixed"
            ? "fixed inset-0 grid grid-rows-[auto_minmax(420px,55vh)_auto] gap-3 overflow-auto bg-slate-100 p-3 text-slate-950 dark:bg-slate-900 dark:text-slate-50 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:grid-rows-none lg:gap-0 lg:overflow-hidden lg:p-0"
            : "grid min-h-[560px] grid-rows-[auto_minmax(420px,1fr)_auto] gap-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:grid-rows-none lg:gap-0 lg:p-0"),
          themeClass(colorMode),
          classNames?.root,
          className
        )}
        data-wire-theme={colorMode}
        style={style}
      >
        <aside className={cx("wire-workspace__sidebar", !unstyled && "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3.5 lg:p-4", classNames?.sidebar, sidebarClassName)}>
          <header className={cx("wire-workspace__header", !unstyled && "grid gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800", classNames?.header)}>
            <div className={cx("wire-workspace__title", !unstyled && "text-xl font-bold leading-tight tracking-normal text-slate-950 dark:text-slate-50")}>{title}</div>
            {subtitle ? <div className={cx("wire-workspace__subtitle", !unstyled && "text-[13px] text-slate-500 dark:text-slate-400")}>{subtitle}</div> : null}
          </header>
          {sidebar ?? (showNodeList ? <WireNodeList unstyled={unstyled} className={classNames?.nodeList} /> : null)}
        </aside>

        <section className={cx("wire-workspace__canvas-region", !unstyled && "relative min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 lg:min-h-0 lg:rounded-none lg:border-0", classNames?.canvasRegion, canvasClassName)}>
          <WireCanvas
            fitView={false}
            showMiniMap
            {...canvasProps}
            colorMode={canvasProps?.colorMode ?? colorMode}
            unstyled={unstyled || Boolean(canvasProps?.unstyled)}
            classNames={{ ...canvasProps?.classNames, root: cx(classNames?.canvas, canvasProps?.classNames?.root) }}
            optionCatalog={optionCatalog}
            renderNodeCard={renderNodeCard}
            renderGroup={renderGroup}
            className={cx(!unstyled && "absolute inset-0 h-full w-full", canvasProps?.className)}
          />
        </section>

        <aside
          ref={inspectorRef}
          className={cx("wire-workspace__inspector", !unstyled && "grid content-start gap-3 lg:p-4", classNames?.inspector, inspectorClassName)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !event.altKey || !event.shiftKey) return;
            event.preventDefault();
            const item = activeInspectNodeId
              ? { type: "node" as const, id: activeInspectNodeId }
              : activeInspectEdgeId
                ? { type: "edge" as const, id: activeInspectEdgeId }
                : lastCanvasFocusItemRef.current;
            focusWorkspaceCanvasItem(mainRef.current, item);
          }}
        >
          {inspector ?? (inspectorTabs.length > 0 ? (
            <WireInspector
              {...inspectorProps}
              nodeId={activeInspectNodeId}
              edgeId={activeInspectEdgeId}
              optionCatalog={optionCatalog}
              readOnly={readOnly || inspectorProps?.readOnly}
              colorMode={inspectorProps?.colorMode ?? colorMode}
              unstyled={unstyled || Boolean(inspectorProps?.unstyled)}
              classNames={{
                ...inspectorProps?.classNames,
                panel: cx(classNames?.optionPanel, inspectorProps?.classNames?.panel),
                validation: cx(classNames?.validationPanel, inspectorProps?.classNames?.validation)
              }}
              tabs={inspectorProps?.tabs ?? inspectorTabs}
              className={cx(inspectorProps?.className)}
            />
          ) : null)}
        </aside>
      </main>
    </WireProvider>
  );
}

function focusWorkspaceInspector(inspector: HTMLElement | null): void {
  requestFrame(() => {
    const target = inspector?.querySelector<HTMLElement>(
      "[role='tab'][aria-selected='true'], input, textarea, select, button, [tabindex]:not([tabindex='-1'])"
    );
    (target ?? inspector)?.focus();
  });
}

function focusWorkspaceCanvasItem(root: HTMLElement | null, item: WireWorkspaceFocusItem | null): void {
  requestFrame(() => {
    const canvas = root?.querySelector<HTMLElement>("[data-wire-canvas]");
    if (!item) {
      canvas?.focus();
      return;
    }
    const candidates = root?.querySelectorAll<HTMLElement | SVGGElement>(
      item.type === "node" ? "[data-wire-node-id]" : "[data-wire-edge-id]"
    );
    const target = [...(candidates ?? [])].find((candidate) =>
      item.type === "node"
        ? candidate.dataset.wireNodeId === item.id
        : candidate.dataset.wireEdgeId === item.id
    );
    (target ?? canvas)?.focus();
  });
}

function requestFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "undefined") {
    setTimeout(callback, 0);
    return;
  }
  requestAnimationFrame(callback);
}
