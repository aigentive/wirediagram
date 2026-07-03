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
      description="Add the package, import the stylesheet, render your first canvas."
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
        <h2 id="package-css">Package CSS</h2>
        <p>
          Import the package stylesheet once in your app entry. npm consumers do not need to point a CSS compiler at
          the package source.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`import "@aigentive/wire-react/styles.css";`}
      </CodeBlock>

      <Callout tone="tip" title="Host styling">
        Your app can still use its own CSS stack around Wire. Use <InlineCode>colorMode</InlineCode>,{" "}
        <InlineCode>unstyled</InlineCode>, slot <InlineCode>classNames</InlineCode>, and CSS variables when you need
        tighter design-system integration.
      </Callout>

      <Prose>
        <h2 id="theme">Light &amp; dark mode</h2>
        <p>
          Wire surfaces accept <InlineCode>colorMode=&quot;light&quot;</InlineCode>,{" "}
          <InlineCode>colorMode=&quot;dark&quot;</InlineCode>, or{" "}
          <InlineCode>colorMode=&quot;system&quot;</InlineCode>. You can also override the package CSS variables in your
          app stylesheet.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  colorMode="system"
/>`}
      </CodeBlock>

      <Prose>
        <h2 id="smoke-test">Verify the install</h2>
        <p>
          Drop this component anywhere in your app. If you see the trigger card with its kind chip and title, install
          and CSS import are wired correctly.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`"use client";

import "@aigentive/wire-react/styles.css";
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
          You&rsquo;ve got the package and styles in place. The <a href="/docs/quickstart">Quickstart</a> picks an API path
          and renders a working canvas. From there, the <a href="/docs/concepts">mental model</a> covers how Wire&rsquo;s
          schema, actions, and events fit together.
        </p>
      </Prose>
    </DocsPage>
  );
}
