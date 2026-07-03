import { WireCanvas, WireProvider, WireWorkspace } from "@aigentive/wire-react";
import type { WireDiagram } from "@aigentive/wire-core";

const diagram: WireDiagram = {
  version: 1,
  id: "legacy-consumer",
  title: "Legacy Consumer",
  layout: "LR",
  nodes: [{ id: "start", kind: "trigger", title: "Start" }],
  edges: []
};

export function LegacyConsumer() {
  return (
    <>
      <WireWorkspace diagram={diagram} canvasProps={{ fitView: false }} />
      <WireProvider diagram={diagram}>
        <WireCanvas fitView={false} />
      </WireProvider>
    </>
  );
}
