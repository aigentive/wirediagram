"use client";

import { useCallback, useState } from "react";
import { WireCanvas, WireInspector, WireProvider, type WireEvent } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const EDGE_INSPECTION_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { useState } from "react";
import { WireCanvas, WireInspector, WireProvider } from "@aigentive/wire-react";

export function EdgeInspector({ diagram, optionCatalog }) {
  const [edgeId, setEdgeId] = useState("edge-qualify-route");

  return (
    <WireProvider
      defaultDiagram={diagram}
      onEvent={(event) => {
        if (event.type === "edge.click") setEdgeId(event.edgeId);
      }}
    >
      <WireCanvas mode="edit" fitView inspectOnEdgeClick />
      <WireInspector edgeId={edgeId} optionCatalog={optionCatalog} />
    </WireProvider>
  );
}`;

export default function EdgeInspectionExamplePage() {
  const [edgeId, setEdgeId] = useState("edge-qualify-route");
  const onEvent = useCallback((event: WireEvent) => {
    if (event.type === "edge.click") setEdgeId(event.edgeId);
  }, []);

  return (
    <DocsPage
      eyebrow="Examples"
      title="Edge inspection"
      description="Inspect and patch current edge fields without changing the durable app contract."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }, { label: "Edge inspection" }]}
      next={{ href: "/docs/examples/accessibility", label: "Accessibility" }}
    >
      <Prose>
        <h2 id="edge-tab">Edge tab</h2>
        <p>
          <InlineCode>WireInspector edgeId</InlineCode> opens edge details. Editable primitive fields dispatch the
          current <InlineCode>edge.patch</InlineCode> action; endpoint facts stay read-only.
        </p>
      </Prose>
      <CodePreview
        snippet={EDGE_INSPECTION_SNIPPET}
        height={540}
        preview={
          <ExampleSurface height={540}>
            <WireProvider defaultDiagram={PRODUCTION_DIAGRAM} validateOnChange onEvent={onEvent}>
              <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
                <WireCanvas mode="edit" fitView inspectOnEdgeClick optionCatalog={PRODUCTION_OPTIONS} />
                <aside className="overflow-auto border-l border-wire bg-wire-sunken p-3">
                  <WireInspector edgeId={edgeId} optionCatalog={PRODUCTION_OPTIONS} />
                </aside>
              </div>
            </WireProvider>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
