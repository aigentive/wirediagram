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
  next,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  showToc?: boolean;
  next?: { href: string; label: string };
  children: ReactNode;
}) {
  const gridClass = showToc
    ? "mx-auto grid w-full max-w-[1180px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px]"
    : "mx-auto grid w-full max-w-[860px] grid-cols-1";

  return (
    <div className={gridClass}>
      <article className="mx-auto grid w-full max-w-[820px] gap-8 px-5 py-8 lg:px-10 lg:py-12" data-toc-anchor="true">
        <header className="grid gap-2">
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-wire-tertiary">
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
          <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
          {description ? (
            <p className="m-0 max-w-[68ch] text-[16px] leading-7 text-wire-secondary">{description}</p>
          ) : null}
        </header>

        <div className="grid gap-8">{children}</div>

        {next ? (
          <Link
            href={next.href}
            className="not-prose group mt-4 flex items-center justify-between rounded-lg border border-wire bg-wire-surface px-5 py-4 no-underline shadow-wire-sm hover:border-wire-strong"
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
        <aside className="hidden border-l border-wire px-5 xl:block">
          <div className="sticky top-14">
            <PageToc />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
