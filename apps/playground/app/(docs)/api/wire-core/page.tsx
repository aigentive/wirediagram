import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";

export const metadata = { title: "API · wire-core · Wire docs" };

const PARSE_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "parseWireDiagram", signature: "parseWireDiagram(input: unknown): WireDiagram", purpose: "Validate + parse using the canonical Zod schema. Throws on schema errors." },
  { name: "safeParseWireDiagram", signature: "safeParseWireDiagram(input: unknown): SafeParseReturnType", purpose: "Non-throwing variant — returns Zod's success/error shape." },
  { name: "WireDiagramSchema", signature: "z.ZodType<WireDiagram>", purpose: "Top-level Zod schema. Use directly when you need to compose with other schemas." },
  { name: "NodeSchema", signature: "z.ZodType<WireNode>", purpose: "Discriminated union over all 12 node kinds." },
  { name: "AINodeSchema · TriggerNodeSchema · …", signature: "z.ZodType<WireNode<kind>>", purpose: "Kind-specific schemas for narrow validation." }
];

const VALIDATE_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "validate", signature: "validate(input: unknown): ValidationResult", purpose: "Structural + reference validation. Returns `{ valid, issues: ValidationIssue[] }` with codes + repair hints." },
  { name: "ValidationIssue", signature: "{ code: string; severity: \"error\" | \"warning\"; path: string; message: string; hint?: string }", purpose: "Individual issue shape. Codes are listed in Concepts → Validation." }
];

const LAYOUT_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "normalize", signature: "normalize(diagram: WireDiagram): { resolvedEdges, nodeIndex }", purpose: "Resolves `from` / `after` shorthand into explicit edges and indexes nodes by id." },
  { name: "layoutDiagram", signature: "layoutDiagram(diagram, opts?: { rankSep?, nodeSep?, engine? }): LayoutResult", purpose: "Runs dagre layout; returns `{x, y, width, height}` per node id." }
];

const RENDER_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "renderToSvg", signature: "renderToSvg(diagram, opts?: RenderSvgOptions): string", purpose: "Server-renderable SVG string. Self-contained, no external CSS." },
  { name: "toMermaid", signature: "toMermaid(diagram): string", purpose: "Export as Mermaid `flowchart` syntax — paste into any Mermaid renderer." }
];

const SVG_OPTIONS: Array<{ name: string; type: string; purpose: string }> = [
  { name: "padding", type: "number", purpose: "Padding around the diagram bounds (px). Default 24." },
  { name: "background", type: "string", purpose: "Background color. Default #ffffff. Pass `transparent` to omit the background rect." },
  { name: "toneColors", type: "Partial<Record<Tone, ToneColor>>", purpose: "Override the per-tone color map (default, success, warning, error, info, ai)." },
  { name: "titleWrapChars", type: "number", purpose: "Wrap node titles at this character count. Default 24." },
  { name: "nodeStyle", type: "NodeStyle", purpose: "Diagram-level default node style. Per-node `style` overrides this." },
  { name: "edgeStyle", type: "EdgeStyle", purpose: "Diagram-level default edge style. Per-edge `style` overrides this." },
  { name: "edgeLabelStyle", type: "EdgeLabelStyle", purpose: "Diagram-level default edge label style." },
  { name: "edgeRouting", type: "\"bezier\" | \"smoothstep\" | \"step\" | \"straight\"", purpose: "Diagram-level default routing. Per-edge `routing` overrides this." }
];

const EDITOR_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "emptyDiagram", signature: "emptyDiagram(opts?: { id?, title?, layout? }): WireDiagram", purpose: "Construct a blank, schema-valid diagram." },
  { name: "addNode", signature: "addNode(diagram, node): { diagram, node }", purpose: "Append a node. Returns the new diagram and the resolved node (with auto id when omitted)." },
  { name: "updateNode", signature: "updateNode(diagram, id, patch): WireDiagram", purpose: "Patch fields on a node by id." },
  { name: "removeNode", signature: "removeNode(diagram, id): WireDiagram", purpose: "Remove a node and prune incoming refs." },
  { name: "connect", signature: "connect(diagram, edge): { diagram, edge }", purpose: "Add an explicit edge with stable id, optional handles, label, branch, routing, and style." },
  { name: "disconnect", signature: "disconnect(diagram, opts: { from, to, branch? }): WireDiagram", purpose: "Remove a connection by `from` reference (branch-aware sweep when branch omitted)." },
  { name: "addNote", signature: "addNote(diagram, note): { diagram, note }", purpose: "Add an annotation; supports `attachedTo` for visual association." },
  { name: "setLayout", signature: "setLayout(diagram, layout): WireDiagram", purpose: "Change layout direction (LR / TB / RL / BT) without touching nodes." }
];

const UTIL_EXPORTS: Array<{ name: string; signature: string; purpose: string }> = [
  { name: "generateNodeId", signature: "generateNodeId(opts: { kind, title?, existing }): string", purpose: "Produce a unique slug-like id from kind + title, avoiding collisions in `existing`." },
  { name: "slugify", signature: "slugify(input: string): string", purpose: "Lowercase + dash-collapsed slug used for ids and resource names." },
  { name: "splitFromRef", signature: "splitFromRef(ref: string): { id, branch? }", purpose: "Parse the `\"id\"` or `\"id.branch\"` shorthand used by `from` / `after`." }
];

export default function ApiWireCorePage() {
  return (
    <DocsPage
      eyebrow="Reference"
      title="@aigentive/wire-core"
      description="Canonical schema, validation, normalization, layout, and pure editors. Zero React; runs in browser, Node, edge functions."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Reference" }, { label: "Core" }]}
      next={{ href: "/api/jsx-facade", label: "API · JSX facade" }}
    >
      <Prose>
        <h2 id="install">Install</h2>
        <p>
          The core package is React-free and dependency-light. Most apps don&rsquo;t install it directly —{" "}
          <InlineCode>@aigentive/wire-react</InlineCode> re-exports the symbols you usually need. Install standalone
          when you want server-side rendering, validation in a CLI/Lambda, or schema reuse outside the React tree.
        </p>
      </Prose>
      <CodeBlock language="bash">{`npm install @aigentive/wire-core`}</CodeBlock>

      <Prose>
        <h2 id="parsing">Parsing &amp; schema</h2>
        <p>
          The Zod schema is the source of truth. Call <InlineCode>parseWireDiagram</InlineCode> at any boundary
          (network input, file load) and you get a typed <InlineCode>WireDiagram</InlineCode> back — or a precise
          error pointing at the bad field.
        </p>
      </Prose>

      <ApiTable rows={PARSE_EXPORTS} />

      <CodeBlock language="ts">
        {`import { parseWireDiagram, safeParseWireDiagram } from "@aigentive/wire-core";

const diagram = parseWireDiagram(JSON.parse(buffer)); // throws on bad input

const result = safeParseWireDiagram(maybe);
if (!result.success) console.error(result.error.issues);`}
      </CodeBlock>

      <Prose>
        <h2 id="validate">Validation</h2>
        <p>
          <InlineCode>validate</InlineCode> goes beyond the schema — it checks references between nodes (orphan{" "}
          <InlineCode>from</InlineCode>, missing <InlineCode>parent</InlineCode>, branch names that don&rsquo;t exist
          on the source condition) and returns issues with stable codes.
        </p>
      </Prose>

      <ApiTable rows={VALIDATE_EXPORTS} />

      <CodeBlock language="ts">
        {`import { validate } from "@aigentive/wire-core";

const { valid, issues } = validate(diagram);
if (!valid) {
  for (const issue of issues) {
    console.error(\`[\${issue.severity}] \${issue.code} @ \${issue.path}: \${issue.message}\`);
    if (issue.hint) console.error(\`  → \${issue.hint}\`);
  }
}`}
      </CodeBlock>

      <Callout tone="info" title="Codes are stable">
        Issue codes (<InlineCode>edge.from-missing</InlineCode>, <InlineCode>condition.no-branches</InlineCode>, …)
        are part of the public contract. Programs and agents can switch on them. The full list lives in{" "}
        <a href="/concepts#validation">Concepts → Validation</a>.
      </Callout>

      <Prose>
        <h2 id="layout">Normalization &amp; layout</h2>
        <p>
          <InlineCode>normalize</InlineCode> turns shorthand <InlineCode>from</InlineCode> /{" "}
          <InlineCode>after</InlineCode> references into a flat list of explicit edges plus a node index keyed by id.
          <InlineCode>layoutDiagram</InlineCode> runs the dagre layout and hands back a position + size per node.
        </p>
      </Prose>

      <ApiTable rows={LAYOUT_EXPORTS} />

      <Prose>
        <h2 id="render">Rendering &amp; export</h2>
        <p>
          Two pure functions cover the static surfaces. Both take a <InlineCode>WireDiagram</InlineCode> and return a
          string — no DOM, no canvas engine, no peer deps.
        </p>
      </Prose>

      <ApiTable rows={RENDER_EXPORTS} />

      <Prose>
        <h3 id="render-svg-options"><InlineCode>RenderSvgOptions</InlineCode></h3>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-extrabold">Option</th>
              <th className="px-4 py-2.5 font-extrabold">Type</th>
              <th className="px-4 py-2.5 font-extrabold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {SVG_OPTIONS.map((row) => (
              <tr key={row.name} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  {row.name}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">{row.type}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CodeBlock language="ts">
        {`import { renderToSvg, toMermaid } from "@aigentive/wire-core";

const svg = renderToSvg(diagram, { padding: 32, background: "transparent" });
const mermaid = toMermaid(diagram);

await fs.writeFile("flow.svg", svg, "utf8");
await fs.writeFile("flow.mmd", mermaid, "utf8");`}
      </CodeBlock>

      <Prose>
        <h2 id="editors">Pure editors</h2>
        <p>
          Every editor returns a new diagram — never mutates. The same functions back the React provider, the MCP
          server, and the CLI. Use them anywhere you need to author a diagram outside the editor shell (build-time
          generation, migrations, agent loops).
        </p>
      </Prose>

      <ApiTable rows={EDITOR_EXPORTS} />

      <CodeBlock language="ts">
        {`import { emptyDiagram, addNode, connect } from "@aigentive/wire-core";

let d = emptyDiagram({ layout: "LR", title: "Support agent" });
d = addNode(d, { kind: "trigger", title: "Webhook", id: "in" }).diagram;
d = addNode(d, { kind: "ai", title: "Plan", from: "in", model: "gpt-4.1" }).diagram;
d = addNode(d, { kind: "action", title: "Reply", from: "plan", tone: "success" }).diagram;`}
      </CodeBlock>

      <Prose>
        <h2 id="utilities">Utilities</h2>
      </Prose>

      <ApiTable rows={UTIL_EXPORTS} />
    </DocsPage>
  );
}

function ApiTable({ rows }: { rows: Array<{ name: string; signature: string; purpose: string }> }) {
  return (
    <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-2.5 font-extrabold">Export</th>
            <th className="px-4 py-2.5 font-extrabold">Signature</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
              <td className="w-[220px] px-4 py-2.5 align-top font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                {row.name}
              </td>
              <td className="px-4 py-2.5">
                <code className="block break-all font-mono text-[12px] text-slate-700 dark:text-slate-300">
                  {row.signature}
                </code>
                <p className="m-0 mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{row.purpose}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
