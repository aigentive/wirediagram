import { LLM_DOCS_ROUTES } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { CodeBlock } from "../_components/CodeBlock";
import { Callout } from "../_components/Callout";

export const metadata = { title: "LLM docs · Wire docs" };

const CORE_ROUTES = LLM_DOCS_ROUTES.filter((route) =>
  route.path === "/llm/wire-docs.shape.json" ||
  route.path === "/llm/agent-guide.md" ||
  route.path === "/llm/schema/wire-diagram.json" ||
  route.path === "/llm/mcp.shape.json" ||
  route.path === "/llm/cli.shape.json" ||
  route.path === "/llm/react.shape.json" ||
  route.path === "/llm/cloud.shape.json" ||
  route.path === "/llm/validation.shape.json" ||
  route.path === "/llm/skill.shape.json"
);

const RECIPE_IDS = [
  "create-wire-diagram",
  "edit-with-wire-actions",
  "validate-and-repair",
  "render-for-review",
  "style-cards-and-edges",
  "branch-condition-flow",
  "group-nodes",
  "embed-react-viewer"
];

export default function LlmDocsPage() {
  return (
    <DocsPage
      eyebrow="LLM interface"
      title="Machine-readable Wire docs"
      description="The fastest path for agents is not a tutorial. It is compact JSON shape, schema, examples, recipes, and a short agent guide that all point at the canonical Wire model."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "LLM docs" }]}
      next={{ href: "/docs/mcp", label: "Wire MCP server" }}
    >
      <Callout title="Primary contract" tone="tip">
        Agents should start at <InlineCode>/llm/wire-docs.shape.json</InlineCode> or call{" "}
        <InlineCode>v1_get_docs_shape</InlineCode> through MCP. Human pages are secondary mirrors.
      </Callout>

      <Callout title="Repository skill" tone="info">
        Agents working in this repo should read <InlineCode>docs/llm/SKILL.md</InlineCode> before editing
        Wire JSON. The skill keeps the fast create, edit, validate, render, style, branch, group, and embed
        workflows in one prompt-ready file.
      </Callout>

      <Prose>
        <h2 id="entrypoints">Entrypoints</h2>
        <p>
          These routes return raw JSON or Markdown with stable content types. They are designed for local agents,
          hosted Wire chat, and retrieval pipelines.
        </p>
      </Prose>

      <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2.5 font-bold">Route</th>
              <th className="px-4 py-2.5 font-bold">Media type</th>
              <th className="px-4 py-2.5 font-bold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {CORE_ROUTES.map((route) => (
              <tr key={route.path} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <td className="px-4 py-2.5 align-top font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">
                  <a href={route.path} className="no-underline hover:underline">
                    {route.path}
                  </a>
                </td>
                <td className="px-4 py-2.5 align-top font-mono text-[12px] text-slate-600 dark:text-slate-400">
                  {route.mediaType}
                </td>
                <td className="px-4 py-2.5 align-top text-slate-700 dark:text-slate-300">{route.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="mcp">MCP retrieval</h2>
        <p>
          The MCP server exposes the same content as resources and a task-aware retrieval tool. Agents should call this
          before guessing from human prose.
        </p>
      </Prose>
      <CodeBlock language="json">
        {`{
  "tool": "v1_get_docs_shape",
  "arguments": {
    "task": "Build a React workspace and sync it to Wire Cloud"
  }
}`}
      </CodeBlock>

      <Prose>
        <h2 id="recipes">Fast-start recipes</h2>
        <p>
          Recipes are small JSON task plans. Use them when the agent already knows the task type and needs the shortest
          path through the implemented APIs.
        </p>
      </Prose>
      <div className="not-prose grid gap-2 sm:grid-cols-2">
        {RECIPE_IDS.map((id) => (
          <a
            key={id}
            href={`/llm/recipes/${id}.json`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-[12px] font-bold text-slate-900 no-underline hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-700 dark:hover:text-blue-300"
          >
            /llm/recipes/{id}.json
          </a>
        ))}
      </div>

      <Prose>
        <h2 id="rules">Agent rules</h2>
        <ul>
          <li>Use <InlineCode>WireDiagram</InlineCode> JSON as the source of truth.</li>
          <li>Use <InlineCode>WireAction</InlineCode> batches or <InlineCode>apply_actions</InlineCode> for coherent edits.</li>
          <li>Use <InlineCode>@aigentive/wire-react</InlineCode> for React UI.</li>
          <li>Use <InlineCode>@aigentive/wire-cli</InlineCode> for local validate/export workflows.</li>
          <li>Run <InlineCode>validate</InlineCode> before rendering or sharing.</li>
          <li>Use Mermaid, SVG, and PNG as exports, not primary state.</li>
        </ul>
      </Prose>
    </DocsPage>
  );
}
