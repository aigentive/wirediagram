import type { ReactElement } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import { WireProvider } from "../provider/WireProvider.js";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";

export interface WireViewerProps extends Omit<WireCanvasProps, "mode"> {
  diagram: WireDiagram;
}

export function WireViewer({ diagram, ...canvasProps }: WireViewerProps): ReactElement {
  return (
    <WireProvider diagram={diagram} history={false}>
      <WireCanvas {...canvasProps} mode="view" />
    </WireProvider>
  );
}
