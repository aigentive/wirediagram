import Link from "next/link";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";

export const dynamic = "force-static";

export default function HomePage() {
  const templateNames = Object.keys(TEMPLATES);
  return (
    <main style={{ padding: "48px 32px", maxWidth: 880, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 36, letterSpacing: -0.5 }}>Wire playground</h1>
        <p style={{ color: "#475569", marginTop: 8, fontSize: 16 }}>
          Inline-render <code>@aigentive/wire</code> diagrams in your browser. Pick a template, view
          a stored diagram, or POST canonical Wire JSON to{" "}
          <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
            /api/render
          </code>
          .
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: 18, color: "#0f172a", marginBottom: 12 }}>Templates</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          {templateNames.map((name) => (
            <li
              key={name}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "16px 20px"
              }}
            >
              <Link
                href={`/preview/template/${name}`}
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "#1e3a8a"
                }}
              >
                {name}
              </Link>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                {TEMPLATES[name]?.title} · {TEMPLATES[name]?.nodes.length ?? 0} nodes ·{" "}
                <Link
                  href={`/edit/template/${name}`}
                  style={{ color: "#1e3a8a", textDecoration: "none" }}
                >
                  edit ↗
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 18 }}>API endpoints</h2>
        <ul style={{ color: "#475569", lineHeight: 1.7 }}>
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
