import Link from "next/link";
import { GITHUB_REPO_URL } from "../../_components/GithubRepoLink";
import { BrandmarkTile } from "../../_components/wire-brand/Brandmark";

const PACKAGES = [
  { name: "@aigentive/wire-core", desc: "Schema · validation · reducer · layout" },
  { name: "@aigentive/wire-react", desc: "Editor, viewer, canvas, JSX facade" },
  { name: "@aigentive/wire-renderers", desc: "SVG · PNG · Mermaid" },
  { name: "@aigentive/wire-mcp", desc: "MCP server (stdio + HTTP)" },
  { name: "@aigentive/wire-cli", desc: "wire CLI" }
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-wire bg-wire-surface">
      <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <BrandmarkTile />
              <span className="text-[15px] font-bold text-wire-primary">Wire Diagram</span>
              <span className="font-mono text-[11px] text-wire-tertiary">alpha</span>
            </div>
            <p className="text-[13px] leading-6 text-wire-secondary">
              The diagram library agents can reliably create, edit, validate, and explain.
            </p>
            <p className="text-[12px] text-wire-tertiary">
              Apache-2.0 ·{" "}
              <a
                href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
                className="text-wire-tertiary no-underline hover:text-wire-link"
              >
                LICENSE
              </a>
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="grid content-start gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
                Packages
              </span>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {PACKAGES.map((pkg) => (
                  <li key={pkg.name} className="text-[12px] leading-5">
                    <span className="font-mono text-wire-primary">{pkg.name}</span>
                    <span className="ml-2 text-wire-tertiary">{pkg.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid content-start gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
                Links
              </span>
              <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
                <li>
                  <Link href="/docs" className="text-wire-secondary no-underline hover:text-wire-link">
                    Docs
                  </Link>
                </li>
                <li>
                  <Link href="/docs/mcp" className="text-wire-secondary no-underline hover:text-wire-link">
                    MCP server
                  </Link>
                </li>
                <li>
                  <Link href="/docs/cli" className="text-wire-secondary no-underline hover:text-wire-link">
                    CLI
                  </Link>
                </li>
                <li>
                  <Link href="/playground" className="text-wire-secondary no-underline hover:text-wire-link">
                    Playground
                  </Link>
                </li>
                <li>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-wire-secondary no-underline hover:text-wire-link"
                  >
                    GitHub ↗
                  </a>
                </li>
                <li>
                  <Link
                    href="/docs/contact"
                    className="text-wire-secondary no-underline hover:text-wire-link"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
