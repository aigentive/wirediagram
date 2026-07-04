"use client";

import {
  WireCanvas,
  WireInspector,
  WireNodeList,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const CUSTOM_SHELL_SNIPPET = `import "@aigentive/wire-react/styles.css";
import {
  WireCanvas,
  WireInspector,
  WireNodeList,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";

export function ProductShell({ diagram, onChange, optionCatalog }) {
  return (
    <WireProvider diagram={diagram} onChange={onChange} validateOnChange>
      <WireToolbar />
      <div className="grid grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside>
          <WirePalette />
          <WireNodeList />
        </aside>
        <WireCanvas mode="edit" fitView optionCatalog={optionCatalog} />
        <aside>
          <WireInspector optionCatalog={optionCatalog} />
          <WireValidationPanel />
        </aside>
      </div>
    </WireProvider>
  );
}`;

export default function CustomShellExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Custom shell"
      description="Compose current components around WireProvider when product chrome is custom."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }, { label: "Custom shell" }]}
      next={{ href: "/docs/examples/options", label: "Options" }}
    >
      <Prose>
        <h2 id="contract">Contract</h2>
        <p>
          The shell owns layout. <InlineCode>WireProvider</InlineCode> owns the diagram runtime state, and all edits
          still flow through reducer actions against <InlineCode>WireDiagram</InlineCode>.
        </p>
      </Prose>
      <CodePreview
        snippet={CUSTOM_SHELL_SNIPPET}
        height={560}
        preview={
          <ExampleSurface height={560}>
            <WireProvider defaultDiagram={PRODUCTION_DIAGRAM} validateOnChange>
              <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
                <WireToolbar />
                <div className="grid min-h-0 grid-cols-[190px_minmax(0,1fr)_300px]">
                  <aside className="grid min-h-0 content-start gap-3 border-r border-wire bg-wire-sunken p-3">
                    <WirePalette />
                    <WireNodeList />
                  </aside>
                  <WireCanvas mode="edit" fitView optionCatalog={PRODUCTION_OPTIONS} />
                  <aside className="grid min-h-0 content-start gap-3 overflow-auto border-l border-wire bg-wire-sunken p-3">
                    <WireInspector optionCatalog={PRODUCTION_OPTIONS} />
                    <WireValidationPanel />
                  </aside>
                </div>
              </div>
            </WireProvider>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
