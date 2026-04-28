import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {crumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-slate-500 no-underline hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50">
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
          {eyebrow ? (
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
          {description ? (
            <p className="m-0 max-w-[68ch] text-[16px] leading-7 text-slate-600 dark:text-slate-400">{description}</p>
          ) : null}
        </header>

        <div className="grid gap-8">{children}</div>

        {next ? (
          <Link
            href={next.href}
            className="not-prose group mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 no-underline shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <span className="grid gap-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next</span>
              <span className="text-[15px] font-bold text-slate-950 dark:text-slate-50">{next.label}</span>
            </span>
            <ArrowRight
              size={18}
              aria-hidden
              className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200"
            />
          </Link>
        ) : null}
      </article>

      {showToc ? (
        <aside className="hidden border-l border-slate-200 px-5 dark:border-slate-800 xl:block">
          <div className="sticky top-14">
            <PageToc />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
