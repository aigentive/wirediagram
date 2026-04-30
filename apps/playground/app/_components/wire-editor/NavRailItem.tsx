"use client";

import type { ReactNode } from "react";
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
  onClick?: () => void;
}) {
  const baseClass =
    "grid min-h-[52px] rounded-md px-3 py-2 text-left transition-colors";
  const activeClass = "bg-wire-nav-active text-white";
  const inactiveClass =
    "text-wire-nav-fg hover:bg-wire-nav-hover hover:text-wire-primary";

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={
            active
              ? "truncate text-[14px] font-bold text-white"
              : "truncate text-[14px] font-medium text-wire-nav-fg"
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
        <span className="text-[12px] text-wire-nav-fg-muted">{meta}</span>
      ) : null}
    </>
  );

  if (href && !onClick) {
    return (
      <a
        href={href}
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
