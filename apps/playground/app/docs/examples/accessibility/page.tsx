"use client";

import { WireCanvas, WireProvider } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const ACCESSIBILITY_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { WireCanvas, WireProvider } from "@aigentive/wire-react";

export function AccessibleCanvas({ diagram, optionCatalog }) {
  return (
    <WireProvider defaultDiagram={diagram} validateOnChange>
      <WireCanvas
        mode="edit"
        fitView
        keyboardA11y
        nodesFocusable
        edgesFocusable
        autoPanOnNodeFocus
        optionCatalog={optionCatalog}
        ariaLabelConfig={{
          canvas: "Agent workflow canvas",
          node: (node) => \`Workflow node: \${node.title}\`,
          edge: (edge) => \`Workflow edge: \${edge.label ?? edge.id}\`,
          search: "Search workflow items",
          connectionTarget: "Choose workflow connection target"
        }}
        isValidConnection={({ sourceNode, targetNode }) =>
          sourceNode.id === targetNode.id ? "Choose a different target." : true
        }
      />
    </WireProvider>
  );
}`;

export default function AccessibilityExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Accessibility"
      description="Use package-owned keyboard behavior, ARIA labels, search, and connection validation."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }, { label: "Accessibility" }]}
      next={{ href: "/docs/examples/theming", label: "Theming" }}
    >
      <Prose>
        <h2 id="canvas-a11y">Canvas accessibility</h2>
        <p>
          <InlineCode>keyboardA11y</InlineCode> is on by default. Override labels with{" "}
          <InlineCode>ariaLabelConfig</InlineCode>, and return a string from <InlineCode>isValidConnection</InlineCode>
          to announce connection rejection.
        </p>
      </Prose>
      <CodePreview
        snippet={ACCESSIBILITY_SNIPPET}
        height={480}
        preview={
          <ExampleSurface height={480}>
            <WireProvider defaultDiagram={PRODUCTION_DIAGRAM} validateOnChange>
              <WireCanvas
                mode="edit"
                fitView
                keyboardA11y
                nodesFocusable
                edgesFocusable
                autoPanOnNodeFocus
                optionCatalog={PRODUCTION_OPTIONS}
                ariaLabelConfig={{
                  canvas: "Agent workflow canvas",
                  node: (node) => `Workflow node: ${node.title}`,
                  edge: (edge) => `Workflow edge: ${edge.label ?? edge.id}`,
                  search: "Search workflow items",
                  connectionTarget: "Choose workflow connection target"
                }}
                isValidConnection={({ sourceNode, targetNode }) =>
                  sourceNode.id === targetNode.id ? "Choose a different target." : true
                }
              />
            </WireProvider>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
