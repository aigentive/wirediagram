import Link from "next/link";
import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";

export const metadata = { title: "Customize · Options · Wire docs" };

const STORAGE_ROWS = [
  ["node", "Top-level node field", "Use for durable fields such as model, tone, title, prompt, or kind-specific data."],
  ["data", "node.data.options", "Default for product-specific configuration values."],
  ["metadata", "diagram metadata", "Use for diagram-level settings outside individual node options."]
];

export default function CustomizeOptionsPage() {
  return (
    <DocsPage
      eyebrow="Customize"
      title="Option catalogs"
      description="Use WireOptionCatalog to render typed editor controls without persisting runtime catalog functions."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Customize" }, { label: "Options" }]}
      next={{ href: "/docs/examples/options", label: "Options example" }}
    >
      <Prose>
        <h2 id="model">Model</h2>
        <p>
          A <InlineCode>WireOptionCatalog</InlineCode> maps node kinds to arrays of{" "}
          <InlineCode>WireOptionSpec</InlineCode>. The catalog is runtime editor configuration. Persist option values
          on the <InlineCode>WireDiagram</InlineCode>, not the catalog itself.
        </p>
      </Prose>

      <CodeBlock language="ts">
        {`import type { WireOptionCatalog } from "@aigentive/wire-react";

export const optionCatalog: WireOptionCatalog = {
  "*": [
    { key: "owner", label: "Owner", storage: "data", placeholder: "ops" }
  ],
  ai: [
    {
      key: "model",
      label: "Model",
      storage: "node",
      type: "select",
      options: ["fast-model", "balanced-model", "compact-model"]
    },
    {
      key: "temperature",
      label: "Temperature",
      storage: "data",
      type: "number",
      min: 0,
      max: 2,
      step: 0.1
    }
  ]
};`}
      </CodeBlock>

      <Prose>
        <h2 id="rendering">Rendering controls</h2>
        <p>
          <InlineCode>WireInspector</InlineCode> renders the relevant options for selected nodes.{" "}
          <InlineCode>WireOptionPanel</InlineCode> renders the same option controls when you want to place them in a
          modal, sidebar, or custom shell.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`<WireProvider defaultDiagram={diagram}>
  <WireCanvas mode="edit" fitView optionCatalog={optionCatalog} />
  <WireInspector optionCatalog={optionCatalog} />
</WireProvider>`}
      </CodeBlock>

      <Prose>
        <h2 id="storage">Storage rules</h2>
      </Prose>

      <div className="not-prose overflow-hidden rounded-lg border border-wire bg-wire-surface">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-wire-sunken text-[11px] uppercase tracking-wider text-wire-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-bold">storage</th>
              <th className="px-4 py-2.5 font-bold">Writes to</th>
              <th className="px-4 py-2.5 font-bold">Use when</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_ROWS.map(([storage, writesTo, useWhen]) => (
              <tr key={storage} className="border-t border-wire">
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-wire-primary">{storage}</td>
                <td className="px-4 py-3 text-wire-secondary">{writesTo}</td>
                <td className="px-4 py-3 text-wire-secondary">{useWhen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout tone="warn" title="Runtime-only catalog">
        Do not serialize <InlineCode>WireOptionCatalog</InlineCode>, option render functions, React nodes, callbacks, or
        validation functions into <InlineCode>WireDiagram</InlineCode>. Store only the serializable values produced by
        the controls.
      </Callout>

      <Prose>
        <h2 id="agent-use">Agent use</h2>
        <p>
          Agents should patch serializable option values with <InlineCode>node.patch</InlineCode>,{" "}
          <InlineCode>apply_actions</InlineCode>, or raw JSON edits. They should not invent catalog functions or change
          the public option API. For a runnable UI example, see <Link href="/docs/examples/options">Options</Link>.
        </p>
      </Prose>
    </DocsPage>
  );
}
