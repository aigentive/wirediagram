"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { WireDiagram, WireNode } from "@aigentive/wire-core";
import {
  WireGroupFrame,
  WireNodeCardView,
  WireNodeList,
  WireOptionPanel,
  WireProvider,
  WireValidationPanel,
  WireWorkspace,
  wireNodeOptions,
  wireOptionSpecsForNode,
  type WireEvent,
  type WireNodeRenderContext,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const AGENT_OPTIONS: WireOptionCatalog = {
  "*": [
    {
      key: "owner",
      label: "Owner",
      storage: "data",
      placeholder: "support-platform"
    }
  ],
  trigger: [
    { key: "event", label: "Event", placeholder: "ticket.created" }
  ],
  ai: [
    {
      key: "model",
      label: "Model",
      storage: "node",
      type: "select",
      options: ["gpt-4.1", "gpt-4.1-mini", "o4-mini"]
    },
    { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1 },
    { key: "maxSteps", label: "Max steps", type: "number", min: 1, max: 20, step: 1 },
    { key: "mode", label: "Mode", type: "select", options: ["classify", "plan", "respond"] }
  ],
  retrieval: [
    { key: "index", label: "Index" },
    { key: "topK", label: "Top K", type: "number", min: 1, max: 20, step: 1 }
  ],
  tool: [
    { key: "ref", label: "Tool ref", storage: "node" },
    { key: "requiresApproval", label: "Requires approval", type: "boolean" }
  ],
  action: [
    { key: "channel", label: "Channel", type: "select", options: ["email", "chat", "ticket"] }
  ]
};

const DEMO_DIAGRAM: WireDiagram = {
  version: 1,
  id: "components-agent-chain",
  title: "Support agent chain",
  layout: "LR",
  nodes: [
    {
      id: "intake-stage",
      kind: "group",
      title: "Intake",
      position: { x: 40, y: 40 },
      size: { width: 520, height: 220 },
      children: ["webhook", "triage"]
    },
    {
      id: "webhook",
      kind: "trigger",
      title: "Ticket webhook",
      parent: "intake-stage",
      position: { x: 90, y: 125 },
      size: { width: 220, height: 88 },
      data: { owner: "support-platform", options: { event: "ticket.created" } }
    },
    {
      id: "triage",
      kind: "ai",
      title: "Classify request",
      from: "webhook",
      parent: "intake-stage",
      position: { x: 310, y: 125 },
      size: { width: 220, height: 88 },
      model: "gpt-4.1-mini",
      data: { owner: "support-platform", options: { mode: "classify", temperature: 0.1 } }
    },
    {
      id: "resolve-stage",
      kind: "group",
      title: "Resolve",
      position: { x: 620, y: 40 },
      size: { width: 1000, height: 220 },
      children: ["retrieve", "plan", "update-ticket", "respond"]
    },
    {
      id: "retrieve",
      kind: "retrieval",
      title: "Retrieve context",
      from: "triage",
      parent: "resolve-stage",
      position: { x: 670, y: 125 },
      size: { width: 220, height: 88 },
      data: { owner: "knowledge", options: { index: "kb-production", topK: 5 } }
    },
    {
      id: "plan",
      kind: "ai",
      title: "Plan answer",
      from: "retrieve",
      parent: "resolve-stage",
      position: { x: 890, y: 125 },
      size: { width: 220, height: 88 },
      model: "gpt-4.1",
      data: { owner: "agent-runtime", options: { mode: "plan", temperature: 0.3, maxSteps: 4 } }
    },
    {
      id: "update-ticket",
      kind: "tool",
      title: "Update ticket",
      from: "plan",
      parent: "resolve-stage",
      position: { x: 1110, y: 125 },
      size: { width: 220, height: 88 },
      ref: "zendesk.update_ticket",
      data: { owner: "ops", options: { requiresApproval: true } }
    },
    {
      id: "respond",
      kind: "action",
      title: "Send response",
      from: "update-ticket",
      parent: "resolve-stage",
      position: { x: 1330, y: 125 },
      size: { width: 220, height: 88 },
      tone: "success",
      data: { owner: "agent-runtime", options: { channel: "email" } }
    }
  ],
  edges: [],
  metadata: {
    wireReact: {
      sample: "components"
    }
  }
};

const WORKSPACE_DIAGRAM: WireDiagram = {
  version: 1,
  id: "components-workspace",
  title: "Compact agent workspace",
  layout: "LR",
  nodes: [
    {
      id: "resolve-stage",
      kind: "group",
      title: "Resolve",
      position: { x: 40, y: 40 },
      size: { width: 760, height: 220 },
      children: ["webhook", "plan", "respond"]
    },
    {
      id: "webhook",
      kind: "trigger",
      title: "Ticket webhook",
      parent: "resolve-stage",
      position: { x: 80, y: 125 },
      size: { width: 200, height: 88 },
      data: { owner: "support-platform", options: { event: "ticket.created" } }
    },
    {
      id: "plan",
      kind: "ai",
      title: "Plan answer",
      from: "webhook",
      parent: "resolve-stage",
      position: { x: 320, y: 125 },
      size: { width: 200, height: 88 },
      model: "gpt-4.1",
      data: { owner: "agent-runtime", options: { mode: "plan", temperature: 0.3, maxSteps: 4 } }
    },
    {
      id: "respond",
      kind: "action",
      title: "Send response",
      from: "plan",
      parent: "resolve-stage",
      position: { x: 560, y: 125 },
      size: { width: 200, height: 88 },
      tone: "success",
      data: { owner: "agent-runtime", options: { channel: "email" } }
    }
  ],
  edges: []
};

const CARD_NODES: WireNode[] = [
  {
    id: "webhook",
    kind: "trigger",
    title: "Ticket webhook",
    data: { options: { event: "ticket.created" } }
  },
  {
    id: "plan",
    kind: "ai",
    title: "Plan answer",
    model: "gpt-4.1",
    data: { options: { mode: "plan", temperature: 0.3 } }
  },
  {
    id: "retrieve",
    kind: "retrieval",
    title: "Retrieve context",
    data: { options: { index: "kb-production", topK: 5 } }
  },
  {
    id: "update-ticket",
    kind: "tool",
    title: "Update ticket",
    ref: "zendesk.update_ticket",
    data: { options: { requiresApproval: true } }
  },
  {
    id: "respond",
    kind: "action",
    title: "Send response",
    tone: "success",
    data: { options: { channel: "email" } }
  },
  {
    id: "done",
    kind: "end",
    title: "Close workflow",
    description: "Terminal state"
  }
];

const STYLE_ITEMS = [
  {
    title: "Surfaces",
    detail: "Use white panels, slate borders, soft shadows, and radius at 8px or less for normal cards."
  },
  {
    title: "Status",
    detail: "Use badges, text, and rings for state. Avoid colored left-border cards."
  },
  {
    title: "Forms",
    detail: "Options are typed fields generated from serializable metadata, then patched through Wire actions."
  },
  {
    title: "Groups",
    detail: "Groups are frames around child nodes. Child cards move with the group and keep Wire positions valid."
  }
];

const COMPONENT_ROWS = [
  ["WireWorkspace", "Complete editor shell", "layout, diagram, onChange, optionCatalog, renderNodeCard, renderGroup, onEvent"],
  ["WireCanvas", "Canvas primitive", "mode, fitView, showMiniMap, optionCatalog, renderNodeCard, renderGroup"],
  ["WireNodeCardView", "Default node card", "WireNodeRenderContext with node, kind, selected, options, optionSpecs"],
  ["WireGroupFrame", "Default group frame", "WireNodeRenderContext with group node and child count"],
  ["WireOptionPanel", "Typed options sidebar", "catalog, nodeId, title, className, style"],
  ["WireNodeList", "Selectable node index", "includeGroups, inspectOnClick, selectOnClick, renderItem"],
  ["WireValidationPanel", "Validation status", "className, style"]
];

export default function ComponentsPage() {
  const [events, setEvents] = useState<string[]>([]);

  const handleEvent = useCallback((event: WireEvent) => {
    setEvents((current) => [describeEvent(event), ...current].slice(0, 8));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <Link href="/" className="text-[13px] font-bold text-blue-900 no-underline">
                Wire playground
              </Link>
              <h1 className="m-0 text-3xl font-bold tracking-normal text-slate-950">
                React component system
              </h1>
            </div>
            <Link
              href="/samples/agent-chain"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-bold text-slate-800 no-underline shadow-sm"
            >
              Open agent sample
            </Link>
          </div>
          <p className="max-w-[860px] text-[15px] leading-6 text-slate-600">
            Reusable Wire React components for app screens, docs pages, playgrounds, and LLM-authored extensions.
            The app imports Wire-level components and props, while React Flow stays behind the package boundary.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-8 lg:px-8">
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Component index</h2>
              <p className="m-0 text-[13px] text-slate-500">The public surface an app or agent should copy first.</p>
            </div>
            <a
              href="#workspace"
              className="rounded-md bg-blue-900 px-3 py-2 text-[13px] font-bold text-white no-underline"
            >
              View workspace
            </a>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Component</th>
                  <th className="px-4 py-3 font-extrabold">Role</th>
                  <th className="px-4 py-3 font-extrabold">Common props</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ROWS.map(([name, role, props]) => (
                  <tr key={name} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-950">{name}</td>
                    <td className="px-4 py-3 text-slate-700">{role}</td>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-slate-500">{props}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Style guide</h2>
            <p className="m-0 text-[13px] text-slate-500">Shared rules for cards, forms, groups, and selection states.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STYLE_ITEMS.map((item) => (
              <article key={item.title} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-[15px] font-bold tracking-normal text-slate-950">{item.title}</h3>
                <p className="m-0 text-[13px] leading-5 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workspace" className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Workspace shell</h2>
            <p className="m-0 text-[13px] text-slate-500">
              `layout="embedded"` lets product pages show the same editor shell without fixed positioning.
            </p>
          </div>
          <WireWorkspace
            defaultDiagram={WORKSPACE_DIAGRAM}
            defaultInspectNodeId="plan"
            optionCatalog={AGENT_OPTIONS}
            onEvent={handleEvent}
            layout="embedded"
            title="Agent builder"
            subtitle="Reusable workspace with cards, groups, options, validation, and events"
            canvasProps={{
              fitView: true,
              fitViewPadding: 0.08,
              showMiniMap: false
            }}
          />
        </section>

        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Cards and groups</h2>
            <p className="m-0 text-[13px] text-slate-500">Default renderers receive Wire context and can be replaced per app.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {CARD_NODES.map((node, index) => (
                <div key={node.id} className="h-[148px] min-w-0">
                  <WireNodeCardView {...renderContext(node, index === 1)} />
                </div>
              ))}
            </div>
            <div className="grid gap-4">
              <div className="h-[180px]">
                <WireGroupFrame {...renderContext(DEMO_DIAGRAM.nodes[3]!, true, 300, 180)} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="m-0 text-[15px] font-bold tracking-normal text-slate-950">Renderer contract</h3>
                <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                  {`function Card(ctx: WireNodeRenderContext) {
  return <div>{ctx.node.title}</div>;
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Panels and option controls</h2>
            <p className="m-0 text-[13px] text-slate-500">
              Panels compose under `WireProvider`, so custom sidebars can stay separate from card rendering.
            </p>
          </div>
          <WireProvider defaultDiagram={DEMO_DIAGRAM} validateOnChange>
            <div className="grid gap-4 lg:grid-cols-[280px_320px_minmax(220px,1fr)]">
              <WireNodeList includeGroups className="min-h-[320px]" />
              <WireOptionPanel catalog={AGENT_OPTIONS} nodeId="plan" />
              <div className="grid content-start gap-3">
                <WireValidationPanel />
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="m-0 text-[15px] font-bold tracking-normal text-slate-950">Option catalog</h3>
                  <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                    {`const options: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select" },
    { key: "temperature", type: "number", min: 0, max: 2 }
  ]
};`}
                  </pre>
                </div>
              </div>
            </div>
          </WireProvider>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-normal text-slate-950">Event surface</h2>
            <p className="m-0 text-[13px] text-slate-500">
              Canvas, card, and list interactions emit Wire events that product sidebars can subscribe to.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="m-0 text-[15px] font-bold tracking-normal text-slate-950">Controlled inspector pattern</h3>
              <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {`const [inspectNodeId, setInspectNodeId] = useState<string>();

<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  optionCatalog={options}
  inspectNodeId={inspectNodeId}
  onInspectNodeChange={setInspectNodeId}
/>;`}
              </pre>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="m-0 text-[15px] font-bold tracking-normal text-slate-950">Live event log</h3>
              <div className="mt-3 grid max-h-[220px] gap-2 overflow-auto">
                {events.length === 0 ? (
                  <div className="rounded-md bg-slate-100 px-3 py-2 text-[13px] text-slate-500">
                    Click a card, edge, node list row, or canvas area in the workspace.
                  </div>
                ) : events.map((event, index) => (
                  <div key={`${event}-${index}`} className="rounded-md bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
                    {event}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function renderContext(
  node: WireNode,
  selected = false,
  width = 220,
  height = 120
): WireNodeRenderContext {
  const tone = (node.tone ?? (node.kind === "ai" ? "ai" : "default")) as WireNodeRenderContext["tone"];

  return {
    node,
    data: {
      title: node.title,
      description: node.description,
      kind: node.kind,
      tone,
      wire: node
    },
    kind: node.kind,
    tone,
    theme: {
      border: "#cbd5e1",
      background: "#ffffff",
      accent: "#475569"
    },
    selected,
    width,
    height,
    options: wireNodeOptions(node),
    optionSpecs: wireOptionSpecsForNode(AGENT_OPTIONS, node)
  };
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
