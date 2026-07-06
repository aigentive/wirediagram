"use client";

import Link from "next/link";
import {
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  Code2,
  GitBranch,
  MousePointerClick,
  Palette,
  Play,
  Rocket,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import { WireViewer } from "@aigentive/wire-react";
import { DocsPage } from "./_components/DocsPage";
import { PRODUCTION_DIAGRAM } from "./examples/production-shared";

type LinkTuple = [href: string, label: string];

const HERO_CHIPS = ["@aigentive/wire-react", "WireDiagram", "WireAction", "styles.css"];

const API_PROOFS = [
  {
    value: "@aigentive/wire-react",
    label: "React package",
    detail: "WireViewer, WireEditor, WireWorkspace"
  },
  {
    value: "WireDiagram",
    label: "Durable JSON",
    detail: "persist, validate, render, share"
  },
  {
    value: "WireAction",
    label: "Reducer actions",
    detail: "human, CLI, and MCP edits"
  },
  {
    value: "styles.css",
    label: "No Tailwind setup",
    detail: "CSS variables and colorMode"
  }
];

const PRIMARY_PATHS: Array<{ href: string; eyebrow: string; title: string; detail: string; icon: LucideIcon }> = [
  {
    href: "/docs/install",
    eyebrow: "Start",
    title: "Install Wire",
    detail: "Add the React package, import the stylesheet, and render a real diagram.",
    icon: Rocket
  },
  {
    href: "/docs/examples",
    eyebrow: "Learn",
    title: "Browse examples",
    detail: "Viewer, editor shell, options, theming, accessibility, and click workflows.",
    icon: Boxes
  },
  {
    href: "/docs/production",
    eyebrow: "Ship",
    title: "Production guide",
    detail: "Persistence, validation, client boundaries, MCP, CLI, and release gates.",
    icon: ShieldCheck
  }
];

const ROLE_TRACKS: Array<{ title: string; summary: string; icon: LucideIcon; links: LinkTuple[] }> = [
  {
    title: "React developers",
    summary: "Embed viewers, build editors, and keep app state canonical.",
    icon: Braces,
    links: [
      ["/docs/install", "Install"],
      ["/docs/quickstart", "Quickstart"],
      ["/docs/examples/package-css", "Package CSS"],
      ["/docs/api/react-components", "Components"]
    ]
  },
  {
    title: "Product teams",
    summary: "Use WireWorkspace or compose your own shell around provider hooks.",
    icon: MousePointerClick,
    links: [
      ["/docs/examples/custom-shell", "Custom shell"],
      ["/docs/examples/controlled-state", "Controlled state"],
      ["/docs/customize/options", "Options"],
      ["/docs/listen", "Events"]
    ]
  },
  {
    title: "Agent workflows",
    summary: "Generate, patch, validate, render, and repair diagrams with MCP or CLI.",
    icon: Bot,
    links: [
      ["/docs/llm", "LLM docs"],
      ["/docs/mcp", "MCP server"],
      ["/docs/cli", "CLI"],
      ["/docs/api/wire-core", "wire-core"]
    ]
  }
];

const FEATURE_CARDS: Array<{ href: string; title: string; detail: string; icon: LucideIcon }> = [
  {
    href: "/docs/api/react-components",
    title: "Component API that starts high-level",
    detail: "Use WireViewer, WireEditor, WireWorkspace, or WireProvider plus WireCanvas.",
    icon: Code2
  },
  {
    href: "/docs/customize/options",
    title: "Catalog-driven inspectors",
    detail: "WireOptionCatalog and WireOptionPanel give product fields without changing the schema.",
    icon: Palette
  },
  {
    href: "/docs/llm",
    title: "Agent-native docs",
    detail: "Schema, validation, SKILL.md, and task recipes are available as machine-readable routes.",
    icon: GitBranch
  },
  {
    href: "/docs/production",
    title: "Release discipline built in",
    detail: "Docs checks cover snippets, links, package CSS, agent skill, examples, and API names.",
    icon: CheckCircle2
  }
];

const QUICK_LINKS: LinkTuple[] = [
  ["/docs/quickstart", "Quickstart"],
  ["/docs/examples/wrappers", "Viewer and editor wrappers"],
  ["/docs/examples/options", "Option catalog example"],
  ["/docs/examples/edge-inspection", "Edge inspection"],
  ["/docs/api/hooks", "Provider hooks"],
  ["/llm/wire-docs.shape.json", "LLM manifest"]
];

export default function DocsLanding() {
  return (
    <DocsPage
      title="Wire documentation"
      showToc={false}
      wide
      hideHeader
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(540px,1fr)] lg:items-center">
        <div className="grid gap-5">
          <div className="grid gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-wire bg-wire-surface px-3 py-2 text-[12px] font-bold text-wire-secondary shadow-wire-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Docs for @aigentive/wire-react
            </span>
            <h1 className="m-0 max-w-[760px] text-[36px] font-bold leading-[1.07] tracking-normal text-wire-primary sm:text-[48px] lg:text-[54px]">
              Build React workflow diagrams that agents can safely edit.
            </h1>
            <p className="m-0 max-w-[720px] text-[16px] leading-8 text-wire-secondary sm:text-[17px]">
              Install <code className="font-mono text-[0.92em] text-wire-primary">@aigentive/wire-react</code>,
              render <code className="font-mono text-[0.92em] text-wire-primary">WireViewer</code> or{" "}
              <code className="font-mono text-[0.92em] text-wire-primary">WireEditor</code>, and keep every
              human, CLI, and MCP edit on <code className="font-mono text-[0.92em] text-wire-primary">WireDiagram</code>{" "}
              plus <code className="font-mono text-[0.92em] text-wire-primary">WireAction</code>.
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Primary Wire APIs">
              {HERO_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-wire bg-wire-surface px-2.5 py-1.5 font-mono text-[11px] font-bold text-wire-secondary shadow-wire-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/install"
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-wire-primary px-4 py-2.5 text-[14px] font-bold text-wire-surface no-underline shadow-wire-sm transition-transform hover:-translate-y-0.5"
            >
              <Play size={15} aria-hidden strokeWidth={2} />
              Install React package
            </Link>
            <Link
              href="/docs/examples"
              className="inline-flex min-h-12 items-center gap-2 rounded-md border border-wire bg-wire-surface px-4 py-2.5 text-[14px] font-bold text-wire-primary no-underline shadow-wire-sm transition-colors hover:border-wire-strong hover:bg-wire-sunken"
            >
              See examples
            </Link>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:gap-3">
            {API_PROOFS.map((stat) => (
              <div key={stat.label} className="grid gap-1 rounded-lg border border-wire bg-wire-surface p-3 shadow-wire-sm sm:p-4">
                <dt className="break-words font-mono text-[11px] font-bold leading-snug text-wire-primary sm:text-[12px]">
                  {stat.value}
                </dt>
                <dd className="m-0 grid gap-0.5">
                  <span className="text-[12px] font-bold leading-snug text-wire-primary sm:text-[13px]">{stat.label}</span>
                  <span className="text-[11px] leading-snug text-wire-tertiary sm:text-[12px]">{stat.detail}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="overflow-hidden rounded-lg border border-wire bg-wire-surface shadow-[0_18px_60px_rgba(15,23,42,0.14)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wire bg-wire-sunken px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
              <span className="ml-2 hidden font-mono text-[11px] font-bold text-wire-tertiary sm:inline">
                agent-router.json
              </span>
            </div>
            <div className="flex items-center gap-1">
              {["Canvas", "JSON", "MCP"].map((label, index) => (
                <span
                  key={label}
                  className={
                    index === 0
                      ? "rounded-md bg-wire-primary px-2 py-1 text-[11px] font-bold text-wire-surface"
                      : "rounded-md px-2 py-1 text-[11px] font-bold text-wire-tertiary"
                  }
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="relative h-[420px] bg-wire-canvas sm:h-[440px]">
            <div className="hidden h-full sm:block">
              <WireViewer
                diagram={PRODUCTION_DIAGRAM}
                fitView={false}
                defaultViewport={{ x: -210, y: 84, zoom: 0.64 }}
                showControls={false}
                showMiniMap={false}
                panOnDrag={false}
                zoomOnScroll={false}
                colorMode="system"
              />
            </div>
            <div className="h-full sm:hidden">
              <WireViewer
                diagram={PRODUCTION_DIAGRAM}
                fitView={false}
                defaultViewport={{ x: -390, y: 100, zoom: 0.64 }}
                showControls={false}
                showMiniMap={false}
                panOnDrag={false}
                zoomOnScroll={false}
                colorMode="system"
              />
            </div>
            <div className="pointer-events-none absolute inset-x-4 bottom-4 hidden gap-2 sm:grid sm:grid-cols-2">
              <div className="rounded-md border border-wire bg-wire-surface/95 px-3 py-2 shadow-wire-sm">
                <div className="wire-eyebrow wire-eyebrow--muted">Durable contract</div>
                <div className="mt-1 font-mono text-[12px] font-bold text-wire-primary">WireDiagram</div>
              </div>
              <div className="rounded-md border border-wire bg-wire-surface/95 px-3 py-2 shadow-wire-sm">
                <div className="wire-eyebrow wire-eyebrow--muted">Shared reducer</div>
                <div className="mt-1 font-mono text-[12px] font-bold text-wire-primary">WireAction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {PRIMARY_PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <Link
              key={path.href}
              href={path.href}
              className="group grid content-start gap-3 rounded-lg border border-wire bg-wire-surface p-5 no-underline shadow-wire-sm transition-colors hover:border-wire-strong hover:bg-wire-sunken"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-wire bg-wire-sunken text-wire-secondary transition-colors group-hover:text-wire-primary">
                  <Icon size={17} aria-hidden strokeWidth={1.7} />
                </span>
                <span className="text-[14px] font-bold text-wire-link transition-transform group-hover:translate-x-0.5">
                  -&gt;
                </span>
              </span>
              <span className="grid gap-1">
                <span className="wire-eyebrow">{path.eyebrow}</span>
                <span className="text-[18px] font-bold leading-snug text-wire-primary">{path.title}</span>
                <span className="text-[13px] leading-6 text-wire-secondary">{path.detail}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4">
        <div className="grid max-w-[760px] gap-2">
          <span className="wire-eyebrow">Choose a track</span>
          <h2 className="m-0 text-[28px] font-bold leading-tight text-wire-primary">Start where your work starts.</h2>
          <p className="m-0 text-[15px] leading-7 text-wire-secondary">
            The docs are organized around real jobs: embedding Wire in React, building product editors, and letting
            agents create or repair diagrams.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {ROLE_TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.title} className="grid content-start gap-4 rounded-lg border border-wire bg-wire-surface p-5 shadow-wire-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-wire bg-wire-sunken text-wire-secondary">
                    <Icon size={17} aria-hidden strokeWidth={1.7} />
                  </span>
                  <span className="grid gap-1">
                    <h3 className="m-0 text-[17px] font-bold text-wire-primary">{track.title}</h3>
                    <span className="text-[13px] leading-6 text-wire-secondary">{track.summary}</span>
                  </span>
                </div>
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
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid max-w-[760px] gap-2">
          <span className="wire-eyebrow">What Wire gives you</span>
          <h2 className="m-0 text-[28px] font-bold leading-tight text-wire-primary">One model across UI and agents.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {FEATURE_CARDS.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="group grid gap-2 rounded-lg border border-wire bg-wire-surface p-5 no-underline shadow-wire-sm hover:border-wire-strong hover:bg-wire-sunken"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[15px] font-bold text-wire-primary">
                    <Icon size={16} aria-hidden strokeWidth={1.7} className="text-wire-tertiary" />
                    {feature.title}
                  </span>
                  <span aria-hidden className="text-[14px] font-bold text-wire-link transition-transform group-hover:translate-x-0.5">
                    -&gt;
                  </span>
                </span>
                <span className="text-[13px] leading-6 text-wire-secondary">{feature.detail}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-wire bg-wire-surface p-5 shadow-wire-sm md:grid-cols-[minmax(0,0.72fr)_minmax(260px,0.28fr)] md:items-center">
        <div className="grid gap-2">
          <span className="wire-eyebrow">Fast paths</span>
          <h2 className="m-0 text-[24px] font-bold leading-tight text-wire-primary">Go straight to the thing you need.</h2>
          <p className="m-0 text-[14px] leading-7 text-wire-secondary">
            These links cover the most common evaluation and implementation paths without forcing a linear tutorial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border border-wire bg-wire-sunken px-2.5 py-1.5 text-[12px] font-bold text-wire-secondary no-underline hover:border-wire-strong hover:text-wire-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </DocsPage>
  );
}
