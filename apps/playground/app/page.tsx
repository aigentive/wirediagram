import Link from "next/link";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";

export const dynamic = "force-static";

export default function HomePage() {
  const templateNames = Object.keys(TEMPLATES);
  return (
    <main className="mx-auto max-w-[880px] px-8 py-12">
      <header className="mb-8">
        <h1 className="m-0 text-4xl font-bold tracking-normal text-slate-950">Wire playground</h1>
        <p className="mt-2 text-base text-slate-600">
          Inline-render <code>@aigentive/wire</code> diagrams in your browser. Pick a template, view
          a stored diagram, or POST canonical Wire JSON to{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">
            /api/render
          </code>
          .
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Templates</h2>
        <ul className="grid list-none gap-3 p-0">
          {templateNames.map((name) => (
            <li
              key={name}
              className="rounded-lg border border-slate-200 bg-white px-5 py-4"
            >
              <Link
                href={`/preview/template/${name}`}
                className="text-[15px] font-semibold text-blue-900 no-underline"
              >
                {name}
              </Link>
              <div className="mt-1 text-[13px] text-slate-500">
                {TEMPLATES[name]?.title} · {TEMPLATES[name]?.nodes.length ?? 0} nodes ·{" "}
                <Link
                  href={`/edit/template/${name}`}
                  className="text-blue-900 no-underline"
                >
                  edit ↗
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">React samples</h2>
        <ul className="grid list-none gap-3 p-0">
          <li className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <Link
              href="/components"
              className="text-[15px] font-semibold text-blue-900 no-underline"
            >
              Component system
            </Link>
            <div className="mt-1 text-[13px] text-slate-500">
              Components, style guide, option panels, cards, groups, and event patterns.
            </div>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <Link
              href="/samples/agent-chain"
              className="text-[15px] font-semibold text-blue-900 no-underline"
            >
              Agent chain
            </Link>
            <div className="mt-1 text-[13px] text-slate-500">
              Wire-level card, group, and option rendering with no React Flow app code.
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-950">API endpoints</h2>
        <ul className="leading-7 text-slate-600">
          <li>
            <code>POST /api/render</code> — body: canonical Wire JSON; returns SVG.
          </li>
          <li>
            <code>POST /api/validate</code> — body: canonical Wire JSON; returns issues array.
          </li>
          <li>
            <code>POST /api/share</code> — body: canonical Wire JSON; returns{" "}
            <code>{"{ token, blobUrl, previewUrl }"}</code>. Token is content-addressed
            (same diagram → same token).
          </li>
          <li>
            <code>GET /preview/template/[name]</code> — render a built-in template.
          </li>
          <li>
            <code>GET /preview/inline?d=&lt;token&gt;</code> — static SVG, server-rendered.
            Backed by Vercel Blob in hosted deployments or the local share store
            in Docker/dev. Falls back to base64url-encoded JSON if <code>d</code>{" "}
            isn&rsquo;t token-shaped.
          </li>
          <li>
            <code>GET /edit/inline?d=&lt;token&gt;</code> — interactive React Flow canvas:
            drag cards, pan, zoom, then save to mint a new token.
          </li>
          <li>
            <strong>MCP server</strong> — run <code>wire-mcp --http</code> as
            its own service; the playground renders, the MCP server edits.
          </li>
        </ul>
      </section>
    </main>
  );
}
