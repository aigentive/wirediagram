"use client";

import { WireInspector, WireProvider, WireViewer } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const READ_ONLY_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { WireInspector, WireProvider, WireViewer } from "@aigentive/wire-react";

export function ReadOnlyInspector({ diagram, optionCatalog }) {
  return (
    <WireProvider diagram={diagram} history={false}>
      <WireViewer diagram={diagram} fitView />
      <WireInspector
        nodeId="qualify"
        optionCatalog={optionCatalog}
        readOnly
      />
    </WireProvider>
  );
}`;

export default function ReadOnlyInspectorExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Read-only inspector"
      description="Lock built-in mutating controls while keeping values reachable and copyable."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }, { label: "Read-only inspector" }]}
    >
      <Prose>
        <h2 id="read-only">Read-only behavior</h2>
        <p>
          <InlineCode>readOnly</InlineCode> disables built-in mutation paths in the inspector. Host-owned custom
          inspector content should apply the same non-mutating rule.
        </p>
      </Prose>
      <CodePreview
        snippet={READ_ONLY_SNIPPET}
        height={520}
        preview={
          <ExampleSurface height={520}>
            <WireProvider diagram={PRODUCTION_DIAGRAM} history={false}>
              <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
                <WireViewer diagram={PRODUCTION_DIAGRAM} fitView showControls={false} showMiniMap={false} />
                <aside className="overflow-auto border-l border-wire bg-wire-sunken p-3">
                  <WireInspector nodeId="qualify" optionCatalog={PRODUCTION_OPTIONS} readOnly />
                </aside>
              </div>
            </WireProvider>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
