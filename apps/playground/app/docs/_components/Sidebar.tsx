"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Documentation" className="grid content-start gap-5 px-3 py-5 lg:px-4">
      <div className="grid gap-3 rounded-lg border border-wire-nav-divider bg-white/[0.04] p-3">
        <div className="grid gap-1">
          <span className="text-[13px] font-bold text-wire-nav-fg">Build with Wire</span>
          <span className="text-[12px] leading-5 text-wire-nav-fg-muted">
            Start with package CSS, then move into examples and production guidance.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/docs/quickstart"
            onClick={onNavigate}
            className="rounded-md bg-wire-nav-button-bg px-2.5 py-1.5 text-center text-[12px] font-bold text-wire-nav-button-fg no-underline hover:bg-wire-nav-button-bg-hover"
          >
            Quickstart
          </Link>
          <Link
            href="/docs/examples"
            onClick={onNavigate}
            className="rounded-md border border-wire-nav-divider px-2.5 py-1.5 text-center text-[12px] font-bold text-wire-nav-fg no-underline hover:bg-wire-nav-hover"
          >
            Examples
          </Link>
        </div>
      </div>

      {NAV.map((section) => (
        <div key={section.title} className="grid gap-1">
          <span className="px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-wire-nav-fg-dim">
            {section.title}
          </span>
          <ul className="m-0 grid list-none gap-px p-0">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname === item.href + "/";
              const isSoon = item.badge === "soon";
              const baseClass = "flex min-h-8 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] no-underline transition-colors duration-150";
              const stateClass = active
                ? "bg-wire-nav-active font-semibold text-wire-nav-button shadow-wire-sm ring-1 ring-white/5"
                : isSoon
                  ? "text-wire-nav-fg-dim"
                  : "text-wire-nav-fg-muted hover:bg-wire-nav-hover hover:text-wire-nav-fg";
              const linkClass = `${baseClass} ${stateClass}`;
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
    <span className="rounded bg-wire-nav-hover px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-wire-nav-fg-dim">
      soon
    </span>
  );
}

function NewBadge() {
  return (
    <span className="rounded bg-wire-nav-hover px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-wire-nav-accent ring-1 ring-white/5">
      new
    </span>
  );
}
