import type { ReactNode } from "react";
import Link from "next/link";
import { PageToc } from "./PageToc";

type Crumb = { href?: string; label: string };

export function DocsPage({
  eyebrow,
  title,
  description,
  crumbs,
  showToc = true,
  wide = false,
  hideHeader = false,
  next,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  showToc?: boolean;
  wide?: boolean;
  hideHeader?: boolean;
  next?: { href: string; label: string };
  children: ReactNode;
}) {
  const gridClass = showToc
    ? "grid w-full grid-cols-1 xl:mx-8 xl:w-auto xl:max-w-[1160px] xl:grid-cols-[minmax(0,1fr)_216px] 2xl:mx-12"
    : wide
      ? "mx-auto grid w-full max-w-[1280px] grid-cols-1"
      : "mx-auto grid w-full max-w-[980px] grid-cols-1";

  return (
    <div className={gridClass}>
      <article
        className={`grid w-full gap-9 px-5 py-8 lg:px-8 lg:py-12 xl:px-10 ${
          wide ? "max-w-none" : "max-w-[860px]"
        }`}
        data-toc-anchor="true"
      >
        {!hideHeader ? (
          <header className="grid gap-3 border-b border-wire pb-8">
            {crumbs?.length ? (
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-wire-tertiary no-underline hover:text-wire-primary">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {index < crumbs.length - 1 ? <span aria-hidden>/</span> : null}
                  </span>
                ))}
              </nav>
            ) : null}
            {eyebrow ? <span className="wire-eyebrow">{eyebrow}</span> : null}
            <h1 className="m-0 max-w-[16ch] text-[32px] font-bold leading-tight tracking-tight sm:max-w-none">{title}</h1>
            {description ? (
              <p className="m-0 max-w-[68ch] text-[16px] leading-7 text-wire-secondary">{description}</p>
            ) : null}
          </header>
        ) : null}

        <div className="grid gap-8">{children}</div>

        {next ? (
          <Link
            href={next.href}
            className="not-prose group mt-2 flex items-center justify-between rounded-lg border border-wire bg-wire-surface px-5 py-4 no-underline shadow-wire-sm transition-colors duration-150 hover:border-wire-strong hover:bg-wire-sunken"
          >
            <span className="grid gap-0.5">
              <span className="wire-eyebrow wire-eyebrow--muted">Next</span>
              <span className="text-[15px] font-bold text-wire-primary">{next.label}</span>
            </span>
            <span
              aria-hidden
              className="text-[18px] font-bold text-blue-600 transition-transform group-hover:translate-x-0.5"
            >
              {"→"}
            </span>
          </Link>
        ) : null}
      </article>

      {showToc ? (
        <aside className="hidden border-l border-wire bg-wire-page/60 px-4 xl:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-auto">
            <PageToc />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
