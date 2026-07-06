import Link from "next/link";
import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { PropsTable, type PropRow } from "../../_components/PropsTable";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";

export const metadata = { title: "API · React components · Wire docs" };

const providerRows: PropRow[] = [
  { name: "diagram", type: "WireDiagram", notes: "Controlled durable diagram state." },
  { name: "defaultDiagram", type: "WireDiagram", notes: "Initial uncontrolled diagram." },
  { name: "onChange", type: "(diagram, event) => void", notes: "Receives updated WireDiagram and change metadata." },
  { name: "onAction", type: "(action, result) => void", notes: "Observe each WireAction result." },
  { name: "onEvent", type: "(event) => void", notes: "Receives node, edge, selection, and pane events." },
  { name: "validateOnChange", type: "boolean", notes: "Refresh validation after reducer changes." },
  { name: "history", type: "boolean", notes: "Enable provider undo/redo tracking." },
  { name: "selection / defaultSelection", type: "WireSelection", notes: "Controlled or uncontrolled selected node and edge ids." },
  { name: "viewport / defaultViewport", type: "WireViewport", notes: "Controlled or uncontrolled pan and zoom state." },
  { name: "mode / defaultMode", type: "WireMode", notes: "View, edit, connect, or comment mode." },
  { name: "dirty / defaultDirty", type: "boolean", notes: "Controlled or uncontrolled dirty state." }
];

const canvasRows: PropRow[] = [
  { name: "mode", type: "\"view\" | \"edit\"", default: "\"view\"", notes: "Canvas interaction mode." },
  { name: "fitView / fitViewPadding", type: "boolean / number", notes: "Initial bounds fit and padding." },
  { name: "showBackground / showControls / showMiniMap", type: "boolean", notes: "Built-in canvas chrome." },
  { name: "selectOnNodeClick / inspectOnNodeClick", type: "boolean", notes: "Default node-click behavior." },
  { name: "selectOnEdgeClick / inspectOnEdgeClick", type: "boolean", notes: "Default edge-click behavior." },
  { name: "optionCatalog", type: "WireOptionCatalog", notes: "Runtime option metadata for node forms." },
  { name: "renderNodeCard / renderGroup / renderEdge", type: "renderer function", notes: "Custom renderers. Do not serialize renderer functions." },
  { name: "colorMode", type: "\"light\" | \"dark\" | \"system\"", notes: "Package CSS theme mode." },
  { name: "unstyled / classNames / className / style", type: "styling props", notes: "Style integration without requiring Tailwind." },
  { name: "keyboardA11y", type: "boolean", notes: "Enable keyboard navigation helpers." }
];

const shellRows: PropRow[] = [
  { name: "WireViewer", type: "diagram: WireDiagram", notes: "Read-only provider + canvas wrapper. Accepts canvas props except mode." },
  { name: "WireEditor", type: "diagram/defaultDiagram + canvas props", notes: "Editable provider + canvas wrapper. Accepts provider state props and canvas props." },
  { name: "WireWorkspace", type: "diagram/defaultDiagram + shell props", notes: "Complete editor shell with sidebar, canvas, inspector, options, validation, and read-only mode." },
  { name: "WireInspector", type: "nodeId?, edgeId?, optionCatalog?", notes: "Inspector tabs for configure, style, edge, JSON, and validation views." },
  { name: "WireOptionPanel", type: "catalog, nodeId", notes: "Standalone option fields for custom sidebars or modals." },
  { name: "WireToolbar / WirePalette / WireNodeList / WireValidationPanel", type: "context consumers", notes: "Use inside WireProvider or WireWorkspace composition." }
];

const optionRows: PropRow[] = [
  { name: "WireOptionSpec", type: "object", notes: "Runtime option metadata: key, label, type, storage, section, width, options, bounds, and placeholder." },
  { name: "WireOptionCatalog", type: "Record<kind | \"*\", WireOptionSpec[]>", notes: "Runtime catalog grouped by node kind plus shared wildcard options." },
  { name: "storage", type: "\"node\" | \"data\" | \"metadata\"", notes: "Controls where the serializable option value is written." },
  { name: "readWireOption / patchWireOption", type: "helpers", notes: "Read and patch serializable option values according to storage rules." }
];

export default function ReactComponentsApiPage() {
  return (
    <DocsPage
      eyebrow="Reference"
      title="React component API"
      description="Current public React surfaces for embedding, editing, inspecting, and styling Wire diagrams."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Reference" }, { label: "React components" }]}
      next={{ href: "/docs/api/wire-core", label: "API · wire-core" }}
    >
      <Prose>
        <h2 id="contract">Contract</h2>
        <p>
          React components render and edit <InlineCode>WireDiagram</InlineCode>. Reducer changes are represented by{" "}
          <InlineCode>WireAction</InlineCode>. Do not make adapter output, selection, viewport, option catalogs,
          callbacks, or rendered assets the persisted app contract.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`"use client";

import "@aigentive/wire-react/styles.css";
import { WireWorkspace, type WireDiagram } from "@aigentive/wire-react";

export function Editor({ diagram, onChange }: {
  diagram: WireDiagram;
  onChange: (diagram: WireDiagram) => void;
}) {
  return (
    <div style={{ height: 640 }}>
      <WireWorkspace diagram={diagram} onChange={onChange} colorMode="system" />
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="wire-provider">WireProvider</h2>
        <p>
          <InlineCode>WireProvider</InlineCode> owns runtime state and reducer dispatch for a subtree. Use controlled
          props when the app persists diagrams externally.
        </p>
      </Prose>
      <PropsTable rows={providerRows} />

      <Prose>
        <h2 id="wire-canvas">WireCanvas</h2>
        <p>
          <InlineCode>WireCanvas</InlineCode> renders the current provider diagram. It must be inside{" "}
          <InlineCode>WireProvider</InlineCode> unless you use a wrapper such as <InlineCode>WireViewer</InlineCode>,{" "}
          <InlineCode>WireEditor</InlineCode>, or <InlineCode>WireWorkspace</InlineCode>.
        </p>
      </Prose>
      <PropsTable rows={canvasRows} />

      <Prose>
        <h2 id="shells-and-panels">Shells and panels</h2>
        <p>
          Higher-level components compose provider, canvas, inspector, node list, validation, and option surfaces for
          common product workflows.
        </p>
      </Prose>
      <PropsTable rows={shellRows} />

      <Prose>
        <h2 id="options">Options</h2>
        <p>
          Options are runtime editor metadata. Persist the serializable values they write, not the catalog functions or
          React nodes. See <Link href="/docs/customize/options">Option catalogs</Link> for storage rules.
        </p>
      </Prose>
      <PropsTable rows={optionRows} />

      <Callout tone="tip" title="Package CSS">
        Import <InlineCode>@aigentive/wire-react/styles.css</InlineCode> once. Consumers can use CSS variables,{" "}
        <InlineCode>colorMode</InlineCode>, <InlineCode>unstyled</InlineCode>, and <InlineCode>classNames</InlineCode>;
        no Tailwind configuration is required for React consumers.
      </Callout>
    </DocsPage>
  );
}
