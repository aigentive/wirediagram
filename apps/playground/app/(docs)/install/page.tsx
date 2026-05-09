import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";
import { CodeBlock, Shell } from "../_components/CodeBlock";
import { Callout } from "../_components/Callout";

export const metadata = { title: "Install · Wire docs" };

export default function InstallPage() {
  return (
    <DocsPage
      eyebrow="Get started"
      title="Install & setup"
      description="Add the package, point Tailwind at the source, render your first canvas."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Install" }]}
      next={{ href: "/quickstart", label: "Quickstart" }}
    >
      <Prose>
        <h2 id="install">Install</h2>
        <p>
          The interactive canvas ships inside <InlineCode>@aigentive/wire-react</InlineCode>. React 18+ is required.
        </p>
      </Prose>
      <Shell>{`npm install @aigentive/wire-react`}</Shell>

      <Callout tone="tip" title="Static renders only?">
        If you just need <InlineCode>renderToSvg</InlineCode> or <InlineCode>toMermaid</InlineCode> (the SVG and Mermaid
        export paths shown in <InlineCode>/examples/layouts</InlineCode>), import them from{" "}
        <InlineCode>@aigentive/wire-core</InlineCode>. Both functions are pure and run in the browser, in Node, or in
        an edge function.
      </Callout>

      <Prose>
        <h2 id="tailwind">Tailwind v4</h2>
        <p>
          The components ship pre-styled with Tailwind utility classes. Tell Tailwind where to find them so the
          classes survive purging, and opt into class-based dark mode.
        </p>
      </Prose>
      <CodeBlock language="css">
        {`@import "tailwindcss";

@source "../node_modules/@aigentive/wire-react";

/* opt into class-based dark mode */
@custom-variant dark (&:where(.dark, .dark *));`}
      </CodeBlock>

      <Callout tone="tip" title="Monorepo">
        Pointing <InlineCode>@source</InlineCode> at the package source path (rather than the published bundle) is
        fine when you're iterating in a workspace.
      </Callout>

      <Prose>
        <h2 id="theme">Light &amp; dark mode</h2>
        <p>
          Wire components are theme-aware via Tailwind&rsquo;s <InlineCode>dark:</InlineCode> variant. There&rsquo;s no
          provider — add or remove the <InlineCode>dark</InlineCode> class on{" "}
          <InlineCode>{`<html>`}</InlineCode> and every component follows.
        </p>
      </Prose>
      <CodeBlock language="ts">
        {`// somewhere in your app
function setTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("wire-theme", theme);
}`}
      </CodeBlock>

      <Prose>
        <h2 id="smoke-test">Verify the install</h2>
        <p>
          Drop this component anywhere in your app. If you see the trigger card with its kind chip and title, install
          + Tailwind setup are wired correctly.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`"use client";

import {
  WireProvider,
  WireCanvas,
  type WireDiagram
} from "@aigentive/wire-react";

const diagram: WireDiagram = {
  version: 1,
  id: "smoke-test",
  layout: "LR",
  nodes: [
    { id: "in", kind: "trigger", title: "It works" }
  ],
  edges: []
};

export function SmokeTest() {
  return (
    <div style={{ height: 240 }}>
      <WireProvider defaultDiagram={diagram}>
        <WireCanvas mode="view" fitView showControls={false} showMiniMap={false} />
      </WireProvider>
    </div>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="optional-tooling">Optional tooling</h2>
        <p>
          Two companion packages help you author and integrate diagrams outside the React tree.
        </p>
        <ul>
          <li>
            <strong><InlineCode>@aigentive/wire-cli</InlineCode>.</strong> <InlineCode>wire init</InlineCode>,{" "}
            <InlineCode>wire add</InlineCode>, and <InlineCode>wire export</InlineCode> for shell-driven scaffolding
            and SVG/Mermaid exports.
          </li>
          <li>
            <strong><InlineCode>@aigentive/wire-mcp</InlineCode>.</strong> An MCP server (stdio + streamable HTTP) so
            agents can read, validate, and edit diagrams using the same canonical schema.
          </li>
        </ul>

        <h2 id="next">What&rsquo;s next</h2>
        <p>
          You&rsquo;ve got the package and styles in place. The <a href="/quickstart">Quickstart</a> picks an API path
          and renders a working canvas. From there, the <a href="/concepts">mental model</a> covers how Wire&rsquo;s
          schema, actions, and events fit together.
        </p>
      </Prose>
    </DocsPage>
  );
}
