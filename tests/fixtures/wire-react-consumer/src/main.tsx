import { createRoot } from "react-dom/client";
import {
  WireCanvas,
  WireEditor,
  WireGroupFrame,
  WireInspector,
  WireNodeCardView,
  WireNodeList,
  WireOptionPanel,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel,
  WireViewer,
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";
import "@aigentive/wire-react/styles.css";
import type { WireDiagram } from "@aigentive/wire-core";

const diagram: WireDiagram = {
  version: 1,
  id: "consumer-fixture",
  title: "Consumer Fixture",
  layout: "LR",
  nodes: [
    { id: "start", kind: "trigger", title: "Start", position: { x: 0, y: 60 } },
    {
      id: "task",
      kind: "action",
      title: "Task",
      from: "start",
      position: { x: 300, y: 60 },
      data: { options: { owner: "Ada" } }
    }
  ],
  edges: [{ id: "start-task", from: "start", to: "task" }]
};

const optionCatalog: WireOptionCatalog = {
  action: [{ key: "owner", label: "Owner", type: "text" }]
};

function App() {
  return (
    <main>
      <WireWorkspace
        diagram={diagram}
        optionCatalog={optionCatalog}
        defaultInspectNodeId="task"
        colorMode="system"
        canvasProps={{ fitView: false, showMiniMap: true }}
      />
      <WireProvider diagram={diagram} defaultSelection={{ nodeIds: ["task"], edgeIds: [] }}>
        <WireCanvas fitView={false} showMiniMap showControls optionCatalog={optionCatalog} />
        <WireInspector optionCatalog={optionCatalog} />
        <WireOptionPanel catalog={optionCatalog} />
        <WireToolbar />
        <WirePalette kinds={["action"]} />
        <WireNodeList />
        <WireValidationPanel />
      </WireProvider>
      <WireEditor diagram={diagram} fitView={false} />
      <WireViewer diagram={diagram} fitView={false} />
      <WireNodeCardView
        node={diagram.nodes[1]!}
        data={{ title: "Task", kind: "action", wire: diagram.nodes[1]! }}
        kind="action"
        tone="default"
        theme={{ border: "#d4d4d8", background: "#fff", accent: "#334155" }}
        selected={false}
        width={240}
        height={120}
        options={{ owner: "Ada" }}
        optionSpecs={optionCatalog.action ?? []}
      />
      <WireGroupFrame
        node={{ id: "group", kind: "group", title: "Group", children: ["task"] }}
        data={{ title: "Group", kind: "group", wire: { id: "group", kind: "group", title: "Group", children: ["task"] } }}
        kind="group"
        tone="default"
        theme={{ border: "#d4d4d8", background: "#fff", accent: "#334155" }}
        selected={false}
        width={320}
        height={220}
        options={{}}
        optionSpecs={[]}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
