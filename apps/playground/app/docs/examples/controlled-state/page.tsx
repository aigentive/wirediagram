"use client";

import { useState } from "react";
import {
  WireWorkspace,
  type WireDiagram,
  type WireMode,
  type WireSelection,
  type WireViewport
} from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleMetric, ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const CONTROLLED_STATE_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { useState } from "react";
import {
  WireWorkspace,
  type WireMode,
  type WireSelection,
  type WireViewport
} from "@aigentive/wire-react";

export function ControlledWorkspace({ initial, optionCatalog }) {
  const [diagram, setDiagram] = useState(initial);
  const [selection, setSelection] = useState<WireSelection>({ nodeIds: ["qualify"], edgeIds: [] });
  const [viewport, setViewport] = useState<WireViewport>({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<WireMode>("edit");
  const [dirty, setDirty] = useState(false);

  return (
    <WireWorkspace
      diagram={diagram}
      onChange={setDiagram}
      selection={selection}
      onSelectionChange={(next) => setSelection(next)}
      viewport={viewport}
      onViewportChange={(next) => setViewport(next)}
      mode={mode}
      onModeChange={(next) => setMode(next)}
      dirty={dirty}
      onDirtyChange={(next) => setDirty(next)}
      optionCatalog={optionCatalog}
    />
  );
}`;

export default function ControlledStateExamplePage() {
  const [diagram, setDiagram] = useState<WireDiagram>(PRODUCTION_DIAGRAM);
  const [selection, setSelection] = useState<WireSelection>({ nodeIds: ["qualify"], edgeIds: [] });
  const [viewport, setViewport] = useState<WireViewport>({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<WireMode>("edit");
  const [dirty, setDirty] = useState(false);

  return (
    <DocsPage
      eyebrow="Examples"
      title="Controlled state"
      description="Host the diagram plus runtime selection, viewport, mode, and dirty flags."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Controlled state" }]}
      next={{ href: "/examples/edge-inspection", label: "Edge inspection" }}
    >
      <Prose>
        <h2 id="runtime-state">Runtime state</h2>
        <p>
          <InlineCode>WireDiagram</InlineCode> remains durable. Selection, viewport, mode, and dirty state can be
          controlled by the host without becoming persisted diagram fields.
        </p>
      </Prose>
      <CodePreview
        snippet={CONTROLLED_STATE_SNIPPET}
        height={620}
        preview={
          <ExampleSurface height={620}>
            <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
              <div className="grid grid-cols-4 gap-2 border-b border-wire bg-wire-sunken p-2">
                <ExampleMetric label="Selection" value={`${selection.nodeIds.length} nodes / ${selection.edgeIds.length} edges`} />
                <ExampleMetric label="Viewport" value={`${Math.round(viewport.zoom * 100)}%`} />
                <ExampleMetric label="Mode" value={mode} />
                <ExampleMetric label="Dirty" value={dirty ? "true" : "false"} />
              </div>
              <WireWorkspace
                diagram={diagram}
                onChange={setDiagram}
                selection={selection}
                onSelectionChange={(next) => setSelection(next)}
                viewport={viewport}
                onViewportChange={(next) => setViewport(next)}
                mode={mode}
                onModeChange={(next) => setMode(next)}
                dirty={dirty}
                onDirtyChange={(next) => setDirty(next)}
                optionCatalog={PRODUCTION_OPTIONS}
                layout="embedded"
              />
            </div>
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
