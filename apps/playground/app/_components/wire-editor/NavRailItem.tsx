"use client";

import type { MouseEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function NavRailItem({
  active = false,
  href,
  title,
  meta,
  loading = false,
  onClick
}: {
  active?: boolean;
  href?: string;
  title: string;
  meta?: ReactNode;
  loading?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}) {
  const baseClass =
    "relative grid min-h-[44px] overflow-hidden rounded-[7px] border border-transparent pl-[12px] pr-[10px] py-2 text-left transition-colors";
  const activeClass =
    "border-[rgba(255,255,255,0.06)] bg-wire-nav-active text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]";
  const inactiveClass =
    "text-wire-nav-fg hover:bg-wire-nav-hover hover:text-white";

  const content = (
    <>
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-sm bg-[var(--wire-nav-accent)]"
        />
      ) : null}
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={
            active
              ? "truncate text-[12.5px] font-semibold text-white"
              : "truncate text-[12.5px] font-semibold text-wire-nav-fg"
          }
        >
          {title}
        </span>
        {loading ? (
          <Loader2
            size={12}
            strokeWidth={1.5}
            className="shrink-0 animate-spin text-wire-nav-fg-muted"
          />
        ) : null}
      </span>
      {meta ? (
        <span className="mt-0.5 text-[11px] text-wire-nav-fg-dim">{meta}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={`${baseClass} no-underline ${active ? activeClass : inactiveClass}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} ${active ? activeClass : inactiveClass}`}
    >
      {content}
    </button>
  );
}
