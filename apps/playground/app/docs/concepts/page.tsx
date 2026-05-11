import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { CodeBlock } from "../_components/CodeBlock";
import { Callout } from "../_components/Callout";

export const metadata = { title: "Mental model · Wire docs" };

const NODE_KINDS: Array<{ kind: string; jsx: string; purpose: string }> = [
  { kind: "trigger", jsx: "<TriggerNode>", purpose: "Entry point of a flow (webhook, schedule, manual)." },
  { kind: "action", jsx: "<ActionNode>", purpose: "Side-effect step — call an API, send a notification." },
  { kind: "ai", jsx: "<AINode>", purpose: "LLM call. Carries `model`, `prompt`, optional `tools`." },
  { kind: "tool", jsx: "<ToolNode>", purpose: "Tool invocation referenced by `ref` (e.g. `zendesk.update_ticket`)." },
  { kind: "condition", jsx: "<ConditionNode>", purpose: "Branching node. Requires `branches: string[]`." },
  { kind: "human", jsx: "<HumanNode>", purpose: "Manual approval / human-in-the-loop." },
  { kind: "memory", jsx: "<MemoryNode>", purpose: "Read/write to a persistent store." },
  { kind: "retrieval", jsx: "<RetrievalNode>", purpose: "RAG / vector lookup step." },
  { kind: "guardrail", jsx: "<GuardrailNode>", purpose: "Policy/safety check before downstream steps run." },
  { kind: "end", jsx: "<EndNode>", purpose: "Terminal node — explicit flow end." },
  { kind: "note", jsx: "<Note>", purpose: "Annotation; uses `attachedTo` for visual association." },
  { kind: "group", jsx: "<Group>", purpose: "Container; wraps children via `parent` linkage." }
];

const VALIDATION_CODES: Array<{ code: string; severity: "error" | "warning"; meaning: string }> = [
  { code: "schema.*", severity: "error", meaning: "Zod schema rejection (top-level shape, missing required fields, etc.)." },
  { code: "node.duplicate-id", severity: "error", meaning: "Two nodes share the same id." },
  { code: "node.attached-to-missing", severity: "error", meaning: "`attachedTo` points to a missing node." },
  { code: "node.parent-missing", severity: "error", meaning: "`parent` points to a missing node." },
  { code: "node.parent-not-group", severity: "error", meaning: "`parent` points to a node that isn't a `group`." },
  { code: "condition.no-branches", severity: "error", meaning: "Condition node has no `branches`." },
  { code: "condition.duplicate-branch", severity: "error", meaning: "Repeated branch name on a condition." },
  { code: "edge.from-missing", severity: "error", meaning: "Source node referenced by an edge does not exist." },
  { code: "edge.to-missing", severity: "error", meaning: "Target node referenced by an edge does not exist." },
  { code: "edge.branch-from-non-condition", severity: "error", meaning: "`id.branch` syntax used from a non-condition source." },
  { code: "edge.unknown-branch", severity: "error", meaning: "Branch name not declared on the source condition." },
  { code: "node.orphan", severity: "warning", meaning: "Node has no incoming or outgoing edges." },
  { code: "edge.self-loop", severity: "warning", meaning: "Node references itself." }
];

export default function ConceptsPage() {
  return (
    <DocsPage
      eyebrow="Concepts"
      title="How Wire thinks"
      description="Five primitives describe the whole library. Internalise them once and the API maps cleanly."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Concepts" }]}
      next={{ href: "/customize/cards", label: "Customize cards" }}
    >
      <Prose>
        <p>
          Wire is a canonical JSON diagram, a pure reducer over actions, a small event surface, a typed option catalog,
          and replaceable render callbacks. Everything else — the editor shell, the panels, the playground — is built
          from these.
        </p>

        <h2 id="diagram-json">Diagram JSON</h2>
        <p>
          A <InlineCode>WireDiagram</InlineCode> is the source of truth. Nodes carry kind, title, position, size, and
          a free-form <InlineCode>data</InlineCode> bag. Edges either come from a node&rsquo;s{" "}
          <InlineCode>from</InlineCode> shorthand or appear as explicit edge objects when you need handles, labels, or
          routing.
        </p>
      </Prose>

      <CodeBlock language="json">
        {`{
  "version": 1,
  "id": "support-agent",
  "title": "Support agent",
  "layout": "LR",
  "nodes": [
    { "id": "webhook", "kind": "trigger", "title": "Ticket webhook" },
    { "id": "plan",    "kind": "ai",      "title": "Plan answer",
      "from": "webhook", "model": "gpt-5.4-mini" },
    { "id": "respond", "kind": "action",  "title": "Send response",
      "from": "plan",   "tone": "success" }
  ],
  "edges": []
}`}
      </CodeBlock>

      <Prose>
        <p>
          The schema lives in <InlineCode>@aigentive/wire-core</InlineCode> as Zod. Validation runs both inside the
          editor and at the network boundary, so an LLM that emits a bad node is told exactly which field is wrong.
        </p>

        <h2 id="node-kinds">Node kinds</h2>
        <p>
          Twelve kinds cover the surface. Pick the one whose semantics match what you&rsquo;re modelling — the
          rendering is consistent across them, but a custom card can specialize per-kind via{" "}
          <InlineCode>renderNodeCard</InlineCode>.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Kind</th>
              <th className="px-4 py-2.5 font-bold">JSX equivalent</th>
              <th className="px-4 py-2.5 font-bold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {NODE_KINDS.map((row) => (
              <tr key={row.kind} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.kind}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">
                  {row.jsx}
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout tone="info" title="Per-kind fields">
        Beyond the common base fields, some kinds carry typed extras: <InlineCode>condition.branches</InlineCode>{" "}
        (string[]), <InlineCode>ai.model</InlineCode> / <InlineCode>prompt</InlineCode> /{" "}
        <InlineCode>tools</InlineCode>, <InlineCode>tool.ref</InlineCode>, <InlineCode>note.body</InlineCode>,{" "}
        <InlineCode>group.children</InlineCode>. Everything else lives in <InlineCode>node.data</InlineCode>.
      </Callout>

      <Prose>
        <h2 id="actions">Actions</h2>
        <p>
          Every edit — human, agent, MCP, undo — is a <InlineCode>WireAction</InlineCode>. The reducer in{" "}
          <InlineCode>wire-core</InlineCode> is pure: <InlineCode>(diagram, action) → diagram</InlineCode>. React,
          MCP, and CLI all call the same function.
        </p>
      </Prose>

      <CodeBlock language="ts">
        {`type WireAction =
  | { type: "node.add"; node: WireNode }
  | { type: "node.patch"; id: string; patch: Partial<WireNode> }
  | { type: "node.remove"; id: string }
  | { type: "node.move"; id: string; position: Point }
  | { type: "node.resize"; id: string; size: Size }
  | { type: "edge.connect"; edge: WireEdge }
  | { type: "edge.patch"; id: string; patch: Partial<WireEdge> }
  | { type: "edge.disconnect"; from: string; to: string }
  | { type: "edge.remove"; id: string }
  | { type: "diagram.patch"; patch: Partial<WireDiagram> }
  | { type: "metadata.patch"; patch: Record<string, unknown> }
  | { type: "layout.apply"; layout: "LR" | "TB" }
  | { type: "group.add"; id: string; children: string[] }
  | { type: "group.ungroup"; id: string }
  | { type: "note.add"; note: WireNote };`}
      </CodeBlock>

      <Callout tone="tip" title="One reducer, three callsites">
        The same actions run in <InlineCode>WireProvider</InlineCode> when a user drags a card, in{" "}
        <InlineCode>wire-mcp</InlineCode> when an agent calls <InlineCode>add_node</InlineCode>, and in the CLI when
        you run <InlineCode>wire add</InlineCode>. Validation and history are free.
      </Callout>

      <Prose>
        <h2 id="events">Events</h2>
        <p>
          Actions describe data changes; events describe <em>UI gestures</em>. The two are deliberately separate so
          you can keep an inspector synced to selection without coupling it to card rendering.
        </p>
      </Prose>

      <CodeBlock language="ts">
        {`type WireEvent =
  | { type: "node.click";       source: WireEventSource; nodeId: string }
  | { type: "node.inspect";     source: WireEventSource; nodeId: string }
  | { type: "edge.click";       source: WireEventSource; edgeId: string }
  | { type: "selection.change"; source: WireEventSource; selection: WireSelection }
  | { type: "pane.click";       source: WireEventSource };

type WireEventSource =
  | "canvas" | "node-card" | "node-list"
  | "option-panel" | "validation-panel" | "workspace" | "api";`}
      </CodeBlock>

      <Prose>
        <p>
          Built-in React components currently emit from <InlineCode>canvas</InlineCode> and{" "}
          <InlineCode>node-list</InlineCode>. The other source labels are reserved for custom cards, panels,
          workspace wrappers, and programmatic integrations. See <a href="/docs/listen">Listen</a> for the full surface.
        </p>

        <h2 id="validation">Validation</h2>
        <p>
          <InlineCode>validate(diagram)</InlineCode> returns a flat list of issues. Each issue carries a stable code,
          a severity, and (for most codes) a repair hint. The same call runs in the playground, in MCP requests, and
          in the CLI — so an LLM that emits a bad diagram gets actionable feedback instead of a generic error.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Code</th>
              <th className="px-4 py-2.5 font-bold">Severity</th>
              <th className="px-4 py-2.5 font-bold">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {VALIDATION_CODES.map((row) => (
              <tr key={row.code} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.code}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      row.severity === "error"
                        ? "rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {row.severity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="options">Options</h2>
        <p>
          A <InlineCode>WireOptionCatalog</InlineCode> declares per-kind option specs — type, range, choices, storage
          location. The option panel renders the right control for each spec and dispatches{" "}
          <InlineCode>node.patch</InlineCode> actions on edit. No imperative form code.
        </p>
      </Prose>

      <CodeBlock language="ts">
        {`const options: WireOptionCatalog = {
  "*":     [{ key: "owner", storage: "data" }],
  ai:      [
    { key: "model",       storage: "node", type: "select",
      options: ["gpt-5.4-mini", "gpt-4.1-mini", "o4-mini"] },
    { key: "temperature", type: "number",  min: 0, max: 2, step: 0.1 },
    { key: "maxSteps",    type: "number",  min: 1, max: 20 }
  ],
  retrieval: [
    { key: "index", type: "text" },
    { key: "topK",  type: "number", min: 1, max: 20 }
  ]
};`}
      </CodeBlock>

      <Prose>
        <p>
          <InlineCode>storage</InlineCode> chooses where the value lives:{" "}
          <InlineCode>&quot;data.options&quot;</InlineCode> (default — hidden from the schema-typed surface),{" "}
          <InlineCode>&quot;data&quot;</InlineCode> (a top-level field on <InlineCode>node.data</InlineCode>), or{" "}
          <InlineCode>&quot;node&quot;</InlineCode> (a typed field on the node itself, like{" "}
          <InlineCode>model</InlineCode>).
        </p>

        <h2 id="renderers">Renderers</h2>
        <p>
          Default cards and group frames already follow the visual rules. When you need something different, pass{" "}
          <InlineCode>renderNodeCard</InlineCode> and/or <InlineCode>renderGroup</InlineCode>. Each receives a{" "}
          <InlineCode>WireNodeRenderContext</InlineCode> — the same context the default uses.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`function Card(ctx: WireNodeRenderContext) {
  return (
    <div aria-selected={ctx.selected}>
      <span className="kind">{ctx.kind}</span>
      <strong>{ctx.node.title}</strong>
      {ctx.optionSpecs.map((spec) => (
        <span key={spec.key}>{spec.label}: {String(ctx.options[spec.key])}</span>
      ))}
    </div>
  );
}

<WireWorkspace renderNodeCard={Card} renderGroup={GroupFrame} />;`}
      </CodeBlock>

      <Callout tone="info" title="The contract">
        The render callback gets the node, kind, selection, measured size, theme tokens, the parsed options bag, and
        the option specs that match this node&rsquo;s kind. Nothing else flows through it — the canonical JSON stays
        clean.
      </Callout>
    </DocsPage>
  );
}
