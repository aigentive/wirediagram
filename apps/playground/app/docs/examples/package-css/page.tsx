"use client";

import { WireViewer } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM } from "../production-shared";

const PACKAGE_CSS_SNIPPET = `"use client";

import "@aigentive/wire-react/styles.css";
import { WireViewer } from "@aigentive/wire-react";

export function WorkflowPreview({ diagram }) {
  return (
    <div style={{ height: 360 }}>
      <WireViewer
        diagram={diagram}
        fitView
        fitViewPadding={0.2}
        showControls
        showMiniMap
      />
    </div>
  );
}`;

export default function PackageCssExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Package CSS"
      description="Use the package stylesheet as the npm-consumer styling path."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Package CSS" }]}
      next={{ href: "/examples/custom-shell", label: "Custom shell" }}
    >
      <Prose>
        <h2 id="pattern">Pattern</h2>
        <p>
          Import <InlineCode>@aigentive/wire-react/styles.css</InlineCode> once. The package CSS covers the current
          Wire surfaces without requiring a utility-class source scan from consumers.
        </p>
      </Prose>
      <CodePreview
        snippet={PACKAGE_CSS_SNIPPET}
        height={420}
        preview={
          <ExampleSurface height={420}>
            <WireViewer diagram={PRODUCTION_DIAGRAM} fitView fitViewPadding={0.2} showControls showMiniMap />
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
