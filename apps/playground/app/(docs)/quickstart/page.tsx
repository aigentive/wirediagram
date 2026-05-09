"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { Callout } from "../_components/Callout";
import { CodeBlock } from "../_components/CodeBlock";
import { CodePreview } from "../_components/CodePreview";
import {
  ActionNode,
  AINode,
  Flow,
  TriggerNode,
  WireCanvas,
  WireOptionPanel,
  WireProvider,
  WireWorkspace,
  type WireDiagram,
  type WireEvent,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const QUICKSTART_DIAGRAM: WireDiagram = {
  version: 1,
  id: "agent-chain",
  layout: "LR",
  nodes: [
    { id: "in", kind: "trigger", title: "Webhook", data: { options: { event: "ticket.created" } } },
    { id: "ai", kind: "ai", title: "Plan answer", from: "in", model: "gpt-5.4-mini", data: { options: { mode: "plan", temperature: 0.3 } } },
    { id: "out", kind: "action", title: "Send reply", from: "ai", tone: "success", data: { options: { channel: "email" } } }
  ],
  edges: []
};

const QUICKSTART_OPTIONS: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select", options: ["gpt-5.4-mini", "gpt-4.1-mini", "o4-mini"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1 }
  ],
  action: [
    { key: "channel", type: "select", options: ["email", "chat", "ticket", "slack"] }
  ]
};

const VIEWER_SNIPPET = `"use client";

import {
  WireProvider,
  WireCanvas,
  type WireDiagram
} from "@aigentive/wire-react";

const diagram: WireDiagram = {
  version: 1,
  id: "agent-chain",
  layout: "LR",
  nodes: [
    { id: "in",  kind: "trigger", title: "Webhook" },
    { id: "ai",  kind: "ai",      title: "Plan answer", from: "in", model: "gpt-5.4-mini" },
    { id: "out", kind: "action",  title: "Send reply",  from: "ai", tone: "success" }
  ],
  edges: []
};

export function AgentDiagram() {
  return (
    <div style={{ height: 320 }}>
      <WireProvider defaultDiagram={diagram}>
        <WireCanvas
          mode="view"
          fitView
          fitViewPadding={0.2}
          showControls={false}
          showMiniMap={false}
        />
      </WireProvider>
    </div>
  );
}`;

const OPTIONS_SNIPPET = `"use client";

import { useCallback, useState } from "react";
import {
  WireProvider,
  WireCanvas,
  WireOptionPanel,
  type WireEvent,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const options: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select",
      options: ["gpt-5.4-mini", "gpt-4.1-mini", "o4-mini"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1 }
  ],
  action: [
    { key: "channel", type: "select",
      options: ["email", "chat", "ticket", "slack"] }
  ]
};

export function AgentEditor({ diagram }) {
  const [openId, setOpenId] = useState<string>();

  const onEvent = useCallback((event: WireEvent) => {
    if (event.type === "node.click") setOpenId(event.nodeId);
    else if (event.type === "pane.click") setOpenId(undefined);
  }, []);

  return (
    <WireProvider defaultDiagram={diagram} validateOnChange onEvent={onEvent}>
      <div className="grid grid-cols-[1fr_320px]">
        <WireCanvas mode="view" fitView />
        {openId ? (
          <aside className="border-l p-4">
            <WireOptionPanel catalog={options} nodeId={openId} />
          </aside>
        ) : null}
      </div>
    </WireProvider>
  );
}`;

const WORKSPACE_SNIPPET = `"use client";

import { useState } from "react";
import {
  WireWorkspace,
  type WireDiagram,
  type WireOptionCatalog
} from "@aigentive/wire-react";

export function FullEditor({ initial, options }: {
  initial: WireDiagram;
  options: WireOptionCatalog;
}) {
  const [diagram, setDiagram] = useState(initial);

  return (
    <WireWorkspace
      diagram={diagram}
      onChange={setDiagram}
      optionCatalog={options}
      onEvent={(e) => console.log(e.source, e.type)}
    />
  );
}`;

const JSX_SNIPPET = `import {
  Flow,
  TriggerNode,
  AINode,
  ActionNode
} from "@aigentive/wire-react";

export function AgentDiagram() {
  return (
    <Flow layout="LR">
      <TriggerNode id="in"  title="Webhook" />
      <AINode      id="ai"  title="Plan answer" from="in"  model="gpt-5.4-mini" />
      <ActionNode  id="out" title="Send reply"  from="ai"  tone="success" />
    </Flow>
  );
}`;

export default function QuickstartPage() {
  return (
    <DocsPage
      eyebrow="Get started"
      title="Quickstart"
      description="Pick the API path, drop a canvas into a page, and react to events."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Quickstart" }]}
      next={{ href: "/concepts", label: "How Wire thinks" }}
    >
      <Prose>
        <h2 id="pick-an-api-path">Pick an API path</h2>
        <p>
          Three entry points, same canonical diagram. Pick the one that matches the surface you&rsquo;re building; you
          can mix-and-match as you go.
        </p>
        <ul>
          <li>
            <strong>Embed / read-only.</strong> <InlineCode>WireProvider</InlineCode> +{" "}
            <InlineCode>WireCanvas</InlineCode> in <InlineCode>mode=&quot;view&quot;</InlineCode>. This is what every
            card on the <Link href="/examples/layouts">Layouts</Link> page does.
          </li>
          <li>
            <strong>Custom editor.</strong> <InlineCode>WireProvider</InlineCode> +{" "}
            <InlineCode>WireCanvas</InlineCode> in <InlineCode>mode=&quot;edit&quot;</InlineCode>, plus{" "}
            <InlineCode>WireOptionPanel</InlineCode> in a modal or sidebar — see{" "}
            <Link href="/examples/click-modal">Click → modal</Link> and{" "}
            <Link href="/examples/click-sidebar">Click → sidebar</Link>.
          </li>
          <li>
            <strong>Full editor shell.</strong> <InlineCode>WireWorkspace</InlineCode> bundles provider + sidebar +
            canvas + inspector for the &ldquo;drop in and ship&rdquo; case.
          </li>
        </ul>

        <h2 id="minimal-viewer">Minimal viewer</h2>
        <p>
          A <InlineCode>WireDiagram</InlineCode> is a plain object. Pass it to{" "}
          <InlineCode>WireProvider</InlineCode>, render <InlineCode>WireCanvas</InlineCode>, set a height on the
          parent — that&rsquo;s the whole pattern.
        </p>
      </Prose>
      <CodePreview
        snippet={VIEWER_SNIPPET}
        preview={<MinimalViewerPreview />}
        height={320}
      />

      <Callout tone="tip" title="fitView and padding">
        <InlineCode>fitView</InlineCode> auto-zooms to bounds on first paint;{" "}
        <InlineCode>fitViewPadding</InlineCode> (0–1) adds breathing room. Toggle{" "}
        <InlineCode>showControls</InlineCode> and <InlineCode>showMiniMap</InlineCode> off for embed contexts.
      </Callout>

      <Prose>
        <h2 id="typed-options">Add typed options + click-to-inspect</h2>
        <p>
          Declare a <InlineCode>WireOptionCatalog</InlineCode> once. <InlineCode>WireOptionPanel</InlineCode> renders
          the form for whichever node you point it at and dispatches <InlineCode>node.patch</InlineCode> actions back
          into the diagram on edit. Wire <InlineCode>onEvent</InlineCode> on{" "}
          <InlineCode>WireProvider</InlineCode> to track the clicked node.
        </p>
      </Prose>
      <CodePreview
        snippet={OPTIONS_SNIPPET}
        preview={<ClickInspectPreview />}
        height={400}
      />

      <Callout tone="info" title="Where state lives">
        <InlineCode>WireOptionPanel</InlineCode> reads the active node from{" "}
        <InlineCode>WireProvider</InlineCode> context — there&rsquo;s no prop drilling. The{" "}
        <InlineCode>storage</InlineCode> field on each option spec decides whether the value lands on the node itself
        (top-level, like <InlineCode>model</InlineCode>) or in <InlineCode>node.data</InlineCode>.
      </Callout>

      <Prose>
        <h2 id="full-editor">Full editor shell</h2>
        <p>
          When you want the bundled experience — palette + canvas + inspector + validation panel — drop in{" "}
          <InlineCode>WireWorkspace</InlineCode>. It&rsquo;s a controlled component: pass{" "}
          <InlineCode>diagram</InlineCode> + <InlineCode>onChange</InlineCode> and you keep the source of truth.
        </p>
      </Prose>
      <CodePreview
        snippet={WORKSPACE_SNIPPET}
        preview={<WorkspacePreview />}
        height={520}
      />

      <Prose>
        <h2 id="jsx-facade">Author in JSX</h2>
        <p>
          Sometimes you want the diagram to live next to the component that owns it. The{" "}
          <InlineCode>{`<Flow>`}</InlineCode> facade compiles a tree of node markers into canonical JSON; the same
          renderer takes it from there.
        </p>
      </Prose>
      <CodePreview
        snippet={JSX_SNIPPET}
        preview={<JsxFlowPreview />}
        height={260}
      />

      <Prose>
        <h2 id="headless-compile">Headless compile</h2>
        <p>
          <InlineCode>{`<Flow>`}</InlineCode> has two modes. <InlineCode>mode=&quot;svg&quot;</InlineCode> (the default
          shown above) renders inline SVG. <InlineCode>mode=&quot;json&quot;</InlineCode> renders nothing and instead
          fires <InlineCode>onCompile</InlineCode> with the canonical <InlineCode>WireDiagram</InlineCode> — perfect
          for capturing the JSON to save, send to an MCP server, or hand off to your own renderer.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`import {
  Flow,
  TriggerNode,
  AINode,
  ActionNode,
  type WireDiagram
} from "@aigentive/wire-react";

export function CompileOnly({ onSave }: { onSave: (d: WireDiagram) => void }) {
  return (
    <Flow mode="json" onCompile={onSave}>
      <TriggerNode id="in"  title="Webhook" />
      <AINode      id="ai"  title="Plan answer" from="in"  model="gpt-5.4-mini" />
      <ActionNode  id="out" title="Send reply"  from="ai"  tone="success" />
    </Flow>
  );
}`}
      </CodeBlock>

      <Callout tone="tip" title="Or grab it via hook">
        If you&rsquo;re already inside a React tree, <InlineCode>useWireDiagram(flowElement)</InlineCode> compiles a
        Flow element to JSON synchronously without mounting it — useful when you want to feed the JSON into{" "}
        <InlineCode>WireProvider</InlineCode> or a custom canvas.
      </Callout>

      <Prose>
        <h2 id="next">Where next</h2>
        <ul>
          <li>
            <Link href="/concepts">Concepts</Link> — the diagram shape, action reducer, and event surface.
          </li>
          <li>
            <Link href="/customize/cards">Customize cards</Link> — replace the default node renderer.
          </li>
          <li>
            <Link href="/listen">Listen</Link> — the full <InlineCode>onEvent</InlineCode> surface.
          </li>
          <li>
            <Link href="/examples/layouts">Examples</Link> — three layouts plus modal/sidebar interactions, all live
            on this site.
          </li>
        </ul>
      </Prose>
    </DocsPage>
  );
}

function MinimalViewerPreview() {
  return (
    <WireProvider defaultDiagram={QUICKSTART_DIAGRAM}>
      <WireCanvas
        mode="view"
        fitView
        fitViewPadding={0.2}
        showControls={false}
        showMiniMap={false}
      />
    </WireProvider>
  );
}

function ClickInspectPreview() {
  const [openId, setOpenId] = useState<string | undefined>();

  const onEvent = useCallback((event: WireEvent) => {
    if (event.type === "node.click" || event.type === "node.inspect") setOpenId(event.nodeId);
    else if (event.type === "pane.click") setOpenId(undefined);
  }, []);

  return (
    <WireProvider defaultDiagram={QUICKSTART_DIAGRAM} validateOnChange onEvent={onEvent}>
      <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative">
          <WireCanvas
            mode="view"
            fitView
            fitViewPadding={0.2}
            showControls={false}
            showMiniMap={false}
          />
        </div>
        {openId ? (
          <aside className="overflow-auto border-l border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <WireOptionPanel catalog={QUICKSTART_OPTIONS} nodeId={openId} />
          </aside>
        ) : (
          <aside className="grid place-items-center border-l border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            Click a node to inspect
          </aside>
        )}
      </div>
    </WireProvider>
  );
}

function WorkspacePreview() {
  const [diagram, setDiagram] = useState<WireDiagram>(QUICKSTART_DIAGRAM);

  return (
    <WireWorkspace
      diagram={diagram}
      onChange={setDiagram}
      optionCatalog={QUICKSTART_OPTIONS}
    />
  );
}

function JsxFlowPreview() {
  return (
    <div className="grid h-full place-items-center overflow-auto p-3 [&_svg]:max-h-full [&_svg]:max-w-full">
      <Flow layout="LR">
        <TriggerNode id="in" title="Webhook" />
        <AINode id="ai" title="Plan answer" from="in" model="gpt-5.4-mini" />
        <ActionNode id="out" title="Send reply" from="ai" tone="success" />
      </Flow>
    </div>
  );
}
