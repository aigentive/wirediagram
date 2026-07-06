"use client";

import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";
import {
  WireNodeCardView,
  wireNodeOptions,
  wireOptionSpecsForNode,
  type WireNodeRenderContext,
  type WireOptionCatalog
} from "@aigentive/wire-react";
import type { WireNode } from "@aigentive/wire-core";
import type { ReactNode } from "react";

const CATALOG: WireOptionCatalog = {
  ai: [
    { key: "model", storage: "node", type: "select", options: ["fast-model", "balanced-model"] },
    { key: "temperature", type: "number", min: 0, max: 2, step: 0.1 }
  ],
  trigger: [{ key: "event", type: "text" }],
  tool: [{ key: "ref", storage: "node" }]
};

const SAMPLE_NODES: WireNode[] = [
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
    model: "fast-model",
    data: { options: { mode: "plan", temperature: 0.3 } }
  },
  {
    id: "update-ticket",
    kind: "tool",
    title: "Update ticket",
    ref: "zendesk.update_ticket",
    data: { options: { requiresApproval: true } }
  }
];

function makeContext(
  node: WireNode,
  options: { selected?: boolean; tone?: WireNodeRenderContext["tone"] } = {}
): WireNodeRenderContext {
  const tone = options.tone
    ?? (node.tone ?? (node.kind === "ai" ? "ai" : "default")) as WireNodeRenderContext["tone"];
  return {
    node,
    data: { title: node.title, description: node.description, kind: node.kind, tone, wire: node },
    kind: node.kind,
    tone,
    theme: { border: "#cbd5e1", background: "#ffffff", accent: "#475569" },
    selected: options.selected ?? false,
    width: 220,
    height: 140,
    options: wireNodeOptions(node),
    optionSpecs: wireOptionSpecsForNode(CATALOG, node)
  };
}

const TONE_LABELS: Array<{ tone: WireNodeRenderContext["tone"]; caption: string }> = [
  { tone: "default", caption: "Neutral · the default" },
  { tone: "success", caption: "Success" },
  { tone: "warning", caption: "Warning" },
  { tone: "error", caption: "Error" },
  { tone: "info", caption: "Info" },
  { tone: "ai", caption: "AI" }
];

export default function CardsCustomizePage() {
  return (
    <DocsPage
      eyebrow="Customize"
      title="Custom node cards"
      description="Replace the default card per kind, or globally. The render callback receives the same context the default uses."
      crumbs={[
        { href: "/docs", label: "Docs" },
        { label: "Customize" },
        { label: "Cards" }
      ]}
      next={{ href: "/docs/listen", label: "Listen to events" }}
    >
      <Prose>
        <h2 id="default">
          The default: <InlineCode>WireNodeCardView</InlineCode>
        </h2>
        <p>
          <InlineCode>WireNodeCardView</InlineCode> is exported from <InlineCode>@aigentive/wire-react</InlineCode> and
          drives every card unless you override <InlineCode>renderNodeCard</InlineCode>. It shows a kind chip, the
          node title, a subtitle (model, ref, or description depending on kind), and a one-line summary of the first
          two option values. It honors selection with a blue ring and follows the page theme.
        </p>
        <p>
          You can call it directly inside your own renderer when you only want to <em>extend</em> the default — for
          example, wrap it with a header band:
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`import { WireNodeCardView, type WireNodeRenderContext } from "@aigentive/wire-react";

function BannerCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid gap-1">
      <span className="rounded-t-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase">
        beta
      </span>
      <WireNodeCardView {...ctx} />
    </div>
  );
}`}
      </CodeBlock>

      <Showcase
        rows={[
          { card: <WireNodeCardView {...makeContext(SAMPLE_NODES[0]!, {})} />, caption: "trigger · single option" },
          { card: <WireNodeCardView {...makeContext(SAMPLE_NODES[1]!, { selected: true })} />, caption: "ai · selected · model + temperature" },
          { card: <WireNodeCardView {...makeContext(SAMPLE_NODES[2]!, {})} />, caption: "tool · ref + requiresApproval" }
        ]}
      />

      <Prose>
        <h2 id="tones">Built-in tones</h2>
        <p>
          Each card carries a <InlineCode>tone</InlineCode>. The inspector&rsquo;s <em>Card style</em> dropdown sets it
          (Neutral is the default). Tones drive fill, border, and text colour together; for arbitrary colours, switch
          to <em>Custom</em> and edit fill / border / text directly.
        </p>
      </Prose>

      <Showcase
        rows={TONE_LABELS.map(({ tone, caption }) => ({
          card: (
            <WireNodeCardView
              {...makeContext(SAMPLE_NODES[1]!, { tone })}
            />
          ),
          caption
        }))}
      />

      <Prose>
        <h2 id="when">When to customize</h2>
        <ul>
          <li>You want a different visual surface (denser, monospace, branded color).</li>
          <li>You need to render runtime status — an outage badge, a queue depth.</li>
          <li>The kind needs a unique layout: a tool card with an input/output preview, an AI card with token cost.</li>
        </ul>
        <p>
          You don't need a custom renderer to add badges, meta rows, progress, or footers — set those on
          <InlineCode>node.data.card</InlineCode> and the default card renders them.
        </p>

        <h2 id="custom">Three custom renderers</h2>
        <p>
          The same context, three different surfaces. Each is roughly 10–20 lines. None reach into canvas internals.
        </p>
      </Prose>

      <Showcase
        rows={[
          { card: <MinimalCard {...makeContext(SAMPLE_NODES[0]!, {})} />, caption: "Minimal — dashed border, centered, no shadow, no kind chip" },
          { card: <TerminalCard {...makeContext(SAMPLE_NODES[1]!, { selected: true })} />, caption: "Terminal — slate-950 surface, monospace, emerald accents" },
          { card: <RowCard {...makeContext(SAMPLE_NODES[2]!, {})} />, caption: "Row — kind dot, side-by-side meta, no shadow" }
        ]}
      />

      <Prose>
        <h3 id="minimal">Minimal</h3>
      </Prose>
      <CodeBlock language="tsx">
        {`function MinimalCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid h-[140px] content-center gap-1 rounded-lg border border-dashed
                    border-slate-300 bg-white px-4 py-3 text-center
                    dark:border-slate-700 dark:bg-slate-900">
      <span className="text-[10px] font-bold uppercase tracking-wider
                       text-slate-500">{ctx.kind}</span>
      <strong className="text-[14px] text-slate-950 dark:text-slate-50">{ctx.node.title}</strong>
      <span className="font-mono text-[11px] text-slate-400">minimal</span>
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h3 id="terminal">Terminal</h3>
      </Prose>
      <CodeBlock language="tsx">
        {`function TerminalCard(ctx: WireNodeRenderContext) {
  return (
    <div
      aria-selected={ctx.selected}
      className={\`grid h-[140px] content-start gap-1 rounded-lg border bg-slate-950
                  px-3.5 py-3 font-mono text-[12px] \${
        ctx.selected ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-700"
      }\`}
    >
      <span className="text-emerald-400">$ wire-{ctx.kind}</span>
      <strong className="text-emerald-100">{ctx.node.title}</strong>
      <span className="text-slate-500">id: {ctx.node.id}</span>
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h3 id="row">Row</h3>
      </Prose>
      <CodeBlock language="tsx">
        {`function RowCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid h-[140px] content-center gap-2 rounded-lg border border-slate-200
                    bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className={\`h-2 w-2 rounded-full \${kindDotClass(ctx.kind)}\`} />
        <span className="font-mono text-[11px] uppercase tracking-wider
                         text-slate-500">{ctx.kind}</span>
      </div>
      <strong className="text-[15px] text-slate-950">{ctx.node.title}</strong>
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="install">Wire it up</h2>
        <p>Pass your renderer to <InlineCode>WireWorkspace</InlineCode> or <InlineCode>WireCanvas</InlineCode>:</p>
      </Prose>
      <CodeBlock language="tsx">
        {`<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  optionCatalog={catalog}
  renderNodeCard={(ctx) =>
    ctx.kind === "ai" ? <TerminalCard {...ctx} /> : <RowCard {...ctx} />
  }
/>;`}
      </CodeBlock>

      <Callout tone="warn" title="Honor the contract">
        Set <InlineCode>aria-selected</InlineCode> when <InlineCode>ctx.selected</InlineCode> is true. Show the title.
        Don't strip the kind — users rely on it to scan the diagram. Match the page's dark mode.
      </Callout>

      <Prose>
        <h2 id="groups">Custom group frames</h2>
        <p>
          Groups (<InlineCode>kind: &quot;group&quot;</InlineCode>) are nodes too — they get their own renderer slot
          via <InlineCode>renderGroup</InlineCode>. The same <InlineCode>WireNodeRenderContext</InlineCode> arrives,
          plus the canvas sizes the frame to fit its children. Use it to brand stage boundaries, show stage status,
          or add a header strip with quick actions.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`function GroupFrame(ctx: WireNodeRenderContext) {
  return (
    <div
      aria-selected={ctx.selected}
      className={\`grid h-full content-start gap-1 rounded-lg border-2 border-dashed
                  bg-slate-50/60 p-3 dark:bg-slate-900/40 \${
        ctx.selected
          ? "border-blue-400 ring-2 ring-blue-400/20"
          : "border-slate-300 dark:border-slate-700"
      }\`}
      style={{ width: ctx.width, height: ctx.height }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider
                       text-slate-500 dark:text-slate-400">
        Stage · {ctx.node.title}
      </span>
    </div>
  );
}

<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  optionCatalog={catalog}
  renderNodeCard={Card}
  renderGroup={GroupFrame}
/>;`}
      </CodeBlock>

      <Callout tone="info" title="Children render on top">
        The canvas paints the group frame first, then layers child nodes (their own cards) above it. Don&rsquo;t paint
        opaque content over the full frame — children must remain visible.
      </Callout>
    </DocsPage>
  );
}

function Showcase({ rows }: { rows: Array<{ card: ReactNode; caption: string }> }) {
  return (
    <div className="not-prose grid gap-3 sm:grid-cols-3">
      {rows.map((row, index) => (
        <div key={index} className="grid gap-1.5">
          {row.card}
          <span className="text-[11px] leading-snug text-wire-tertiary">{row.caption}</span>
        </div>
      ))}
    </div>
  );
}

function MinimalCard(ctx: WireNodeRenderContext) {
  return (
    <div className="grid h-[140px] content-center gap-1 rounded-lg border border-dashed border-wire bg-wire-surface px-4 py-3 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-wire-tertiary">{ctx.kind}</span>
      <strong className="text-[14px] text-wire-primary">{ctx.node.title}</strong>
      <span className="font-mono text-[11px] text-wire-muted">minimal</span>
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
    <div className="grid h-[140px] content-center gap-2 rounded-lg border border-wire bg-wire-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${kindDotClass(ctx.kind)}`} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-wire-tertiary">{ctx.kind}</span>
      </div>
      <strong className="text-[15px] leading-tight text-wire-primary">{ctx.node.title}</strong>
      <span className="text-[11px] text-wire-tertiary">row · custom renderer</span>
    </div>
  );
}

function kindDotClass(kind: WireNode["kind"]): string {
  switch (kind) {
    case "ai":
      return "bg-violet-500";
    case "tool":
      return "bg-cyan-500";
    case "retrieval":
      return "bg-blue-500";
    case "trigger":
      return "bg-emerald-500";
    case "action":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}
