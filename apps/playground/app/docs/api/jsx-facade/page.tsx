import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";

export const metadata = { title: "API · JSX facade · Wire docs" };

const NODE_COMPONENTS: Array<{ component: string; kind: string; extras: string }> = [
  { component: "<TriggerNode>", kind: "trigger", extras: "—" },
  { component: "<ActionNode>", kind: "action", extras: "—" },
  { component: "<AINode>", kind: "ai", extras: "model?, prompt?, tools?" },
  { component: "<ToolNode>", kind: "tool", extras: "ref?" },
  { component: "<ConditionNode>", kind: "condition", extras: "branches: string[] (required)" },
  { component: "<HumanNode>", kind: "human", extras: "—" },
  { component: "<MemoryNode>", kind: "memory", extras: "—" },
  { component: "<RetrievalNode>", kind: "retrieval", extras: "—" },
  { component: "<GuardrailNode>", kind: "guardrail", extras: "—" },
  { component: "<EndNode>", kind: "end", extras: "—" },
  { component: "<Note>", kind: "note", extras: "body? or children, attachedTo?" },
  { component: "<Group>", kind: "group", extras: "children become members; parent auto-set" }
];

const BASE_PROPS: Array<{ prop: string; type: string; purpose: string }> = [
  { prop: "id", type: "string", purpose: "Stable identifier. Required if other nodes reference this one." },
  { prop: "title", type: "string", purpose: "Display title shown in cards, lists, and SVG." },
  { prop: "description", type: "string", purpose: "Optional subtitle / longer text rendered by some cards." },
  { prop: "tone", type: "\"default\" | \"success\" | \"warning\" | \"error\" | \"info\" | \"ai\"", purpose: "Visual tone for the card." },
  { prop: "from", type: "string | string[]", purpose: "Source node(s) for the implicit edge. Use `id.branch` from a condition." },
  { prop: "after", type: "string | string[]", purpose: "Alias for `from`. Pick whichever reads better." },
  { prop: "attachedTo", type: "string", purpose: "Notes/annotations only — visual association with a target node." },
  { prop: "parent", type: "string", purpose: "Group nesting. Set automatically when nested inside `<Group>`." },
  { prop: "data", type: "Record<string, unknown>", purpose: "Free-form data bag. `data.options` is where most option values land." },
  { prop: "position", type: "{ x: number; y: number }", purpose: "Manual position. Layout engine fills in when omitted." },
  { prop: "size", type: "{ width: number; height: number }", purpose: "Manual size. Defaults to renderer-measured dimensions." }
];

const FLOW_PROPS: Array<{ prop: string; type: string; purpose: string }> = [
  { prop: "layout", type: "\"LR\" | \"TB\" | \"RL\" | \"BT\"", purpose: "Layout direction (default LR)." },
  { prop: "id", type: "string", purpose: "Diagram id stamped onto the compiled JSON." },
  { prop: "title", type: "string", purpose: "Diagram title." },
  { prop: "mode", type: "\"svg\" | \"json\"", purpose: "Render mode. Default `svg`. Use `json` for headless compile." },
  { prop: "onCompile", type: "(diagram: WireDiagram) => void", purpose: "Receives the canonical compiled JSON whenever Flow renders with a callback. Pair with `mode=\"json\"` to capture without rendering." },
  { prop: "className", type: "string", purpose: "Class on the wrapping element (svg or div) for styling hooks." }
];

export default function ApiJsxFacadePage() {
  return (
    <DocsPage
      eyebrow="Reference"
      title="JSX facade"
      description="Author Wire diagrams as React children of <Flow>. The walker compiles the tree to canonical JSON and either renders inline SVG or hands the JSON back through onCompile."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Reference" }, { label: "JSX facade" }]}
      next={{ href: "/docs/api/hooks", label: "API · Hooks" }}
    >
      <Prose>
        <h2 id="example">Example</h2>
        <p>
          Each node component is a marker — it doesn&rsquo;t render anything itself. <InlineCode>{`<Flow>`}</InlineCode>{" "}
          walks its children, compiles them to a <InlineCode>WireDiagram</InlineCode>, and renders SVG (default) or
          fires <InlineCode>onCompile</InlineCode> in JSON mode.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`import {
  Flow,
  TriggerNode,
  AINode,
  ConditionNode,
  ActionNode,
  Note,
  Group
} from "@aigentive/wire-react";

export function SupportAgent() {
  return (
    <Flow layout="LR" id="support-agent" title="Support agent">
      <TriggerNode id="webhook" title="Webhook fires" />
      <AINode id="classify" title="Classify intent" from="webhook" model="gpt-5.4-mini" />
      <ConditionNode
        id="route"
        title="Route request"
        from="classify"
        branches={["sales", "support", "other"]}
      />
      <ActionNode id="notify-sales" title="Notify sales" from="route.sales" tone="success" />
      <ActionNode id="open-ticket" title="Open ticket"  from="route.support" tone="warning" />
      <Note id="risk-note" title="Routing risk" attachedTo="classify">
        Check confidence before routing.
      </Note>
    </Flow>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="components">Node components</h2>
        <p>
          Twelve marker components, one per <InlineCode>kind</InlineCode>. The compile walker maps each to a node in
          the canonical diagram.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Component</th>
              <th className="px-4 py-2.5 font-bold">Wire kind</th>
              <th className="px-4 py-2.5 font-bold">Extra props</th>
            </tr>
          </thead>
          <tbody>
            {NODE_COMPONENTS.map((row) => (
              <tr key={row.component} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.component}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">{row.kind}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-700 dark:text-slate-300">{row.extras}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h3 id="base-props">Base props (every node)</h3>
        <p>
          Every node component accepts the same base props plus its kind-specific extras. Anything you set lands
          verbatim on the compiled <InlineCode>WireNode</InlineCode>.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Prop</th>
              <th className="px-4 py-2.5 font-bold">Type</th>
              <th className="px-4 py-2.5 font-bold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {BASE_PROPS.map((row) => (
              <tr key={row.prop} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.prop}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">{row.type}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="flow">{`<Flow>`} props</h2>
        <p>
          The compiler decides what mode to render in and emits the canonical JSON to{" "}
          <InlineCode>onCompile</InlineCode>.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Prop</th>
              <th className="px-4 py-2.5 font-bold">Type</th>
              <th className="px-4 py-2.5 font-bold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {FLOW_PROPS.map((row) => (
              <tr key={row.prop} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.prop}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">{row.type}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="modes">Render modes</h2>
        <h3 id="svg-mode">
          <InlineCode>mode=&quot;svg&quot;</InlineCode>
        </h3>
        <p>
          The default. Returns server-renderable inline SVG using <InlineCode>renderToSvg</InlineCode>. Works in any
          React tree — server components, RSC, plain SPA, static export. No canvas-engine peer dependency needed.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`<Flow layout="LR" style={{ height: 320 }}>
  <TriggerNode id="t" title="Tick" />
</Flow>`}
      </CodeBlock>

      <Prose>
        <h3 id="json-mode">
          <InlineCode>mode=&quot;json&quot;</InlineCode>
        </h3>
        <p>
          Renders nothing. Calls <InlineCode>onCompile</InlineCode> with the canonical{" "}
          <InlineCode>WireDiagram</InlineCode> whenever the Flow renders with a callback. Useful for capturing JSON to
          send to the MCP server, save to a backend, or hand off to <InlineCode>WireProvider</InlineCode>.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`<Flow mode="json" onCompile={(diagram) => save(diagram)}>
  <TriggerNode id="t" title="Tick" />
</Flow>`}
      </CodeBlock>

      <Prose>
        <h2 id="hook">Compile via hook</h2>
        <p>
          When you want the JSON without mounting <InlineCode>{`<Flow>`}</InlineCode> at all,{" "}
          <InlineCode>useCompiledWireDiagram(element)</InlineCode> compiles a Flow element synchronously. Pair it with{" "}
          <InlineCode>WireProvider</InlineCode> to drive your own canvas. Use <InlineCode>useWireDiagram()</InlineCode>{" "}
          only inside a provider subtree to read the current diagram.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`import { useCompiledWireDiagram, WireProvider, WireCanvas } from "@aigentive/wire-react";

function AgentPanel() {
  const diagram = useCompiledWireDiagram(
    <Flow layout="LR">
      <TriggerNode id="t" title="Tick" />
      <AINode id="plan" title="Plan" from="t" model="gpt-5.4-mini" />
    </Flow>
  );
  return (
    <WireProvider defaultDiagram={diagram}>
      <WireCanvas mode="view" fitView />
    </WireProvider>
  );
}`}
      </CodeBlock>

      <Callout tone="info" title="Same JSON, three callsites">
        The JSON produced by JSX is byte-for-byte the same as JSON written by hand or emitted by the MCP server. Pick
        whichever authoring path is easiest at the callsite — the renderer doesn&rsquo;t care.
      </Callout>
    </DocsPage>
  );
}
