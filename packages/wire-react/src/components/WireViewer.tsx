import type { ReactElement } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import { WireProvider } from "../provider/WireProvider.js";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";
import type { WireEvent, WireEventSource, WireSelection, WireViewport } from "../provider/types.js";

export interface WireViewerProps extends Omit<WireCanvasProps, "mode"> {
  diagram: WireDiagram;
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
  onEvent?: (event: WireEvent) => void;
}

export function WireViewer({
  diagram,
  selection,
  defaultSelection,
  onSelectionChange,
  viewport,
  defaultViewport,
  onViewportChange,
  onEvent,
  ...canvasProps
}: WireViewerProps): ReactElement {
  return (
    <WireProvider
      diagram={diagram}
      history={false}
      selection={selection}
      defaultSelection={defaultSelection}
      onSelectionChange={onSelectionChange}
      viewport={viewport}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      onEvent={onEvent}
    >
      <WireCanvas {...canvasProps} mode="view" />
    </WireProvider>
  );
}
