import Link from "next/link";
import {
  Bot,
  Boxes,
  Braces,
  Lightbulb,
  MousePointerClick,
  Rocket,
  TerminalSquare,
  type LucideIcon
} from "lucide-react";
import { DocsPage } from "./_components/DocsPage";
import { Prose, InlineCode } from "./_components/Prose";

const PATHS: Array<{ href: string; eyebrow: string; title: string; detail: string; icon: LucideIcon }> = [
  {
    href: "/docs/install",
    eyebrow: "Get started",
    title: "Install & setup",
    detail: "Add the package, import the stylesheet, render your first verified surface.",
    icon: Rocket
  },
  {
    href: "/docs/examples",
    eyebrow: "Examples",
    title: "See working surfaces",
    detail: "Package CSS, full editor shells, options, theming, accessibility, and click flows.",
    icon: Boxes
  },
  {
    href: "/docs/production",
    eyebrow: "Production",
    title: "Ship with confidence",
    detail: "Persistence, validation, CSS, client boundaries, MCP, CLI, and release checks.",
    icon: Lightbulb
  }
];

const ROLE_TRACKS = [
  {
    title: "React embed",
    links: [
      ["/docs/install", "Install"],
      ["/docs/quickstart", "Quickstart"],
      ["/docs/examples", "Examples"],
      ["/docs/production", "Production"],
      ["/docs/api/react-components", "API"]
    ]
  },
  {
    title: "Full editor",
    links: [
      ["/docs/quickstart#full-editor", "Workspace"],
      ["/docs/examples/custom-shell", "Custom shell"],
      ["/docs/examples/controlled-state", "Controlled state"],
      ["/docs/api/hooks", "Hooks"]
    ]
  },
  {
    title: "LLM / agent",
    links: [
      ["/docs/llm", "LLM docs"],
      ["/docs/mcp", "MCP"],
      ["/docs/api/wire-core", "Core"],
      ["/docs/cli", "CLI"]
    ]
  },
  {
    title: "Maintainer",
    links: [
      ["/docs/concepts", "Concepts"],
      ["/docs/customize/options", "Options"],
      ["/docs/listen", "Events"],
      ["/docs/production", "Release checks"]
    ]
  }
];

const HIGHLIGHT_TASKS: Array<{ href: string; title: string; detail: string; icon: LucideIcon }> = [
  {
    href: "/docs/api/react-components",
    title: "React component API",
    detail: "WireProvider, WireCanvas, WireWorkspace, WireInspector, WireEditor, and WireViewer.",
    icon: Braces
  },
  {
    href: "/docs/llm",
    title: "Agent workflows",
    detail: "Machine-readable schema, validation, recipes, and SKILL.md entry points.",
    icon: Bot
  },
  {
    href: "/docs/mcp",
    title: "MCP tools",
    detail: "Tool, resource, prompt, security, render, and validation behavior.",
    icon: MousePointerClick
  },
  {
    href: "/docs/cli",
    title: "CLI workflows",
    detail: "Initialize, add nodes, validate, export, list, and use the shell fallback.",
    icon: TerminalSquare
  }
];

export default function DocsLanding() {
  return (
    <DocsPage
      title="Wire documentation"
      description={
        <>
          Production docs for humans, React developers, and agent workflows. Everything centers on{" "}
          <InlineCode>WireDiagram</InlineCode> JSON and <InlineCode>WireAction</InlineCode> reducer actions.
        </>
      }
      showToc={false}
    >
      <section className="grid gap-3 md:grid-cols-3">
        {PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <Link
              key={path.href}
              href={path.href}
              className="group grid content-start gap-3 rounded-lg border border-wire bg-wire-surface p-4 no-underline shadow-wire-sm transition-colors duration-150 hover:border-wire-strong hover:bg-wire-sunken lg:p-5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md border border-wire bg-wire-sunken text-wire-secondary transition-colors group-hover:text-wire-primary">
                <Icon size={16} aria-hidden strokeWidth={1.5} />
              </span>
              <span className="grid gap-1">
                <span className="wire-eyebrow">{path.eyebrow}</span>
                <span className="text-[17px] font-bold leading-snug tracking-tight text-wire-primary">{path.title}</span>
                <span className="text-[13px] leading-6 text-wire-secondary">{path.detail}</span>
              </span>
              <span aria-hidden className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-wire-link">
                Read <span className="inline-block transition-transform group-hover:translate-x-0.5">{"->"}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <Prose>
        <h2 id="what-you-get">What you get</h2>
        <p>
          Wire uses one durable contract across the React package, CLI, MCP server, renderers, and agent docs. Apps
          persist <InlineCode>WireDiagram</InlineCode>; durable edits use <InlineCode>WireAction</InlineCode>.
        </p>
        <ul>
          <li>
            <strong>Provider and canvas.</strong> <InlineCode>WireProvider</InlineCode> holds diagram, selection,
            viewport, validation, mode, dirty state, and history. <InlineCode>WireCanvas</InlineCode> renders that
            state as an interactive surface.
          </li>
          <li>
            <strong>Higher-level shells.</strong> <InlineCode>WireWorkspace</InlineCode> bundles provider, sidebar,
            canvas, inspector, palette, and validation. <InlineCode>WireViewer</InlineCode> is read-only;{" "}
            <InlineCode>WireEditor</InlineCode> is a thinner editable wrapper.
          </li>
          <li>
            <strong>Typed options.</strong> Declare a <InlineCode>WireOptionCatalog</InlineCode> once;{" "}
            <InlineCode>WireOptionPanel</InlineCode> and <InlineCode>WireInspector</InlineCode> render forms and patch
            the diagram with reducer actions.
          </li>
          <li>
            <strong>Decoupled events.</strong> Node, edge, selection, and pane events carry a source label so app
            shells can distinguish canvas, inspector, node-list, option-panel, and API emissions.
          </li>
          <li>
            <strong>Package CSS.</strong> Import <InlineCode>@aigentive/wire-react/styles.css</InlineCode>. Customize
            with CSS variables, <InlineCode>colorMode</InlineCode>, <InlineCode>unstyled</InlineCode>, and slot{" "}
            <InlineCode>classNames</InlineCode>.
          </li>
        </ul>

        <h2 id="role-tracks">Choose a track</h2>
        <p>
          Start with the track closest to your task, then use concepts and API references when you need durable schema
          details.
        </p>
      </Prose>

      <section className="grid gap-3 md:grid-cols-2">
        {ROLE_TRACKS.map((track) => (
          <div key={track.title} className="grid gap-3 rounded-lg border border-wire bg-wire-surface p-4 shadow-wire-sm">
            <h3 className="m-0 text-[15px] font-bold text-wire-primary">{track.title}</h3>
            <div className="flex flex-wrap gap-2">
              {track.links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-wire bg-wire-sunken px-2.5 py-1.5 text-[12px] font-bold text-wire-secondary no-underline hover:border-wire-strong hover:text-wire-primary"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Prose>
        <h2 id="authoring-paths">Authoring paths</h2>
        <p>
          Everything compiles down to the same canonical JSON. Pick the path that fits the surface you are building.
        </p>
        <ul>
          <li>
            <strong>JSON.</strong> Hand-write a <InlineCode>WireDiagram</InlineCode>, have the CLI or MCP server emit
            one, or let an agent generate it. Render the same object through React, SVG, Mermaid, MCP, or CLI flows.
          </li>
          <li>
            <strong>React JSX facade.</strong> Compose a diagram with <InlineCode>{`<Flow>`}</InlineCode> and marker
            components, then compile it to canonical JSON with <InlineCode>compile</InlineCode> or{" "}
            <InlineCode>useCompiledWireDiagram</InlineCode>.
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
              className="group grid content-start gap-1 rounded-lg border border-wire bg-wire-surface p-4 no-underline shadow-wire-sm transition-colors duration-150 hover:border-wire-strong hover:bg-wire-sunken"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[14px] font-bold text-wire-primary">
                  <Icon size={14} aria-hidden strokeWidth={1.5} className="text-wire-tertiary" />
                  {task.title}
                </span>
                <span aria-hidden className="text-[14px] font-bold text-wire-link transition-transform group-hover:translate-x-0.5">
                  {"->"}
                </span>
              </div>
              <span className="text-[13px] leading-6 text-wire-secondary">{task.detail}</span>
            </Link>
          );
        })}
      </section>

      <Prose>
        <h2 id="next">Recommended order</h2>
        <ol>
          <li>
            Start with <Link href="/docs/install">Install</Link> and <Link href="/docs/quickstart">Quickstart</Link>.
          </li>
          <li>
            Browse the <Link href="/docs/examples">examples hub</Link> and production guide.
          </li>
          <li>
            Use <Link href="/docs/concepts">Concepts</Link>, <Link href="/docs/api/react-components">React API</Link>,
            MCP, CLI, and LLM docs as references.
          </li>
        </ol>
      </Prose>
    </DocsPage>
  );
}
