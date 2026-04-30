import Link from "next/link";
import {
  Boxes,
  Lightbulb,
  MousePointerClick,
  Rocket,
  Sliders,
  type LucideIcon
} from "lucide-react";
import { DocsPage } from "./_components/DocsPage";
import { Prose, InlineCode } from "./_components/Prose";

const PATHS: Array<{ href: string; eyebrow: string; title: string; detail: string; icon: LucideIcon }> = [
  {
    href: "/install",
    eyebrow: "Get started",
    title: "Install & setup",
    detail: "Add the package, point Tailwind at the source, render your first canvas.",
    icon: Rocket
  },
  {
    href: "/concepts",
    eyebrow: "Concepts",
    title: "How Wire thinks",
    detail: "Diagram JSON, the action reducer, decoupled events, typed options, render contracts.",
    icon: Lightbulb
  },
  {
    href: "/customize/cards",
    eyebrow: "Customize",
    title: "Make it yours",
    detail: "Replace node cards, list rows, and group frames without touching canvas internals.",
    icon: Sliders
  }
];

const HIGHLIGHT_TASKS: Array<{ href: string; title: string; detail: string; icon: LucideIcon }> = [
  { href: "/customize/cards", title: "Custom node renderers", detail: "Three example surfaces from the same context object.", icon: Sliders },
  { href: "/listen", title: "Listen to clicks", detail: "Five event types, two built-in emitters, one onEvent.", icon: MousePointerClick },
  { href: "/examples/layouts", title: "Layouts", detail: "Router, vertical, and horizontal flows from the same nodes.", icon: Boxes },
  { href: "/examples/click-modal", title: "Click → modal", detail: "Surface params in a dialog using onEvent + WireOptionPanel.", icon: MousePointerClick }
];

export default function DocsLanding() {
  return (
    <DocsPage
      title="Wire React Components"
      description={
        <>
          A typed diagram schema, a layout engine, and a small set of React components that render the same{" "}
          <InlineCode>WireDiagram</InlineCode> as an interactive canvas, a static SVG, or a Mermaid string.
        </>
      }
      showToc={false}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <Link
              key={path.href}
              href={path.href}
              className="group grid content-start gap-2 rounded-lg border border-wire bg-wire-surface p-5 no-underline transition-colors hover:border-wire-strong hover:bg-wire-sunken"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-wire-sunken text-wire-primary">
                <Icon size={16} aria-hidden strokeWidth={1.5} />
              </span>
              <span className="wire-eyebrow">{path.eyebrow}</span>
              <span className="text-[17px] font-bold tracking-tight text-wire-primary">{path.title}</span>
              <span className="text-[13px] leading-6 text-wire-secondary">{path.detail}</span>
              <span aria-hidden className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-blue-600">
                Read
                <span className="inline-block transition-transform group-hover:translate-x-0.5">{"→"}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <Prose>
        <h2 id="what-you-get">What you get</h2>
        <p>
          The package ships a small surface organized around one canonical{" "}
          <InlineCode>WireDiagram</InlineCode>. Apps import Wire-level props; the canvas engine stays internal.
        </p>
        <ul>
          <li>
            <strong>Provider &amp; canvas.</strong> <InlineCode>WireProvider</InlineCode> holds diagram, selection,
            viewport, validation, mode, and history. <InlineCode>WireCanvas</InlineCode> renders it through the native
            canvas with view/edit modes, fitView, background, and minimap toggles.
          </li>
          <li>
            <strong>Higher-level shells.</strong> <InlineCode>WireWorkspace</InlineCode> bundles provider + sidebar +
            canvas + inspector for the &ldquo;drop in and ship&rdquo; case.{" "}
            <InlineCode>WireViewer</InlineCode> is read-only; <InlineCode>WireEditor</InlineCode> is a thinner editable
            wrapper.
          </li>
          <li>
            <strong>Typed options.</strong> Declare a <InlineCode>WireOptionCatalog</InlineCode> once;{" "}
            <InlineCode>WireOptionPanel</InlineCode> and <InlineCode>WireInspector</InlineCode> render the form and
            patch the diagram via <InlineCode>node.patch</InlineCode> actions.
          </li>
          <li>
            <strong>Decoupled events.</strong> Five event types — <InlineCode>node.click</InlineCode>,{" "}
            <InlineCode>node.inspect</InlineCode>, <InlineCode>edge.click</InlineCode>,{" "}
            <InlineCode>selection.change</InlineCode>, <InlineCode>pane.click</InlineCode> — each carrying a{" "}
            <InlineCode>source</InlineCode> label so you can tell a canvas click from a node-list click.
          </li>
          <li>
            <strong>Hooks.</strong> <InlineCode>useWireDiagram</InlineCode>,{" "}
            <InlineCode>useWireSelection</InlineCode>, <InlineCode>useWireViewport</InlineCode>,{" "}
            <InlineCode>useWireMode</InlineCode>, <InlineCode>useWireHistory</InlineCode>,{" "}
            <InlineCode>useWireDispatch</InlineCode>, and friends — read or drive any slice of provider state from your
            own components.
          </li>
          <li>
            <strong>Static renders.</strong> <InlineCode>renderToSvg</InlineCode> and{" "}
            <InlineCode>toMermaid</InlineCode> from <InlineCode>@aigentive/wire-core</InlineCode> emit the same diagram
            as a self-contained SVG string or a Mermaid <InlineCode>flowchart</InlineCode>.
          </li>
          <li>
            <strong>Theme.</strong> Class-based dark mode (<InlineCode>{`<html class="dark">`}</InlineCode>); no
            provider, no context, just a Tailwind variant.
          </li>
        </ul>

        <h2 id="two-authoring-paths">Two authoring paths</h2>
        <p>
          Everything compiles down to the same canonical JSON. Pick the path that fits the surface you&rsquo;re
          building.
        </p>
        <ul>
          <li>
            <strong>JSON.</strong> Hand-write a <InlineCode>WireDiagram</InlineCode> object — or have an LLM, the CLI,
            or the MCP server emit one — and render it through <InlineCode>WireProvider</InlineCode> +{" "}
            <InlineCode>WireCanvas</InlineCode>. This is what every page under{" "}
            <Link href="/examples/layouts">Examples</Link> does.
          </li>
          <li>
            <strong>JSX facade.</strong> Compose the diagram as React children of <InlineCode>{`<Flow>`}</InlineCode>{" "}
            using <InlineCode>{`<TriggerNode>`}</InlineCode>, <InlineCode>{`<AINode>`}</InlineCode>,{" "}
            <InlineCode>{`<ConditionNode>`}</InlineCode>, etc. The walker compiles the tree to canonical JSON; the same
            renderer takes it from there.
          </li>
        </ul>

        <h2 id="where-to-render">Where to render</h2>
        <p>
          The same diagram has three rendering surfaces. The toolbar on every card in{" "}
          <Link href="/examples/layouts">Layouts</Link> flips between them live.
        </p>
        <ul>
          <li>
            <strong>Interactive canvas.</strong> <InlineCode>WireCanvas</InlineCode> for pan/zoom, selection, edits,
            and click events.
          </li>
          <li>
            <strong>Static SVG.</strong> <InlineCode>renderToSvg(diagram)</InlineCode> returns a self-contained SVG
            string — server-renderable, embeddable in markdown, downloadable as a file.
          </li>
          <li>
            <strong>Mermaid.</strong> <InlineCode>toMermaid(diagram)</InlineCode> returns a{" "}
            <InlineCode>flowchart</InlineCode> source — paste into any Mermaid renderer or check it into a README.
          </li>
        </ul>

        <h2 id="common-tasks">Common tasks</h2>
      </Prose>

      <section className="grid gap-3 sm:grid-cols-2">
        {HIGHLIGHT_TASKS.map((task) => {
          const Icon = task.icon;
          return (
          <Link
            key={task.href}
            href={task.href}
            className="group grid content-start gap-1 rounded-lg border border-wire bg-wire-surface p-4 no-underline hover:border-wire-strong"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[14px] font-bold text-wire-primary">
                <Icon size={14} aria-hidden strokeWidth={1.5} className="text-wire-tertiary" />
                {task.title}
              </span>
              <span aria-hidden className="text-[14px] font-bold text-blue-600 transition-transform group-hover:translate-x-0.5">
                {"→"}
              </span>
            </div>
            <span className="text-[13px] leading-6 text-wire-secondary">{task.detail}</span>
          </Link>
        );
        })}
      </section>
    </DocsPage>
  );
}
