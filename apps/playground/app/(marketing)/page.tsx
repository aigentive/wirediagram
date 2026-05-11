import Link from "next/link";
import { ArrowRight, Boxes, Code2, GitBranch, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { CodeBlock, Shell } from "../docs/_components/CodeBlock";
import { GITHUB_REPO_URL } from "../_components/GithubRepoLink";
import { HeroDiagram } from "./_components/HeroDiagram";

const MCP_CONFIG = `{
  "mcpServers": {
    "wire": {
      "command": "npx",
      "args": ["-y", "@aigentive/wire-mcp@latest"],
      "env": {
        "WIRE_STORAGE_DIR": "/absolute/path/to/diagrams"
      }
    }
  }
}`;

const REACT_SNIPPET = `import type { WireDiagram } from "@aigentive/wire-core";
import { WireEditor } from "@aigentive/wire-react";

export function WorkflowEditor({
  diagram,
  onChange
}: {
  diagram: WireDiagram;
  onChange: (d: WireDiagram) => void;
}) {
  return <WireEditor diagram={diagram} onChange={onChange} fitView />;
}`;

const CLI_SNIPPET = `npm install -g @aigentive/wire-cli

wire init my-flow --template=approval-flow
wire add ai --diagram=my-flow --title="Classify" \\
  --from=incoming --model=gpt-4.1-mini
wire validate my-flow
wire export my-flow --format=svg --out=my-flow.svg`;

const MCP_SNIPPET = `# stdio (default)
npx -y @aigentive/wire-mcp@latest

# or HTTP transport on :3860
npx -y @aigentive/wire-mcp@latest --http`;

const PACKAGES = [
  { name: "@aigentive/wire-core", desc: "Schema, validation, IDs, normalize, layout, the WireAction reducer." },
  { name: "@aigentive/wire-react", desc: "Editor, viewer, canvas, palette, inspector, hooks, JSX facade." },
  { name: "@aigentive/wire-renderers", desc: "Static SVG, PNG helpers, Mermaid, optional React Flow conversion." },
  { name: "@aigentive/wire-mcp", desc: "MCP server over stdio + streamable-HTTP with the full tool surface." },
  { name: "@aigentive/wire-cli", desc: "wire init · add · validate · export · ls." },
  { name: "apps/playground", desc: "Self-hostable Next.js editor, share API, and renderer service." }
];

export default function MarketingLanding() {
  return (
    <>
      <Hero />
      <WhyWire />
      <McpSection />
      <AuthoringPaths />
      <WhatsInTheBox />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 85% 0%, var(--mkt-glow-blue-strong), transparent 60%),
            radial-gradient(ellipse 60% 50% at 0% 100%, var(--mkt-glow-violet), transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, var(--mkt-glow-mint), transparent 70%)
          `
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--mkt-fade-edge) 20%, var(--mkt-fade-edge) 80%, transparent)"
        }}
      />
      <div className="mx-auto grid max-w-[1180px] gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid content-center gap-7">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-wire bg-wire-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-secondary">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-wire-status-valid" />
              Open source · Apache-2.0 · MCP-native
            </span>
          </div>

          <div className="grid gap-5">
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-wire-primary sm:text-[48px] lg:text-[56px]">
              Diagrams agents{" "}
              <span style={{ color: "var(--wire-fg-link)" }}>can actually edit</span>.
            </h1>
            <p className="max-w-[540px] text-[16px] leading-[1.55] text-wire-secondary sm:text-[17px]">
              An open-source diagram library where agents edit structured graphs — not Mermaid
              blobs, fragile JSX, or static PNGs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[14px] font-bold text-white no-underline transition-colors duration-150 hover:brightness-110"
              style={{ backgroundColor: "var(--wire-fg-link)" }}
            >
              Get started
              <ArrowRight size={14} aria-hidden strokeWidth={2.25} />
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-wire bg-wire-surface px-4 py-2.5 text-[14px] font-bold text-wire-primary no-underline transition-colors duration-150 hover:border-wire-strong hover:bg-wire-sunken"
            >
              <GithubMark />
              Star on GitHub
            </a>
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-2.5 text-[13px] font-semibold text-wire-secondary no-underline transition-colors duration-150 hover:text-wire-primary"
            >
              Try the playground
              <ArrowRight size={12} aria-hidden strokeWidth={2.25} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-[12px] text-wire-tertiary">
            <InstallChip>
              <span className="text-wire-tertiary">$</span>{" "}
              <span className="text-wire-secondary">npx -y @aigentive/wire-mcp@latest</span>
            </InstallChip>
          </div>
        </div>

        <div className="grid content-center">
          <HeroDiagram />
        </div>
      </div>
    </section>
  );
}

function InstallChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-wire bg-wire-surface px-2.5 py-1 font-mono text-[11.5px]">
      {children}
    </span>
  );
}

function GithubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.49-2.7-1.08-2.7-1.08-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82A7.56 7.56 0 0 1 8 3.88c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.18c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  );
}

function WhyWire() {
  const cards: Array<{ icon: typeof GitBranch; title: string; body: React.ReactNode }> = [
    {
      icon: GitBranch,
      title: "Canonical JSON",
      body: (
        <>
          One schema across React, MCP, CLI, and static renderers. <Code>from</Code>, <Code>branch</Code>,{" "}
          <Code>attachedTo</Code>, <Code>tone</Code>, handles, routing — semantics designed to be
          unambiguous to LLMs.
        </>
      )
    },
    {
      icon: Boxes,
      title: "Same model, three surfaces",
      body: (
        <>
          Render the same <Code>WireDiagram</Code> as an interactive canvas, a static SVG, or a
          Mermaid string. The toolbar on every example flips between them live.
        </>
      )
    },
    {
      icon: ShieldCheck,
      title: "Shared action reducer",
      body: (
        <>
          Every human, hosted editor, CLI, and MCP edit flows through one <Code>WireAction</Code>{" "}
          reducer. Direct MCP tools and React gestures map to the same actions.
        </>
      )
    }
  ];

  return (
    <section className="relative overflow-hidden">
      <SoftDivider position="top" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 0%, var(--mkt-glow-blue), transparent 70%)`
        }}
      />
      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-12 grid max-w-[720px] gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-link">
            Why Wire
          </span>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-wire-primary sm:text-[34px]">
            Wire fixes the model, not the prompt.
          </h2>
          <p className="text-[15px] leading-[1.6] text-wire-secondary">
            Mermaid blobs that almost render. JSX trees that go fragile on edit. PNGs an agent
            can&rsquo;t revise. Wire gives agents a structured graph they can read, mutate, validate,
            and re-render — same canonical model behind the JSX developer surface and the MCP tool
            surface.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group grid content-start gap-3 rounded-lg border border-wire bg-wire-surface p-5 shadow-wire-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-wire-strong hover:shadow-wire-md"
              >
                <span className="grid h-9 w-9 place-items-center rounded-md border border-wire bg-wire-sunken text-wire-secondary">
                  <Icon size={16} aria-hidden strokeWidth={1.5} />
                </span>
                <h3 className="text-[16px] font-bold leading-snug tracking-tight text-wire-primary">
                  {card.title}
                </h3>
                <p className="text-[13px] leading-[1.6] text-wire-secondary">{card.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-wire-sunken px-1 py-px font-mono text-[12px] text-wire-primary">
      {children}
    </code>
  );
}

function McpSection() {
  return (
    <section className="relative overflow-hidden bg-wire-sunken/40">
      <SoftDivider position="top" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 60% 60% at 95% 50%, var(--mkt-glow-blue), transparent 60%)`
        }}
      />
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:px-8 lg:py-24">
        <div className="grid content-center gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-link">
            MCP-native
          </span>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-wire-primary sm:text-[34px]">
            Drop Wire into any MCP client.
          </h2>
          <p className="text-[15px] leading-[1.6] text-wire-secondary">
            The MCP server ships diagram CRUD, direct action tools, atomic <code className="rounded bg-wire-surface px-1 py-0.5 font-mono text-[13px] text-wire-primary">apply_actions</code>,
            render tools, resources, and prompts over stdio or HTTP. Configure once and any
            compatible agent can author diagrams as structured graphs.
          </p>
          <ul className="m-0 grid list-none gap-2 p-0 text-[13px] text-wire-secondary">
            <FeatureLi>21 tools — create, edit, validate, render, batch apply.</FeatureLi>
            <FeatureLi>Resources at <span className="font-mono text-wire-primary">wire://diagrams/{`{id}`}.{`{ext}`}</span>.</FeatureLi>
            <FeatureLi>Built-in prompts for review, simplification, and reverse-engineering.</FeatureLi>
          </ul>
          <div className="pt-2">
            <Link
              href="/docs/mcp"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-wire-link no-underline hover:underline"
            >
              MCP clients setup
              <ArrowRight size={12} aria-hidden strokeWidth={2.25} />
            </Link>
          </div>
        </div>

        <div className="grid content-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
            claude_desktop_config.json
          </span>
          <CodeBlock language="json">{MCP_CONFIG}</CodeBlock>
        </div>
      </div>
    </section>
  );
}

function FeatureLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--wire-fg-link)" }}
      />
      <span className="leading-[1.6]">{children}</span>
    </li>
  );
}

function AuthoringPaths() {
  const paths = [
    {
      icon: Sparkles,
      eyebrow: "From an agent",
      title: "MCP server",
      body: "Any MCP-compatible agent reads and writes Wire JSON through the same reducer the editor uses.",
      cta: { label: "MCP setup", href: "/docs/mcp" },
      language: "shell",
      code: MCP_SNIPPET,
      kind: "shell" as const
    },
    {
      icon: Code2,
      eyebrow: "From a React app",
      title: "React library",
      body: "Drop in WireEditor. Pass diagram + onChange. Mode flips between view and edit.",
      cta: { label: "Quickstart", href: "/docs/quickstart" },
      language: "tsx",
      code: REACT_SNIPPET,
      kind: "code" as const
    },
    {
      icon: Terminal,
      eyebrow: "From the CLI",
      title: "wire CLI",
      body: "Generate, edit, validate, and export diagrams from a terminal. Templates included.",
      cta: { label: "CLI reference", href: "/docs/cli" },
      language: "shell",
      code: CLI_SNIPPET,
      kind: "shell" as const
    }
  ];

  return (
    <section className="relative overflow-hidden">
      <SoftDivider position="top" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 20% 100%, var(--mkt-glow-violet), transparent 70%)`
        }}
      />
      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-12 grid max-w-[720px] gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-link">
            Pick a surface
          </span>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-wire-primary sm:text-[34px]">
            Three authoring paths. Same canonical JSON.
          </h2>
          <p className="text-[15px] leading-[1.6] text-wire-secondary">
            Whichever entry point your team uses, the diagram on disk is identical. Mix and match
            across humans, agents, and CI.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {paths.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="group grid content-start gap-4 rounded-lg border border-wire bg-wire-surface p-5 shadow-wire-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-wire-strong hover:shadow-wire-md"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-wire bg-wire-sunken text-wire-secondary">
                    <Icon size={14} aria-hidden strokeWidth={1.75} />
                  </span>
                  <div className="grid gap-0.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
                      {p.eyebrow}
                    </span>
                    <span className="text-[15px] font-bold tracking-tight text-wire-primary">
                      {p.title}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] leading-[1.6] text-wire-secondary">{p.body}</p>
                <div className="min-w-0">
                  {p.kind === "shell" ? (
                    <Shell>{p.code}</Shell>
                  ) : (
                    <CodeBlock language={p.language}>{p.code}</CodeBlock>
                  )}
                </div>
                <Link
                  href={p.cta.href}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-wire-link no-underline hover:underline"
                >
                  {p.cta.label}
                  <ArrowRight size={12} aria-hidden strokeWidth={2.25} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhatsInTheBox() {
  return (
    <section className="relative overflow-hidden bg-wire-sunken/40">
      <SoftDivider position="top" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 40% 50% at 0% 50%, var(--mkt-glow-mint), transparent 70%)`
        }}
      />
      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 grid max-w-[720px] gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-link">
            What&rsquo;s in the box
          </span>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-wire-primary sm:text-[34px]">
            A small surface, organized around one canonical model.
          </h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-wire bg-wire-surface">
          <ul className="m-0 grid list-none divide-y divide-wire p-0">
            {PACKAGES.map((pkg) => (
              <li
                key={pkg.name}
                className="grid items-baseline gap-x-6 gap-y-1 px-5 py-4 transition-colors duration-150 hover:bg-wire-sunken sm:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]"
              >
                <span className="font-mono text-[13px] font-semibold text-wire-primary">{pkg.name}</span>
                <span className="text-[13px] leading-[1.55] text-wire-secondary">{pkg.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#0b1220" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: "url(/marketing/hero-bg.png)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(96, 165, 250, 0.18), transparent 60%),
            radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124, 58, 237, 0.18), transparent 60%),
            linear-gradient(to bottom, rgba(11, 18, 32, 0.4), rgba(11, 18, 32, 0.65))
          `
        }}
      />
      <div className="relative mx-auto max-w-[820px] px-4 py-24 text-center sm:px-6 lg:py-32">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-300">
          Get started
        </span>
        <h2 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.01em] text-white sm:text-[44px]">
          Start in two commands.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.6] text-slate-300">
          Install the React library or spin up the MCP server locally. Both render from the same
          canonical{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[13px] text-white">
            WireDiagram
          </code>
          .
        </p>
        <div className="mx-auto mt-8 max-w-[520px] text-left">
          <Shell>{`npm install @aigentive/wire-react\nnpx -y @aigentive/wire-mcp@latest`}</Shell>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2.5 text-[14px] font-bold text-slate-900 no-underline transition-colors duration-150 hover:bg-slate-100"
          >
            Read the docs
            <ArrowRight size={14} aria-hidden strokeWidth={2.25} />
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-2.5 text-[14px] font-bold text-white no-underline backdrop-blur transition-colors duration-150 hover:border-white/40 hover:bg-white/10"
          >
            <GithubMark />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function SoftDivider({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 h-px"
      style={{
        top: position === "top" ? 0 : undefined,
        bottom: position === "bottom" ? 0 : undefined,
        background:
          "linear-gradient(to right, transparent, var(--mkt-fade-edge) 18%, var(--mkt-fade-edge) 82%, transparent)"
      }}
    />
  );
}
