"use client";

import { useCallback, useState } from "react";
import { WireProvider, type WireEvent } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { Prose } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import {
  CanvasPane,
  ClickableHint,
  ContextSidebar,
  HORIZONTAL_DIAGRAM,
  Hint
} from "../_shared";

const SIDEBAR_SNIPPET = `import { useState } from "react";
import { WireProvider, WireCanvas, WireOptionPanel } from "@aigentive/wire-react";

function FlowWithSidebar({ diagram, options }) {
  const [openId, setOpenId] = useState<string>();

  return (
    <WireProvider
      defaultDiagram={diagram}
      onEvent={(event) => {
        if (event.type === "node.click") setOpenId(event.nodeId);
        else if (event.type === "pane.click") setOpenId(undefined);
      }}
    >
      <div className="grid grid-cols-[1fr_320px]">
        <WireCanvas mode="view" />
        {openId && (
          <aside>
            <WireOptionPanel catalog={options} nodeId={openId} />
          </aside>
        )}
      </div>
    </WireProvider>
  );
}`;

export default function ClickSidebarExamplePage() {
  const [sidebarNodeId, setSidebarNodeId] = useState<string | undefined>();

  const onEvent = useCallback((event: WireEvent) => {
    if (event.type === "node.click" || event.type === "node.inspect") {
      setSidebarNodeId(event.nodeId);
    } else if (event.type === "pane.click") {
      setSidebarNodeId(undefined);
    }
  }, []);

  return (
    <DocsPage
      eyebrow="Examples"
      title="Click → sidebar"
      description="Slide in a contextual panel. Same listener as the modal example, different placement — useful when option editing happens mid-flow without leaving the canvas."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Click → sidebar" }]}
    >
      <Prose>
        <h2 id="try-it">Try it</h2>
        <p>Click a node to load its options in the sidebar. Click empty canvas to close it.</p>
      </Prose>

      <WireProvider defaultDiagram={HORIZONTAL_DIAGRAM} validateOnChange onEvent={onEvent}>
        <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative">
            <ClickableHint>Click any node</ClickableHint>
            <CanvasPane height={460} />
          </div>
          <ContextSidebar nodeId={sidebarNodeId} onClose={() => setSidebarNodeId(undefined)} />
        </div>
      </WireProvider>
      <Hint>Click a node to load its options in the sidebar. Click empty canvas to close it.</Hint>

      <Prose>
        <h2 id="pattern">The pattern</h2>
        <p>
          The handler also listens for <code>pane.click</code> to clear selection — clicking empty canvas closes the
          inspector. Mount <code>WireOptionPanel</code> in your sidebar with the same node id; everything else is just
          layout.
        </p>
      </Prose>

      <CodeBlock language="tsx">{SIDEBAR_SNIPPET}</CodeBlock>
    </DocsPage>
  );
}
