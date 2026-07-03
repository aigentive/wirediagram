"use client";

import { useState } from "react";
import { WireEditor, WireViewer, type WireDiagram } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const WRAPPERS_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { WireEditor, WireViewer } from "@aigentive/wire-react";

export function WrapperPair({ diagram, onChange, optionCatalog }) {
  return (
    <div className="grid grid-cols-2">
      <WireEditor
        diagram={diagram}
        onChange={onChange}
        fitView
        optionCatalog={optionCatalog}
      />
      <WireViewer
        diagram={diagram}
        fitView
        showControls={false}
        showMiniMap={false}
      />
    </div>
  );
}`;

export default function WrappersExamplePage() {
  const [diagram, setDiagram] = useState<WireDiagram>(PRODUCTION_DIAGRAM);

  return (
    <DocsPage
      eyebrow="Examples"
      title="Wrappers"
      description="Use WireEditor for editable embeds and WireViewer for read-only previews."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Wrappers" }]}
      next={{ href: "/examples/read-only-inspector", label: "Read-only inspector" }}
    >
      <Prose>
        <h2 id="wrappers">Wrapper pass-through</h2>
        <p>
          <InlineCode>WireEditor</InlineCode> and <InlineCode>WireViewer</InlineCode> keep current canvas props while
          handling provider setup for common screens.
        </p>
      </Prose>
      <CodePreview
        snippet={WRAPPERS_SNIPPET}
        height={520}
        preview={
          <ExampleSurface height={520}>
            <div className="grid h-full grid-cols-2">
              <WireEditor
                diagram={diagram}
                onChange={(next) => setDiagram(next)}
                fitView
                optionCatalog={PRODUCTION_OPTIONS}
              />
              <WireViewer
                diagram={diagram}
                fitView
                showControls={false}
                showMiniMap={false}
              />
            </div>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
