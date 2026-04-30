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
          <span className="wire-eyebrow wire-eyebrow--muted">{section.title}</span>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname === item.href + "/";
              const isSoon = item.badge === "soon";
              const baseClass = "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] no-underline";
              const stateClass = active
                ? "bg-wire-sunken text-wire-primary font-semibold border-l-2 border-wire-focus pl-[10px] -ml-[2px]"
                : isSoon
                  ? "text-wire-muted"
                  : "text-wire-secondary hover:bg-wire-sunken hover:text-wire-primary";
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
    <span className="rounded bg-wire-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">
      soon
    </span>
  );
}

function NewBadge() {
  return (
    <span className="rounded bg-wire-status-reserved-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-wire-status-reserved">
      new
    </span>
  );
}
