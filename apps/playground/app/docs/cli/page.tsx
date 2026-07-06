import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { Shell, CodeBlock } from "../_components/CodeBlock";
import { Callout } from "../_components/Callout";

export const metadata = { title: "CLI · Wire docs" };

const COMMANDS: Array<{
  command: string;
  signature: string;
  purpose: string;
  flags?: Array<{ flag: string; description: string }>;
}> = [
  {
    command: "wire init",
    signature: "wire init <id> [flags]",
    purpose: "Create a new diagram, optionally seeded from a template.",
    flags: [
      { flag: "--title=\"…\"", description: "Display title for the diagram." },
      { flag: "--layout=LR|TB|RL|BT", description: "Initial layout direction (default LR)." },
      { flag: "--template=agent-workflow|approval-flow|rag-pipeline", description: "Seed nodes/edges from a built-in template." }
    ]
  },
  {
    command: "wire add",
    signature: "wire add <kind> --diagram=<id> [flags]",
    purpose: "Append a node of any kind to an existing diagram.",
    flags: [
      { flag: "--diagram=<id>", description: "Diagram id to mutate (required)." },
      { flag: "--title=\"…\"", description: "Title for the node (required)." },
      { flag: "--id=<id>", description: "Explicit node id; auto-generated when omitted." },
      { flag: "--description=\"…\"", description: "Body copy for the rendered node card." },
      { flag: "--from=<id>", description: "Source node for the implicit edge (`id` or `id.branch`)." },
      { flag: "--branch=<name>", description: "Branch name when wiring from a condition node." },
      { flag: "--branches=a,b,c", description: "Comma-separated branches (only valid for `condition`)." },
      { flag: "--model=<model>", description: "Model label for `ai` nodes." },
      { flag: "--tools=a,b,c", description: "Comma-separated id-safe tool names for `ai` nodes." },
      { flag: "--ref=<tool.name>", description: "External tool/function reference for `tool` nodes." },
      { flag: "--body=\"…\"", description: "Body text for `note` nodes." },
      { flag: "--tone=success|warning|error|info|ai", description: "Visual tone for the node." }
    ]
  },
  {
    command: "wire validate",
    signature: "wire validate <id>",
    purpose: "Run schema + structural validation on a stored diagram. Exits non-zero with issue codes if invalid."
  },
  {
    command: "wire export",
    signature: "wire export <id> --format=svg|json|mermaid [--out=<path>]",
    purpose: "Render or export a diagram. Writes to stdout when `--out` is omitted.",
    flags: [
      { flag: "--format=svg|json|mermaid", description: "Output format (required)." },
      { flag: "--out=<path>", description: "Write to file instead of stdout." }
    ]
  },
  {
    command: "wire ls",
    signature: "wire ls",
    purpose: "List all diagrams in the storage directory (recency-sorted)."
  },
  {
    command: "wire help",
    signature: "wire help",
    purpose: "Print the inline help text. `--help` and `-h` work too."
  }
];

export default function CliPage() {
  return (
    <DocsPage
      eyebrow="Tooling"
      title="Wire CLI"
      description="Author Wire diagrams from the command line. Init from templates, add nodes, validate, and export to SVG / JSON / Mermaid."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Tooling" }, { label: "CLI" }]}
      next={{ href: "/docs/api/wire-core", label: "API · wire-core" }}
    >
      <Prose>
        <h2 id="install">Install</h2>
        <p>
          Install globally for the bare <InlineCode>wire</InlineCode> binary, or run via <InlineCode>npx</InlineCode>{" "}
          without installing.
        </p>
      </Prose>
      <Shell>{`# global install
npm install -g @aigentive/wire-cli

# or run ad-hoc
npx @aigentive/wire-cli help`}</Shell>

      <Prose>
        <h2 id="quickstart">Quickstart</h2>
        <p>
          Create a diagram from a template, add nodes, validate, and export. Run{" "}
          <InlineCode>wire validate</InlineCode> before <InlineCode>wire export</InlineCode>; export parses and
          renders the stored diagram, but validation is the preflight.
        </p>
      </Prose>
      <Shell>{`# Init from a built-in template
wire init my-flow --template=approval-flow --title="Approval flow"

# Add nodes (from is "<id>" or "<id>.<branch>")
wire add ai        --diagram=my-flow --title="Classify intent" \\
                    --description="Route by customer intent" \\
                    --from=incoming --model=intent-classifier
wire add tool      --diagram=my-flow --title="Search CRM" \\
                    --from=classify --ref=crm.search
wire add condition --diagram=my-flow --title="Route" \\
                    --from=classify --branches=sales,support,other

# Validate
wire validate my-flow

# Export
wire export my-flow --format=svg     --out=my-flow.svg
wire export my-flow --format=mermaid --out=my-flow.mmd
wire export my-flow --format=json    > my-flow.json

# List everything in the storage directory
wire ls`}</Shell>

      <Prose>
        <h2 id="commands">Commands</h2>
      </Prose>

      <div className="not-prose grid gap-4">
        {COMMANDS.map((cmd) => (
          <section key={cmd.command} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <code className="font-mono text-[13px] font-bold text-slate-950 dark:text-slate-50">{cmd.signature}</code>
            </header>
            <div className="grid gap-3 px-4 py-3">
              <p className="m-0 text-[13px] leading-6 text-slate-700 dark:text-slate-300">{cmd.purpose}</p>
              {cmd.flags ? (
                <table className="w-full border-collapse text-left text-[12px]">
                  <tbody>
                    {cmd.flags.map((f) => (
                      <tr key={f.flag} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                        <td className="w-[280px] py-2 pr-4 align-top font-mono text-[12px] font-bold text-slate-700 dark:text-slate-300">
                          {f.flag}
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <Prose>
        <h2 id="storage">Storage</h2>
        <p>
          Diagrams are written as <InlineCode>{`<id>.json`}</InlineCode> files. The default directory is{" "}
          <InlineCode>./diagrams</InlineCode>; override per-command with <InlineCode>--dir=&lt;path&gt;</InlineCode>{" "}
          or globally via the <InlineCode>WIRE_DIR</InlineCode> environment variable.
        </p>
      </Prose>
      <CodeBlock language="bash">
        {`# per-command
wire ls --dir=/tmp/wire-diagrams

# environment
export WIRE_DIR=/Users/me/Documents/wire-diagrams
wire init my-flow`}
      </CodeBlock>

      <Callout tone="tip" title="Same storage as the MCP server">
        Set <InlineCode>WIRE_DIR</InlineCode> and <InlineCode>WIRE_STORAGE_DIR</InlineCode> to the same directory and
        the CLI and the MCP server will see each other&rsquo;s diagrams. Handy for cross-tool workflows — author with
        the CLI, edit with an agent through MCP.
      </Callout>

      <Prose>
        <h2 id="exit-codes">Exit codes</h2>
        <ul>
          <li><strong>0</strong> — success.</li>
          <li><strong>1</strong> — runtime error (validation failure, missing diagram, parse error). Stderr carries the message.</li>
        </ul>
      </Prose>
    </DocsPage>
  );
}
