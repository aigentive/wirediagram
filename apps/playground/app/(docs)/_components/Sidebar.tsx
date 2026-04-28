"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Documentation" className="grid content-start gap-6 px-4 py-6 lg:px-6">
      {NAV.map((section) => (
        <div key={section.title} className="grid gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <section.icon size={12} aria-hidden className="shrink-0" strokeWidth={2.5} />
            {section.title}
          </span>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname === item.href + "/";
              const isSoon = item.badge === "soon";
              const linkClass = `flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] no-underline ${
                active
                  ? "bg-slate-100 font-bold text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                  : isSoon
                    ? "text-slate-400 dark:text-slate-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              }`;
              return (
                <li key={item.href} className="m-0 p-0">
                  {isSoon ? (
                    <span className={linkClass} aria-disabled="true">
                      <span>{item.label}</span>
                      <SoonBadge />
                    </span>
                  ) : (
                    <Link href={item.href} onClick={onNavigate} className={linkClass}>
                      <span>{item.label}</span>
                      {item.badge === "new" ? <NewBadge /> : null}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SoonBadge() {
  return (
    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      soon
    </span>
  );
}

function NewBadge() {
  return (
    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
      new
    </span>
  );
}
