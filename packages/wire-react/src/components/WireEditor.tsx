import type { ReactElement } from "react";
import type { ApplyWireActionResult, WireAction, WireDiagram } from "@aigentive/wire-core";
import { WireProvider } from "../provider/WireProvider.js";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";
import type { WireChangeEvent, WireEvent, WireEventSource, WireMode, WireSelection, WireViewport } from "../provider/types.js";

export interface WireEditorProps extends Omit<WireCanvasProps, "mode"> {
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
}

export function WireEditor({
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
  ...canvasProps
}: WireEditorProps): ReactElement {
  return (
    <WireProvider
      diagram={diagram}
      defaultDiagram={defaultDiagram}
      onChange={onChange}
      onAction={onAction}
      onEvent={onEvent}
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
      <WireCanvas {...canvasProps} />
    </WireProvider>
  );
}
