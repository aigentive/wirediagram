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
      description="Add the package, import the stylesheet, and render a verified Wire surface without extra CSS tooling."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Install" }]}
      next={{ href: "/docs/quickstart", label: "Quickstart" }}
    >
      <Prose>
        <h2 id="install">Install</h2>
        <p>
          The interactive canvas, editor shells, and viewer components ship inside{" "}
          <InlineCode>@aigentive/wire-react</InlineCode>. React and React DOM 18 or newer are peer dependencies.
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
          Import the package stylesheet once in your client app entry, root layout, or bundled stylesheet entry. React
          consumers do not need to install or configure Tailwind for Wire. npm consumers do not need to point a CSS
          compiler at the package source.
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
        <h2 id="app-boundaries">App boundaries</h2>
        <p>
          Wire editor surfaces are interactive React components. In server-rendered app frameworks, place the Wire
          component behind a client boundary and import the CSS from the app entry or root layout. In single-page build
          tools, import the CSS once from the application entry before rendering React.
        </p>
        <ul>
          <li>
            <strong>Client boundary.</strong> Use client-only modules for <InlineCode>WireProvider</InlineCode>,{" "}
            <InlineCode>WireCanvas</InlineCode>, <InlineCode>WireWorkspace</InlineCode>,{" "}
            <InlineCode>WireEditor</InlineCode>, and <InlineCode>WireViewer</InlineCode>.
          </li>
          <li>
            <strong>Stable height.</strong> The canvas reads its parent box. Give the parent a height, min-height, or
            grid track so pan, zoom, and fit view have real bounds.
          </li>
          <li>
            <strong>Persist only JSON.</strong> Store <InlineCode>WireDiagram</InlineCode>, not viewport, selection,
            inspector state, callbacks, option catalog functions, or rendered output.
          </li>
        </ul>
      </Prose>

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
          Drop this client component into an app route. If you see the trigger card with its kind chip and title,
          install and CSS import are wired correctly.
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
          and renders a working canvas. From there, the <a href="/docs/examples">examples hub</a> and{" "}
          <a href="/docs/production">production guide</a> cover adoption details.
        </p>
      </Prose>
    </DocsPage>
  );
}
