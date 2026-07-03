"use client";

import { WireInspector, WireOptionPanel, WireProvider, WireWorkspace } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const OPTIONS_SNIPPET = `import "@aigentive/wire-react/styles.css";
import {
  WireInspector,
  WireOptionPanel,
  WireProvider,
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const optionCatalog: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select", options: ["gpt-4.1-mini", "gpt-4.1"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1, width: "half" }
  ],
  action: [
    { key: "channel", type: "select", options: ["crm", "email", "chat"] }
  ]
};

export function OptionsInWorkspace({ diagram, onChange }) {
  return (
    <WireWorkspace
      diagram={diagram}
      onChange={onChange}
      optionCatalog={optionCatalog}
    />
  );
}

export function OptionsInCustomPanel({ diagram }) {
  return (
    <WireProvider defaultDiagram={diagram}>
      <WireInspector nodeId="qualify" optionCatalog={optionCatalog} />
      <WireOptionPanel nodeId="enterprise" catalog={optionCatalog} />
    </WireProvider>
  );
}`;

export default function OptionsExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Options"
      description="Use WireOptionCatalog with the current inspector and option panel names."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Options" }]}
      next={{ href: "/examples/controlled-state", label: "Controlled state" }}
    >
      <Prose>
        <h2 id="entry-points">Entry points</h2>
        <p>
          Keep catalogs at the view layer: <InlineCode>WireWorkspace optionCatalog</InlineCode>,{" "}
          <InlineCode>WireInspector optionCatalog</InlineCode>, <InlineCode>WireCanvas optionCatalog</InlineCode>, and{" "}
          <InlineCode>WireOptionPanel catalog</InlineCode>.
        </p>
      </Prose>
      <CodePreview
        snippet={OPTIONS_SNIPPET}
        height={560}
        preview={
          <ExampleSurface height={560}>
            <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
              <WireWorkspace
                defaultDiagram={PRODUCTION_DIAGRAM}
                optionCatalog={PRODUCTION_OPTIONS}
                title="Agent router"
                subtitle="Workspace catalog"
                layout="embedded"
                showValidation={false}
              />
              <WireProvider defaultDiagram={PRODUCTION_DIAGRAM}>
                <aside className="grid min-h-0 content-start gap-3 overflow-auto border-l border-wire bg-wire-sunken p-3">
                  <WireInspector nodeId="qualify" optionCatalog={PRODUCTION_OPTIONS} />
                  <WireOptionPanel nodeId="enterprise" catalog={PRODUCTION_OPTIONS} />
                </aside>
              </WireProvider>
            </div>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
