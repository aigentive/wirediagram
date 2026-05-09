"use client";

import { useCallback, useState } from "react";
import { WireProvider, WireOptionPanel, type WireEvent } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { Prose } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import {
  CanvasPane,
  ClickableHint,
  HORIZONTAL_DIAGRAM,
  Hint,
  Modal,
  OPTIONS
} from "../_shared";

const MODAL_SNIPPET = `import { useState } from "react";
import { WireProvider, WireCanvas, WireOptionPanel } from "@aigentive/wire-react";

function FlowWithModal({ diagram, options }) {
  const [openId, setOpenId] = useState<string>();

  return (
    <WireProvider
      defaultDiagram={diagram}
      onEvent={(event) => {
        if (event.type === "node.click") setOpenId(event.nodeId);
      }}
    >
      <WireCanvas mode="view" />
      {openId && (
        <Modal onClose={() => setOpenId(undefined)}>
          <WireOptionPanel catalog={options} nodeId={openId} />
        </Modal>
      )}
    </WireProvider>
  );
}`;

export default function ClickModalExamplePage() {
  const [modalNodeId, setModalNodeId] = useState<string | undefined>();

  const onEvent = useCallback((event: WireEvent) => {
    if (event.type === "node.click" || event.type === "node.inspect") {
      setModalNodeId(event.nodeId);
    }
  }, []);

  return (
    <DocsPage
      eyebrow="Examples"
      title="Click → modal"
      description="Surface params in a dialog. Wire emits a node.click event for every node in the canvas. Listen for it, open a modal, and render the option panel inside."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Click → modal" }]}
      next={{ href: "/examples/click-sidebar", label: "Click → sidebar" }}
    >
      <Prose>
        <h2 id="try-it">Try it</h2>
        <p>Click any node to open its options dialog. Press Esc or click the backdrop to close.</p>
      </Prose>

      <WireProvider defaultDiagram={HORIZONTAL_DIAGRAM} validateOnChange onEvent={onEvent}>
        <div className="relative overflow-hidden rounded-lg border border-wire bg-wire-surface">
          <ClickableHint>Click any node</ClickableHint>
          <CanvasPane height={400} />
          {modalNodeId ? (
            <Modal title="Node options" onClose={() => setModalNodeId(undefined)}>
              <WireOptionPanel catalog={OPTIONS} nodeId={modalNodeId} />
            </Modal>
          ) : null}
        </div>
      </WireProvider>
      <Hint>
        Click any node above to open its options dialog. Press{" "}
        <kbd className="rounded border border-wire bg-wire-surface px-1 font-mono text-[10px]">Esc</kbd>{" "}
        or click the backdrop to close.
      </Hint>

      <Prose>
        <h2 id="pattern">The pattern</h2>
        <p>
          One <code>onEvent</code> handler narrows on <code>node.click</code> and stores the clicked node id. The dialog
          mounts <code>WireOptionPanel</code> with that id and the option catalog — Wire renders the form, validates,
          and dispatches actions back into the diagram.
        </p>
      </Prose>

      <CodeBlock language="tsx">{MODAL_SNIPPET}</CodeBlock>
    </DocsPage>
  );
}
