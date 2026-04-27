import type { ReactElement } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import { WireProvider } from "../provider/WireProvider.js";
import { WireCanvas, type WireCanvasProps } from "../canvas/WireCanvas.js";

export interface WireEditorProps extends Omit<WireCanvasProps, "mode"> {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram) => void;
}

export function WireEditor({
  diagram,
  defaultDiagram,
  onChange,
  ...canvasProps
}: WireEditorProps): ReactElement {
  return (
    <WireProvider
      diagram={diagram}
      defaultDiagram={defaultDiagram}
      onChange={(next) => onChange?.(next)}
    >
      <WireCanvas {...canvasProps} mode="edit" />
    </WireProvider>
  );
}
