import { useCallback, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { ApplyWireActionResult, WireAction, WireDiagram } from "@aigentive/wire-core";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";
import type { WireNodeRenderer } from "../canvas/nodeTypes.js";
import { WireProvider } from "../provider/WireProvider.js";
import type { WireChangeEvent, WireEvent, WireEventSource, WireMode, WireSelection, WireViewport } from "../provider/types.js";
import type { WireOptionCatalog } from "../options.js";
import { cx } from "./classes.js";
import { WireGroupFrame, WireNodeCardView } from "./WireNodeCardView.js";
import { WireNodeList } from "./WireNodeList.js";
import { WireOptionPanel } from "./WireOptionPanel.js";
import { WireValidationPanel } from "./WireValidationPanel.js";

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
  inspectNodeId?: string;
  defaultInspectNodeId?: string;
  onInspectNodeChange?: (nodeId: string | undefined, event: WireEvent) => void;
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
  inspectNodeId,
  defaultInspectNodeId,
  onInspectNodeChange,
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
  className,
  sidebarClassName,
  canvasClassName,
  inspectorClassName,
  style
}: WireWorkspaceProps): ReactElement {
  const [internalInspectNodeId, setInternalInspectNodeId] = useState<string | undefined>(defaultInspectNodeId);
  const activeInspectNodeId = inspectNodeId ?? internalInspectNodeId;

  const setInspectNode = useCallback(
    (nodeId: string | undefined, event: WireEvent) => {
      if (inspectNodeId === undefined) setInternalInspectNodeId(nodeId);
      onInspectNodeChange?.(nodeId, event);
    },
    [inspectNodeId, onInspectNodeChange]
  );

  const handleEvent = useCallback(
    (event: WireEvent) => {
      if (event.type === "node.inspect") {
        setInspectNode(event.nodeId, event);
      } else if (event.type === "pane.click" && clearInspectOnPaneClick) {
        setInspectNode(undefined, event);
      }
      onEvent?.(event);
    },
    [clearInspectOnPaneClick, onEvent, setInspectNode]
  );

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
        className={cx(
          "wire-workspace wire-workspace--styled",
          layout === "fixed"
            ? "fixed inset-0 grid grid-rows-[auto_minmax(420px,55vh)_auto] gap-3 overflow-auto bg-slate-100 p-3 text-slate-950 dark:bg-slate-900 dark:text-slate-50 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:grid-rows-none lg:gap-0 lg:overflow-hidden lg:p-0"
            : "grid min-h-[560px] grid-rows-[auto_minmax(420px,1fr)_auto] gap-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:grid-rows-none lg:gap-0 lg:p-0",
          className
        )}
        style={style}
      >
        <aside className={cx("wire-workspace__sidebar grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3.5 lg:p-4", sidebarClassName)}>
          <header className="wire-workspace__header grid gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="wire-workspace__title text-xl font-bold leading-tight tracking-normal text-slate-950 dark:text-slate-50">{title}</div>
            {subtitle ? <div className="wire-workspace__subtitle text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </header>
          {sidebar ?? (showNodeList ? <WireNodeList /> : null)}
        </aside>

        <section className={cx("wire-workspace__canvas-region relative min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 lg:min-h-0 lg:rounded-none lg:border-0", canvasClassName)}>
          <WireCanvas
            fitView={false}
            showMiniMap
            {...canvasProps}
            optionCatalog={optionCatalog}
            renderNodeCard={renderNodeCard}
            renderGroup={renderGroup}
            className={cx("absolute inset-0 h-full w-full", canvasProps?.className)}
          />
        </section>

        <aside className={cx("wire-workspace__inspector grid content-start gap-3 lg:p-4", inspectorClassName)}>
          {inspector ?? (
            <>
              {showOptions && optionCatalog ? <WireOptionPanel catalog={optionCatalog} nodeId={activeInspectNodeId} /> : null}
              {showValidation ? <WireValidationPanel /> : null}
            </>
          )}
        </aside>
      </main>
    </WireProvider>
  );
}
