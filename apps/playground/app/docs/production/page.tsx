import Link from "next/link";
import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { Callout } from "../_components/Callout";
import { CodeBlock } from "../_components/CodeBlock";

export const metadata = { title: "Production · Wire docs" };

const CHECKS = [
  ["Persistence", "Persist WireDiagram only; keep viewport, selection, inspector state, option catalogs, and callbacks outside JSON."],
  ["Validation", "Run validate before save, share, render, export, and agent handoff. Treat warnings as review items."],
  ["React boundary", "Render editor surfaces from client components and give the canvas parent a stable height."],
  ["Styling", "Import @aigentive/wire-react/styles.css once, then use CSS variables, colorMode, unstyled, and classNames."],
  ["Accessibility", "Verify keyboard access for toolbar, inspector, node list, option panel, and read-only embeds."],
  ["Tooling", "Keep CLI, MCP, LLM routes, examples, and package READMEs in parity with current implementation."]
];

export default function ProductionPage() {
  return (
    <DocsPage
      eyebrow="Production"
      title="Production usage"
      description="How to embed Wire in a product without changing the durable diagram contract."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Production" }]}
      next={{ href: "/docs/api/react-components", label: "React component API" }}
    >
      <Prose>
        <h2 id="state-boundary">State boundary</h2>
        <p>
          Your application should own <InlineCode>WireDiagram</InlineCode>. Wire editor state such as viewport,
          selection, dirty state, mode, inspector state, history, event callbacks, and option catalog functions is
          runtime state. Do not serialize it into the diagram.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`"use client";

import { useState } from "react";
import "@aigentive/wire-react/styles.css";
import { WireWorkspace, type WireDiagram } from "@aigentive/wire-react";

export function WorkflowEditor({ initial }: { initial: WireDiagram }) {
  const [diagram, setDiagram] = useState(initial);

  return (
    <div style={{ height: "min(760px, calc(100vh - 120px))" }}>
      <WireWorkspace
        diagram={diagram}
        onChange={(next) => {
          setDiagram(next);
          void saveDiagram(next);
        }}
        colorMode="system"
      />
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="validation-before-use">Validation before use</h2>
        <p>
          Validate before you persist, share, render, export, or hand a diagram to an agent. Errors should block the
          workflow. Warnings should remain visible so reviewers can decide whether a diagram is intentionally incomplete.
        </p>
      </Prose>

      <CodeBlock language="ts">
        {`import { validate, type WireDiagram } from "@aigentive/wire-core";

export function assertReadyForShare(diagram: WireDiagram) {
  const result = validate(diagram);
  if (!result.valid) {
    throw new Error(result.issues.map((issue) => issue.message).join("\\n"));
  }
  return result;
}`}
      </CodeBlock>

      <Callout tone="warn" title="No alternate app state">
        Adapter output, rendered SVG, Mermaid text, PNG bytes, viewport, selection, and inspector state are derived or
        runtime artifacts. They can be cached, but they should not replace <InlineCode>WireDiagram</InlineCode> as the
        source of truth.
      </Callout>

      <Prose>
        <h2 id="css-and-theme">CSS and theme</h2>
        <p>
          Import <InlineCode>@aigentive/wire-react/styles.css</InlineCode> once. Consumers do not need Tailwind. Use
          CSS variables and the React customization props to align Wire with a product shell.
        </p>
        <ul>
          <li>
            <InlineCode>colorMode</InlineCode> controls light, dark, or system color mode.
          </li>
          <li>
            <InlineCode>unstyled</InlineCode> removes package visual styling where components support it.
          </li>
          <li>
            <InlineCode>classNames</InlineCode> targets slots without serializing styling functions into JSON.
          </li>
          <li>
            Persisted node and edge <InlineCode>style</InlineCode> fields are for durable visual semantics, not app
            layout state.
          </li>
        </ul>

        <h2 id="client-and-rendering">Client and rendering boundaries</h2>
        <p>
          React editor components are interactive surfaces. Keep them in client components and give their container a
          stable height. Static exports can use <InlineCode>renderToSvg</InlineCode> and{" "}
          <InlineCode>toMermaid</InlineCode> from <InlineCode>@aigentive/wire-core</InlineCode>.
        </p>

        <h2 id="mcp-http-security">MCP and HTTP security</h2>
        <p>
          Local MCP stdio should run with a storage directory scoped to the user or workspace. HTTP deployments should
          pin host, port, cloud URL, API key behavior, audit logging, and preview base URLs. Do not expose write tools
          to untrusted callers without an app-level authorization layer.
        </p>

        <h2 id="release-checklist">Release checklist</h2>
      </Prose>

      <div className="not-prose overflow-hidden rounded-lg border border-wire bg-wire-surface">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-wire-sunken text-[11px] uppercase tracking-wider text-wire-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-bold">Area</th>
              <th className="px-4 py-2.5 font-bold">Gate</th>
            </tr>
          </thead>
          <tbody>
            {CHECKS.map(([area, detail]) => (
              <tr key={area} className="border-t border-wire">
                <td className="w-[160px] px-4 py-3 font-bold text-wire-primary">{area}</td>
                <td className="px-4 py-3 text-wire-secondary">{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2 id="next">Next references</h2>
        <p>
          For implementation details, use the <Link href="/docs/api/react-components">React component API</Link>,{" "}
          <Link href="/docs/api/wire-core">core API</Link>, <Link href="/docs/mcp">MCP docs</Link>,{" "}
          <Link href="/docs/cli">CLI docs</Link>, and <Link href="/docs/llm">LLM docs</Link>.
        </p>
      </Prose>
    </DocsPage>
  );
}
