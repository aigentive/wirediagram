"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  type WireEventSource,
  type WireNodeListRenderContext,
  type WireNodeRenderContext,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const AGENT_OPTIONS: WireOptionCatalog = {
  "*": [
    { key: "owner", label: "Owner", storage: "data", placeholder: "support-platform" }
  ],
  trigger: [{ key: "event", label: "Event", placeholder: "ticket.created" }],
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
  metadata: { wireReact: { sample: "components" } }
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
  { id: "webhook", kind: "trigger", title: "Ticket webhook", data: { options: { event: "ticket.created" } } },
  { id: "plan", kind: "ai", title: "Plan answer", model: "gpt-4.1", data: { options: { mode: "plan", temperature: 0.3 } } },
  { id: "retrieve", kind: "retrieval", title: "Retrieve context", data: { options: { index: "kb-production", topK: 5 } } },
  { id: "update-ticket", kind: "tool", title: "Update ticket", ref: "zendesk.update_ticket", data: { options: { requiresApproval: true } } },
  { id: "respond", kind: "action", title: "Send response", tone: "success", data: { options: { channel: "email" } } },
  { id: "done", kind: "end", title: "Close workflow", description: "Terminal state" }
];

const TASK_CARD_NODE: WireNode = {
  id: "review-mode",
  kind: "human",
  title: "Review default",
  data: {
    card: {
      title: "Switch default to reviewed mode and make QA fail-closed",
      description: "Change default `reviewMode` from `fast` to `reviewed` in config. Make QA fail closed when required checks are missing.",
      badges: [{ label: "Regular" }],
      progress: { value: 1, max: 1, steps: 8, showPercent: true }
    }
  }
};

const STYLE_ITEMS: Array<{ tag: string; title: string; detail: string }> = [
  {
    tag: "Surface",
    title: "Plain panels",
    detail: "White panels in light, slate-900 in dark, slate borders, soft shadow, radius ≤ 8px. No colored left-border stripes."
  },
  {
    tag: "Status",
    title: "Badges, not borders",
    detail: "Use kind chips, ring states, and inline text for state. State never lives on a card edge."
  },
  {
    tag: "Form",
    title: "Typed options",
    detail: "Option specs declare type, range, and choices. Wire generates fields and patches via actions."
  },
  {
    tag: "Layout",
    title: "Group frames",
    detail: "Groups frame children. Card positions stay valid because the group is just another Wire node."
  }
];

type ComponentCategory = "Shell" | "Canvas" | "Renderer" | "Panel";

type TabId =
  | "overview"
  | "workspace"
  | "cards"
  | "panels"
  | "events"
  | "components"
  | "capabilities"
  | "reference";

const TABS: Array<{ id: TabId; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Quickstart and what's in the box" },
  { id: "workspace", label: "Workspace", description: "The live editor shell" },
  { id: "cards", label: "Cards", description: "Default, structured, and custom node renderers" },
  { id: "panels", label: "Panels", description: "List, options, validation, option catalog" },
  { id: "events", label: "Events", description: "Five event types, click recipes, live log" },
  { id: "components", label: "Components", description: "Index of exports" },
  { id: "capabilities", label: "Capabilities", description: "What you can customize" },
  { id: "reference", label: "Reference", description: "Style rules and external docs" }
];

const TAB_IDS = TABS.map((tab) => tab.id);

function isTabId(value: string): value is TabId {
  return (TAB_IDS as string[]).includes(value);
}

const COMPONENT_ROWS: Array<{
  name: string;
  category: ComponentCategory;
  role: string;
  props: string;
  href: TabId;
}> = [
  { name: "WireWorkspace", category: "Shell", role: "Complete editor shell", props: "diagram, onChange, optionCatalog, renderNodeCard, renderGroup, onEvent", href: "workspace" },
  { name: "WireCanvas", category: "Canvas", role: "Canvas primitive", props: "mode, fitView, showMiniMap, optionCatalog, renderNodeCard, renderGroup", href: "workspace" },
  { name: "WireNodeCardView", category: "Renderer", role: "Default node card", props: "WireNodeRenderContext (node, kind, selected, options, optionSpecs)", href: "cards" },
  { name: "WireGroupFrame", category: "Renderer", role: "Default group frame", props: "WireNodeRenderContext + children count", href: "cards" },
  { name: "WireOptionPanel", category: "Panel", role: "Typed options sidebar", props: "catalog, nodeId, title, className", href: "panels" },
  { name: "WireNodeList", category: "Panel", role: "Selectable node index", props: "includeGroups, inspectOnClick, selectOnClick, renderItem", href: "panels" },
  { name: "WireValidationPanel", category: "Panel", role: "Validation status", props: "className, style", href: "panels" }
];

const CAPABILITY_ROWS: Array<{
  capability: string;
  prop: string;
  scope: string;
  href: TabId;
}> = [
  { capability: "Light & dark theme", prop: "<html class=\"dark\">", scope: "Global", href: "overview" },
  { capability: "Custom node card", prop: "renderNodeCard={fn}", scope: "WireWorkspace, WireCanvas", href: "cards" },
  { capability: "Custom group frame", prop: "renderGroup={fn}", scope: "WireWorkspace, WireCanvas", href: "cards" },
  { capability: "Structured card content", prop: "node.data.card", scope: "Default WireNodeCardView", href: "cards" },
  { capability: "Custom list rows", prop: "renderItem={fn}", scope: "WireNodeList", href: "panels" },
  { capability: "Read-only canvas", prop: "mode=\"view\"", scope: "WireCanvas", href: "workspace" },
  { capability: "Controlled inspector", prop: "inspectNodeId / onInspectNodeChange", scope: "WireWorkspace", href: "events" },
  { capability: "Click behavior knobs", prop: "inspectOnClick / selectOnClick", scope: "WireNodeList, WireCanvas", href: "events" },
  { capability: "Validation observer", prop: "<WireValidationPanel/>", scope: "WireProvider context", href: "panels" },
  { capability: "Decoupled events", prop: "onEvent={fn}", scope: "WireWorkspace, WireProvider", href: "events" }
];

const STATS: Array<{ value: string; label: string }> = [
  { value: "7", label: "Components" },
  { value: "5", label: "Event types" },
  { value: "4", label: "Surfaces" },
  { value: "10", label: "Capabilities" }
];

const EVENT_REFERENCE: Array<{ type: WireEvent["type"]; sources: WireEventSource[]; payload: string; meaning: string }> = [
  { type: "node.click", sources: ["canvas", "node-list"], payload: "{ nodeId }", meaning: "Any pointer click on a node" },
  { type: "node.inspect", sources: ["canvas", "node-list"], payload: "{ nodeId }", meaning: "Open the inspector for this node" },
  { type: "edge.click", sources: ["canvas"], payload: "{ edgeId }", meaning: "Click on an edge polyline" },
  { type: "selection.change", sources: ["canvas", "node-list"], payload: "{ selection: { nodeIds, edgeIds } }", meaning: "Selection set changed" },
  { type: "pane.click", sources: ["canvas"], payload: "{}", meaning: "Click on empty canvas (deselect)" }
];

const SOURCE_FILTERS: Array<{ value: WireEventSource | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "canvas", label: "Canvas" },
  { value: "node-list", label: "List" }
];

const SOURCE_REFERENCE: Array<{ source: WireEventSource; status: string; emittedBy: string; notes: string }> = [
  { source: "canvas", status: "Built-in", emittedBy: "WireCanvas", notes: "Node, edge, pane, and selection events." },
  { source: "node-list", status: "Built-in", emittedBy: "WireNodeList", notes: "Row clicks and optional inspect/selection events." },
  { source: "node-card", status: "Reserved", emittedBy: "Custom app code", notes: "Use when an app-owned card wrapper emits events." },
  { source: "option-panel", status: "Reserved", emittedBy: "Custom app code", notes: "Use for app-specific option panel interactions." },
  { source: "validation-panel", status: "Reserved", emittedBy: "Custom app code", notes: "Use for app-specific validation panel interactions." },
  { source: "workspace", status: "Reserved", emittedBy: "Custom app code", notes: "Use for workspace-level events not tied to canvas/list." },
  { source: "api", status: "Reserved", emittedBy: "Programmatic code", notes: "Use for non-pointer or integration-driven emissions." }
];

const QUICKSTART_CODE = `import { WireWorkspace, type WireOptionCatalog } from "@aigentive/wire-react";

const options: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select",
      options: ["gpt-4.1", "gpt-4.1-mini"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1 }
  ]
};

export function AgentEditor({ diagram, setDiagram }) {
  return (
    <WireWorkspace
      diagram={diagram}
      onChange={setDiagram}
      optionCatalog={options}
      onEvent={(e) => console.log(e.type, e)}
    />
  );
}`;

const DOC_LINKS: Array<{ title: string; href: string; detail: string }> = [
  { title: "Component props reference", href: "https://github.com/aigentive/wire/blob/main/docs/REACT_COMPONENTS.md", detail: "All components, props, defaults, and option specs" },
  { title: "Package README", href: "https://github.com/aigentive/wire/blob/main/packages/wire-react/README.md", detail: "Install, JSX facade, Tailwind setup" },
  { title: "Wire schema", href: "https://github.com/aigentive/wire/blob/main/packages/wire-core/README.md", detail: "Canonical diagram, validation, layout" },
  { title: "Agent sample screen", href: "/samples/agent-chain", detail: "Wire-level card, group, and option rendering" }
];

type Theme = "light" | "dark";

export default function ComponentsPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [events, setEvents] = useState<Array<{ source: WireEventSource; line: string }>>([]);
  const [sourceFilter, setSourceFilter] = useState<WireEventSource | "all">("all");
  const [inspectOnClick, setInspectOnClick] = useState(true);
  const [selectOnClick, setSelectOnClick] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("wire-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("wire-theme", theme);
  }, [theme]);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (fromHash && isTabId(fromHash)) setActiveTab(fromHash);
    function onHash() {
      const next = window.location.hash.slice(1);
      if (next && isTabId(next)) setActiveTab(next);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goToTab = useCallback((id: TabId) => {
    if (window.location.hash.slice(1) !== id) {
      window.history.pushState(null, "", `#${id}`);
    }
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleEvent = useCallback((event: WireEvent) => {
    setEvents((current) => [{ source: event.source, line: describeEvent(event) }, ...current].slice(0, 24));
  }, []);

  const filteredEvents = useMemo(
    () => (sourceFilter === "all" ? events : events.filter((entry) => entry.source === sourceFilter)),
    [events, sourceFilter]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-[1440px] gap-3 px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <Link href="/" className="text-[12px] font-bold uppercase tracking-wider text-blue-700 no-underline dark:text-blue-300">
                Wire playground
              </Link>
              <h1 className="m-0 text-[26px] font-bold leading-tight tracking-tight">React component system</h1>
              <p className="m-0 max-w-[680px] text-[14px] leading-6 text-slate-600 dark:text-slate-400">
                A small surface for product apps and LLM-authored screens. Pass a diagram and an option catalog;
                customize renderers, list rows, click behavior, and theme.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle theme={theme} onChange={setTheme} />
              <Link
                href="/samples/agent-chain"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-bold text-slate-800 no-underline shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
              >
                Open agent sample
              </Link>
            </div>
          </div>
        </div>
      </header>

      <TabBar tabs={TABS} active={activeTab} onChange={goToTab} />

      <div className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 lg:px-8">
        {activeTab === "overview" ? (
          <OverviewTab />
        ) : activeTab === "workspace" ? (
          <WorkspaceTab onEvent={handleEvent} />
        ) : activeTab === "cards" ? (
          <CardsTab />
        ) : activeTab === "panels" ? (
          <PanelsTab onEvent={handleEvent} />
        ) : activeTab === "events" ? (
          <EventsTab
            events={events}
            filteredEvents={filteredEvents}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            inspectOnClick={inspectOnClick}
            setInspectOnClick={setInspectOnClick}
            selectOnClick={selectOnClick}
            setSelectOnClick={setSelectOnClick}
            onEvent={handleEvent}
            onClear={() => setEvents([])}
          />
        ) : activeTab === "components" ? (
          <ComponentsTab onJump={goToTab} />
        ) : activeTab === "capabilities" ? (
          <CapabilitiesTab onJump={goToTab} />
        ) : (
          <ReferenceTab />
        )}
      </div>
    </main>
  );
}

function TabBar({
  tabs,
  active,
  onChange
}: {
  tabs: typeof TABS;
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  const description = tabs.find((tab) => tab.id === active)?.description;
  return (
    <nav
      role="tablist"
      aria-label="Component system sections"
      className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-6 pt-2 lg:px-8">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`relative -mb-px rounded-t-md border-b-2 px-3 py-2 text-[12px] font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-slate-950 text-slate-950 dark:border-slate-50 dark:text-slate-50"
                    : "border-transparent text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {description ? (
          <p className="m-0 pb-2 text-[12px] text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
    </nav>
  );
}

function TabPanel({ id, children }: { id: TabId; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} className="grid gap-8">
      {children}
    </section>
  );
}

function TabHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <header className="grid gap-1">
      <h2 className="m-0 text-[20px] font-bold tracking-tight">{title}</h2>
      <p className="m-0 max-w-[760px] text-[13px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </header>
  );
}

function OverviewTab() {
  return (
    <TabPanel id="overview">
      <TabHeading
        title="Overview"
        description="The shortest path from npm install to a working editor — plus what you get out of the box."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-2">
          <SubLabel>Quickstart</SubLabel>
          <CodeBlock>{QUICKSTART_CODE}</CodeBlock>
        </div>
        <div className="grid content-start gap-3">
          <SubLabel>You get</SubLabel>
          <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px] leading-6 text-slate-700 dark:text-slate-300">
            <li>· Editor shell with sidebar, canvas, inspector</li>
            <li>· Default cards, groups, list rows, option fields</li>
            <li>· Validation status, undo/redo, selection state</li>
            <li>· Five decoupled event types via <Code>onEvent</Code></li>
            <li>· Light & dark theme tied to <Code>{`<html class="dark">`}</Code></li>
          </ul>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="grid gap-0.5">
                <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</dt>
                <dd className="m-0 text-xl font-bold tracking-tight">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </TabPanel>
  );
}

function WorkspaceTab({ onEvent }: { onEvent: (event: WireEvent) => void }) {
  return (
    <TabPanel id="workspace">
      <TabHeading
        title="Workspace shell"
        description={
          <>
            <Code>WireWorkspace</Code> composes a provider, sidebar, canvas, and inspector. Use{" "}
            <Code>layout=&quot;embedded&quot;</Code> inside a product page.
          </>
        }
      />
      <WorkspaceLegend />
      <EmitsBadge events={["node.click", "node.inspect", "edge.click", "selection.change", "pane.click"]} />
      <WireWorkspace
        defaultDiagram={WORKSPACE_DIAGRAM}
        defaultInspectNodeId="plan"
        optionCatalog={AGENT_OPTIONS}
        onEvent={onEvent}
        layout="embedded"
        title="Agent builder"
        subtitle="Cards, groups, options, validation, and events composed in one shell"
        canvasProps={{ fitView: true, fitViewPadding: 0.08, showMiniMap: false }}
      />
    </TabPanel>
  );
}

function CardsTab() {
  return (
    <TabPanel id="cards">
      <TabHeading
        title="Cards and groups"
        description="Default renderers receive WireNodeRenderContext. Replace them per kind without changing canonical JSON."
      />

      <div className="grid gap-3">
        <SubLabel>Default · WireNodeCardView</SubLabel>
        <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
          Kind chip, title, subtitle (model / ref / description), first two option values.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_NODES.map((node, index) => (
            <div key={node.id} className="min-h-[140px]">
              <WireNodeCardView {...renderContext(node, index === 1)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <SubLabel>Variant · structured card content</SubLabel>
        <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
          Set <Code>node.data.card</Code> with badges, meta, progress. The default card renders them — no custom function needed.
        </p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <WireNodeCardView
            {...renderContext(TASK_CARD_NODE, false, 380, 220)}
            className="min-h-[220px]"
          />
          <CodeBlock>
            {`data: {
  card: {
    title: "Switch default to reviewed mode",
    description: "Change reviewMode from fast to reviewed.",
    badges: [{ label: "Regular" }],
    progress: { value: 1, max: 1, steps: 8, showPercent: true }
  }
}`}
          </CodeBlock>
        </div>
      </div>

      <div className="grid gap-3">
        <SubLabel>Variant · custom renderers</SubLabel>
        <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
          Pass <Code>renderNodeCard</Code>. The function receives the same context the default uses.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantCard
            caption="Minimal — dashed border, centered, no shadow, no badges"
            card={<MinimalCard {...renderContext(CARD_NODES[0]!, false)} />}
          />
          <VariantCard
            caption="Terminal — slate-950, monospace, emerald accents"
            card={<TerminalCard {...renderContext(CARD_NODES[1]!, true)} />}
          />
          <VariantCard
            caption="Row — kind dot, side-by-side meta, no shadow"
            card={<RowCard {...renderContext(CARD_NODES[3]!, false)} />}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid gap-2">
          <SubLabel>Group frame</SubLabel>
          <div className="h-[180px]">
            <WireGroupFrame {...renderContext(DEMO_DIAGRAM.nodes[3]!, true, 300, 180)} />
          </div>
        </div>
        <div className="grid gap-2">
          <SubLabel>Renderer contract</SubLabel>
          <CodeBlock>
            {`function Card(ctx: WireNodeRenderContext) {
  return (
    <div aria-selected={ctx.selected}>
      <span>{ctx.kind}</span>
      <strong>{ctx.node.title}</strong>
    </div>
  );
}

<WireWorkspace renderNodeCard={Card} />;`}
          </CodeBlock>
        </div>
      </div>
    </TabPanel>
  );
}

function PanelsTab({ onEvent }: { onEvent: (event: WireEvent) => void }) {
  return (
    <TabPanel id="panels">
      <TabHeading
        title="Panels and option controls"
        description={
          <>
            Panels read off <Code>WireProvider</Code> context, so custom sidebars stay decoupled from card rendering.
          </>
        }
      />
      <WireProvider defaultDiagram={DEMO_DIAGRAM} validateOnChange onEvent={onEvent}>
        <div className="grid gap-6">
          <EmitsBadge events={["node.click", "node.inspect", "selection.change"]} from="WireNodeList rows" />

          <div className="grid gap-4 lg:grid-cols-[280px_320px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <SubLabel>WireNodeList · default rows</SubLabel>
              <WireNodeList includeGroups className="min-h-[300px]" />
            </div>
            <div className="grid gap-2">
              <SubLabel>WireOptionPanel</SubLabel>
              <WireOptionPanel catalog={AGENT_OPTIONS} nodeId="plan" />
            </div>
            <div className="grid content-start gap-2">
              <SubLabel>WireValidationPanel</SubLabel>
              <WireValidationPanel />
              <p className="m-0 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                Reads diagram and validation off context. Pair with a toolbar or status bar.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <SubLabel>Variant · custom list rows via renderItem</SubLabel>
            <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
              <Code>renderItem</Code> receives <Code>{`{ node, selected }`}</Code>. Click handling, keyboard, and event emission stay built-in.
            </p>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <WireNodeList className="min-h-[260px]" renderItem={renderCompactRow} />
              <CodeBlock>
                {`<WireNodeList
  renderItem={({ node, selected }) => (
    <span className="flex items-center gap-2">
      <span className={selected ? "dot-on" : "dot-off"} />
      <span className="kind">{node.kind}</span>
      <strong>{node.title}</strong>
    </span>
  )}
/>;`}
              </CodeBlock>
            </div>
          </div>

          <div className="grid gap-2">
            <SubLabel>Option catalog</SubLabel>
            <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
              Keys are node kinds or <Code>&quot;*&quot;</Code>. Specs declare type, range, and storage location.
            </p>
            <CodeBlock>
              {`const options: WireOptionCatalog = {
  "*": [{ key: "owner", storage: "data" }],
  ai: [
    { key: "model", storage: "node", type: "select",
      options: ["gpt-4.1", "o4-mini"] },
    { key: "temperature", type: "number",
      min: 0, max: 2, step: 0.1 }
  ]
};`}
            </CodeBlock>
          </div>
        </div>
      </WireProvider>
    </TabPanel>
  );
}

function EventsTab({
  events,
  filteredEvents,
  sourceFilter,
  setSourceFilter,
  inspectOnClick,
  setInspectOnClick,
  selectOnClick,
  setSelectOnClick,
  onEvent,
  onClear
}: {
  events: Array<{ source: WireEventSource; line: string }>;
  filteredEvents: Array<{ source: WireEventSource; line: string }>;
  sourceFilter: WireEventSource | "all";
  setSourceFilter: (value: WireEventSource | "all") => void;
  inspectOnClick: boolean;
  setInspectOnClick: (value: boolean) => void;
  selectOnClick: boolean;
  setSelectOnClick: (value: boolean) => void;
  onEvent: (event: WireEvent) => void;
  onClear: () => void;
}) {
  return (
    <TabPanel id="events">
      <TabHeading
        title="Event surface"
        description="Five Wire event types. Built-in components currently emit from canvas and node-list; the full source enum is listed below for custom integrations."
      />

      <div className="grid gap-2">
        <SubLabel>Event types</SubLabel>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2.5 font-extrabold">Type</th>
                <th className="px-4 py-2.5 font-extrabold">Meaning</th>
                <th className="px-4 py-2.5 font-extrabold">Sources</th>
                <th className="px-4 py-2.5 font-extrabold">Payload</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_REFERENCE.map((entry) => (
                <tr key={entry.type} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <td className="px-4 py-2.5 font-mono text-[12px] font-bold">{entry.type}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{entry.meaning}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {entry.sources.map((source) => (
                        <span key={source} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {source}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">{entry.payload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-2">
        <SubLabel>Source labels</SubLabel>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2.5 font-extrabold">Source</th>
                <th className="px-4 py-2.5 font-extrabold">Status</th>
                <th className="px-4 py-2.5 font-extrabold">Emitted by</th>
                <th className="px-4 py-2.5 font-extrabold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_REFERENCE.map((entry) => (
                <tr key={entry.source} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <td className="px-4 py-2.5 font-mono text-[12px] font-bold">{entry.source}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      entry.status === "Built-in"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{entry.emittedBy}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-3">
          <SubLabel>Click recipes</SubLabel>
          <CodeBlock>
            {`<WireWorkspace
  onEvent={(event) => {
    if (event.type === "node.inspect") {
      router.push(\`?node=\${event.nodeId}\`);
    } else if (event.type === "edge.click") {
      openEdgeInspector(event.edgeId);
    } else if (event.type === "selection.change") {
      setSelected(event.selection);
    }
  }}
/>;

<WireNodeList
  inspectOnClick={${inspectOnClick}}
  selectOnClick={${selectOnClick}}
  renderItem={({ node, selected }) => /* ... */}
/>;`}
          </CodeBlock>

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <SubLabel>Click behavior knobs</SubLabel>
            <Toggle
              checked={inspectOnClick}
              onChange={setInspectOnClick}
              label="inspectOnClick"
              detail="Emit node.inspect when a row is clicked"
            />
            <Toggle
              checked={selectOnClick}
              onChange={setSelectOnClick}
              label="selectOnClick"
              detail="Update selection (and emit selection.change)"
            />
            <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">
              Try the live row below — events appear in the log to the right.
            </p>
          </div>

          <WireProvider defaultDiagram={WORKSPACE_DIAGRAM} onEvent={onEvent}>
            <WireNodeList
              inspectOnClick={inspectOnClick}
              selectOnClick={selectOnClick}
              className="min-h-[160px]"
            />
          </WireProvider>
        </div>

        <div className="grid content-start gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SubLabel>Live event log</SubLabel>
            {events.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {SOURCE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSourceFilter(filter.value)}
                className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  sourceFilter === filter.value
                    ? "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-[420px] min-h-[240px] gap-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            {filteredEvents.length === 0 ? (
              <div className="grid place-items-center px-3 py-10 text-center text-[13px] text-slate-500 dark:text-slate-400">
                <div className="grid gap-1.5">
                  <strong className="text-slate-700 dark:text-slate-200">
                    {events.length === 0 ? "Waiting for events" : "No events match this filter"}
                  </strong>
                  <span>Click the row below or open the Workspace tab and click cards.</span>
                </div>
              </div>
            ) : (
              filteredEvents.map((entry, index) => (
                <div
                  key={`${entry.line}-${index}`}
                  className={`rounded px-2.5 py-1.5 font-mono text-[12px] ${
                    index % 2 === 0
                      ? "bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                      : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {entry.line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </TabPanel>
  );
}

function ComponentsTab({ onJump }: { onJump: (id: TabId) => void }) {
  return (
    <TabPanel id="components">
      <TabHeading
        title="Components"
        description="Seven exports do the work. Use the Demo button to switch to the live tab for that component."
      />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 font-extrabold">Component</th>
              <th className="px-4 py-3 font-extrabold">Category</th>
              <th className="px-4 py-3 font-extrabold">Role</th>
              <th className="px-4 py-3 font-extrabold">Props</th>
              <th className="px-4 py-3 font-extrabold text-right">Demo</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENT_ROWS.map((row) => (
              <tr key={row.name} className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 font-mono text-[13px] font-bold">{row.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${categoryBadgeClass(row.category)}`}>
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.role}</td>
                <td className="px-4 py-3 font-mono text-[12px] leading-5 text-slate-500 dark:text-slate-400">{row.props}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onJump(row.href)}
                    className="text-[12px] font-bold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    Open {labelForTab(row.href)} →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TabPanel>
  );
}

function CapabilitiesTab({ onJump }: { onJump: (id: TabId) => void }) {
  return (
    <TabPanel id="capabilities">
      <TabHeading
        title="Capabilities"
        description="Each row points to the prop or pattern that unlocks it and the tab where it's demonstrated."
      />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 font-extrabold">Capability</th>
              <th className="px-4 py-3 font-extrabold">How</th>
              <th className="px-4 py-3 font-extrabold">Where</th>
              <th className="px-4 py-3 font-extrabold text-right">Demo</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_ROWS.map((row) => (
              <tr key={row.capability} className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 font-bold">{row.capability}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-slate-700 dark:text-slate-300">{row.prop}</td>
                <td className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400">{row.scope}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onJump(row.href)}
                    className="text-[12px] font-bold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    Open {labelForTab(row.href)} →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TabPanel>
  );
}

function ReferenceTab() {
  return (
    <TabPanel id="reference">
      <TabHeading
        title="Reference"
        description="Visual rules the default renderers follow, plus links to the canonical markdown docs."
      />

      <div className="grid gap-3">
        <SubLabel>Style guide</SubLabel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STYLE_ITEMS.map((item) => (
            <article key={item.title} className="grid content-start gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {item.tag}
              </span>
              <h3 className="m-0 text-[15px] font-bold tracking-normal">{item.title}</h3>
              <p className="m-0 text-[13px] leading-5 text-slate-600 dark:text-slate-400">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <SubLabel>Documentation</SubLabel>
        <div className="grid gap-3 md:grid-cols-2">
          {DOC_LINKS.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              target={doc.href.startsWith("http") ? "_blank" : undefined}
              rel={doc.href.startsWith("http") ? "noreferrer" : undefined}
              className="grid gap-1 rounded-lg border border-slate-200 bg-white p-4 no-underline shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold text-slate-950 dark:text-slate-50">{doc.title}</span>
                <span aria-hidden className="text-slate-400 dark:text-slate-500">→</span>
              </div>
              <span className="text-[13px] text-slate-600 dark:text-slate-400">{doc.detail}</span>
            </a>
          ))}
        </div>
        <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
          Tailwind v4 consumers: include the package in <Code>@source</Code> and add <Code>@variant dark</Code> to opt into class-based dark mode.
        </p>
      </div>
    </TabPanel>
  );
}

function labelForTab(id: TabId): string {
  return TABS.find((tab) => tab.id === id)?.label ?? id;
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</span>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800 dark:bg-slate-800 dark:text-slate-100">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-100 dark:border-slate-800">
      {children}
    </pre>
  );
}

function EmitsBadge({ events, from }: { events: string[]; from?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-900">
      <span className="font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {from ? `${from} emits` : "Emits"}
      </span>
      <div className="flex flex-wrap gap-1">
        {events.map((event) => (
          <span
            key={event}
            className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200"
          >
            {event}
          </span>
        ))}
      </div>
      <span className="text-slate-500 dark:text-slate-400">→ open the Events tab to see the live log</span>
    </div>
  );
}

function VariantCard({ caption, card }: { caption: string; card: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {card}
      <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{caption}</span>
    </div>
  );
}

function WorkspaceLegend() {
  const slots: Array<{ label: string; detail: string }> = [
    { label: "Sidebar", detail: "WireNodeList" },
    { label: "Canvas", detail: "WireCanvas + renderers" },
    { label: "Inspector", detail: "WireOptionPanel + WireValidationPanel" }
  ];
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      {slots.map((slot) => (
        <div key={slot.label} className="grid gap-0.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{slot.label}</span>
          <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">{slot.detail}</span>
        </div>
      ))}
    </div>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (next: Theme) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {(["light", "dark"] as Theme[]).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={theme === option}
          onClick={() => onChange(option)}
          className={`rounded px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider ${
            theme === option
              ? "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-950"
              : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Toggle({
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
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-[16px] w-[16px] accent-blue-600"
      />
      <span className="grid gap-0.5">
        <span className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-100">{label}</span>
        {detail ? <span className="text-[11px] text-slate-500 dark:text-slate-400">{detail}</span> : null}
      </span>
    </label>
  );
}

function MinimalCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid h-[140px] content-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-900">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{ctx.kind}</span>
      <strong className="text-[14px] text-slate-950 dark:text-slate-50">{ctx.node.title}</strong>
      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">minimal</span>
    </div>
  );
}

function TerminalCard(ctx: WireNodeRenderContext) {
  return (
    <div
      aria-selected={ctx.selected}
      className={`grid h-[140px] content-start gap-1 rounded-lg border bg-slate-950 px-3.5 py-3 font-mono text-[12px] ${
        ctx.selected ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-700"
      }`}
    >
      <span className="text-emerald-400">$ wire-{ctx.kind}</span>
      <strong className="text-emerald-100">{ctx.node.title}</strong>
      <span className="text-slate-500">id: {ctx.node.id}</span>
      <span className="text-slate-500">terminal</span>
    </div>
  );
}

function RowCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid h-[140px] content-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${kindDotClass(ctx.kind)}`} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{ctx.kind}</span>
      </div>
      <strong className="text-[15px] leading-tight text-slate-950 dark:text-slate-50">{ctx.node.title}</strong>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">row · custom renderer</span>
    </div>
  );
}

function renderCompactRow({ node, selected }: WireNodeListRenderContext) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-300 dark:bg-slate-600"}`} />
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{node.kind}</span>
      <span className="text-[13px] font-bold text-slate-950 dark:text-slate-50">{node.title}</span>
    </span>
  );
}

function categoryBadgeClass(category: ComponentCategory): string {
  switch (category) {
    case "Shell": return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "Canvas": return "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300";
    case "Renderer": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "Panel": return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function kindDotClass(kind: WireNode["kind"]): string {
  switch (kind) {
    case "ai": return "bg-violet-500";
    case "tool": return "bg-cyan-500";
    case "retrieval": return "bg-blue-500";
    case "trigger": return "bg-emerald-500";
    case "action": return "bg-amber-500";
    default: return "bg-slate-400";
  }
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
    theme: { border: "#cbd5e1", background: "#ffffff", accent: "#475569" },
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
