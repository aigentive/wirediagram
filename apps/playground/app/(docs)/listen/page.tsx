"use client";

import { useCallback, useState } from "react";
import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { CodeBlock } from "../_components/CodeBlock";
import { Callout } from "../_components/Callout";
import {
  WireCanvas,
  WireNodeList,
  WireProvider,
  type WireDiagram,
  type WireEvent,
  type WireEventSource
} from "@aigentive/wire-react";

const EVENT_TYPES: Array<{ type: WireEvent["type"]; meaning: string; sources: WireEventSource[]; payload: string }> = [
  { type: "node.click", meaning: "Pointer click on a node body", sources: ["canvas", "node-list"], payload: "{ nodeId }" },
  { type: "node.inspect", meaning: "Open the inspector for this node (double-click on canvas, configurable on list)", sources: ["canvas", "node-list"], payload: "{ nodeId }" },
  { type: "edge.click", meaning: "Click on an edge polyline", sources: ["canvas"], payload: "{ edgeId }" },
  { type: "selection.change", meaning: "Selection set changed (single or multi-select)", sources: ["canvas", "node-list"], payload: "{ selection: { nodeIds, edgeIds } }" },
  { type: "pane.click", meaning: "Click on empty canvas (clears selection)", sources: ["canvas"], payload: "{}" }
];

const SOURCE_LABELS: Array<{ source: WireEventSource; status: "Built-in" | "Reserved"; emittedBy: string; notes: string }> = [
  { source: "canvas", status: "Built-in", emittedBy: "WireCanvas", notes: "Node, edge, pane, and selection events from the interactive canvas." },
  { source: "node-list", status: "Built-in", emittedBy: "WireNodeList", notes: "Row clicks plus configurable inspect/selection emissions." },
  { source: "node-card", status: "Reserved", emittedBy: "Custom app code", notes: "Use when an app-owned card wrapper emits events." },
  { source: "option-panel", status: "Reserved", emittedBy: "Custom app code", notes: "Use for app-specific option panel interactions." },
  { source: "validation-panel", status: "Reserved", emittedBy: "Custom app code", notes: "Use for app-specific validation panel interactions." },
  { source: "workspace", status: "Reserved", emittedBy: "Custom app code", notes: "Use for workspace-level events not tied to canvas/list." },
  { source: "api", status: "Reserved", emittedBy: "Programmatic code", notes: "Use for non-pointer or integration-driven emissions." }
];

const DEMO_DIAGRAM: WireDiagram = {
  version: 1,
  id: "listen-demo",
  title: "Listen demo",
  layout: "LR",
  nodes: [
    { id: "webhook", kind: "trigger", title: "Ticket webhook" },
    { id: "plan", kind: "ai", title: "Plan answer", from: "webhook", model: "gpt-4.1" },
    { id: "respond", kind: "action", title: "Send response", from: "plan", tone: "success" }
  ],
  edges: []
};

export default function ListenPage() {
  const [events, setEvents] = useState<Array<{ source: WireEventSource; line: string }>>([]);
  const [inspectOnClick, setInspectOnClick] = useState(true);
  const [selectOnClick, setSelectOnClick] = useState(true);

  const handleEvent = useCallback((event: WireEvent) => {
    setEvents((current) => [{ source: event.source, line: describeEvent(event) }, ...current].slice(0, 24));
  }, []);

  return (
    <DocsPage
      eyebrow="Listen"
      title="Events surface"
      description="Five event types, two built-in emitters, seven source labels, one onEvent handler. Canvas gestures and list selections share the same shape."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Listen" }]}
      next={{ href: "/examples/layouts", label: "See it on the sample page" }}
    >
      <Prose>
        <h2 id="why">Why a separate event channel</h2>
        <p>
          Wire splits <em>data changes</em> from <em>UI gestures</em>. <InlineCode>WireAction</InlineCode> objects move
          through the reducer; <InlineCode>WireEvent</InlineCode> objects move through <InlineCode>onEvent</InlineCode>.
          That separation is what lets a sidebar follow selection without re-rendering the canvas, or lets you fire a
          router push without dispatching an action.
        </p>

        <h2 id="types">The five types</h2>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-extrabold">Type</th>
              <th className="px-4 py-2.5 font-extrabold">Meaning</th>
              <th className="px-4 py-2.5 font-extrabold">Sources</th>
              <th className="px-4 py-2.5 font-extrabold">Payload</th>
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((row) => (
              <tr key={row.type} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold">{row.type}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.meaning}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {row.sources.map((source) => (
                      <span
                        key={source}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">{row.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="sources">Source labels</h2>
        <p>
          Built-in components emit from <InlineCode>canvas</InlineCode> and <InlineCode>node-list</InlineCode>. The
          other labels are reserved so custom cards, panels, workspaces, or integrations can use the same event shape.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-extrabold">Source</th>
              <th className="px-4 py-2.5 font-extrabold">Status</th>
              <th className="px-4 py-2.5 font-extrabold">Emitted by</th>
              <th className="px-4 py-2.5 font-extrabold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_LABELS.map((row) => (
              <tr key={row.source} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold">{row.source}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      row.status === "Built-in"
                        ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.emittedBy}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="recipes">Click recipes</h2>
        <p>One handler, narrow by <InlineCode>type</InlineCode>:</p>
      </Prose>

      <CodeBlock language="tsx">
        {`<WireWorkspace
  onEvent={(event) => {
    if (event.type === "node.inspect") {
      router.push(\`?node=\${event.nodeId}\`);
    } else if (event.type === "edge.click") {
      openEdgeInspector(event.edgeId);
    } else if (event.type === "selection.change") {
      setSelected(event.selection);
    } else if (event.type === "pane.click") {
      router.push(""); // deselect
    }
  }}
/>;`}
      </CodeBlock>

      <Prose>
        <h2 id="try-it">Try it</h2>
        <p>
          Both inputs share a single <InlineCode>WireProvider</InlineCode>, so every gesture flows through the same{" "}
          <InlineCode>onEvent</InlineCode> handler. The <InlineCode>source</InlineCode> tells you which surface fired
          it. Try clicking a node on the canvas, an empty area on the canvas (fires{" "}
          <InlineCode>pane.click</InlineCode>), and a row in the list.
        </p>
      </Prose>

      <WireProvider defaultDiagram={DEMO_DIAGRAM} onEvent={handleEvent}>
        <div className="not-prose grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-3 dark:border-slate-800">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Input · WireCanvas
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  source: canvas
                </span>
              </header>
              <div className="relative h-[260px]">
                <WireCanvas
                  mode="view"
                  fitView
                  fitViewPadding={0.22}
                  showBackground={false}
                  showControls={false}
                  showMiniMap={false}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <header className="grid gap-3 border-b border-slate-200 px-3.5 py-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Input · WireNodeList
                  </span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    source: node-list
                  </span>
                </div>
                <div className="grid gap-1.5">
                  <CompactToggle
                    checked={inspectOnClick}
                    onChange={setInspectOnClick}
                    label="inspectOnClick"
                    detail="emit node.inspect"
                  />
                  <CompactToggle
                    checked={selectOnClick}
                    onChange={setSelectOnClick}
                    label="selectOnClick"
                    detail="emit selection.change + update selection"
                  />
                </div>
              </header>
              <WireNodeList
                inspectOnClick={inspectOnClick}
                selectOnClick={selectOnClick}
                className="rounded-none border-0 dark:bg-transparent"
              />
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-3 dark:border-slate-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Output · onEvent log
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {events.length}
                </span>
                {events.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setEvents([])}
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </header>
            <div className="grid min-h-[280px] gap-0.5 overflow-auto p-2">
              {events.length === 0 ? (
                <div className="grid place-items-center px-3 py-12 text-center text-[13px]">
                  <div className="grid justify-items-center gap-2">
                    <ArrowGlyph />
                    <span className="text-slate-600 dark:text-slate-300">
                      Click a node, an edge, empty canvas, or a list row
                    </span>
                  </div>
                </div>
              ) : (
                events.map((entry, index) => (
                  <div
                    key={`${entry.line}-${index}`}
                    className={`rounded px-2.5 py-1.5 font-mono text-[12px] ${
                      index === 0
                        ? "bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {entry.line}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </WireProvider>

      <Callout tone="tip" title="Source matters">
        The <InlineCode>source</InlineCode> on every event tells you <em>where</em> the gesture came from. A canvas
        click and a list click can produce the same <InlineCode>node.inspect</InlineCode> with different sources —
        analytics or routing logic often cares about that.
      </Callout>
    </DocsPage>
  );
}

function ArrowGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-slate-300 dark:text-slate-600"
    >
      <path d="M14 10H4" />
      <path d="M9 5l-5 5 5 5" />
    </svg>
  );
}

function CompactToggle({
  checked,
  onChange,
  label,
  detail
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  detail?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-[16px] w-[16px] shrink-0 accent-blue-600"
      />
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-100">{label}</span>
        {detail ? <span className="text-[11px] text-slate-500 dark:text-slate-400">{detail}</span> : null}
      </span>
    </label>
  );
}

function describeEvent(event: WireEvent): string {
  if (event.type === "node.click" || event.type === "node.inspect") {
    return `${event.source}:${event.type}:${event.nodeId}`;
  }
  if (event.type === "edge.click") {
    return `${event.source}:${event.type}:${event.edgeId}`;
  }
  if (event.type === "selection.change") {
    const nodeIds = event.selection.nodeIds.join(",") || "none";
    const edgeIds = event.selection.edgeIds.join(",") || "none";
    return `${event.source}:${event.type}:nodes=${nodeIds}:edges=${edgeIds}`;
  }
  return `${event.source}:${event.type}`;
}
