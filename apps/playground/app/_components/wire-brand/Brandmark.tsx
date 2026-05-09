import Link from "next/link";
import type { ReactNode } from "react";

export function Brandmark({
  href = "/",
  label = "Wire",
  version,
  children
}: {
  href?: string;
  label?: ReactNode;
  version?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-[9px] text-wire-primary no-underline"
    >
      <BrandmarkTile />
      <span className="text-[14.5px] font-bold tracking-[-0.01em]">{label}</span>
      {version ? (
        <span className="hidden font-mono text-[11px] text-wire-tertiary sm:inline">
          {version}
        </span>
      ) : null}
      {children}
    </Link>
  );
}

export function BrandmarkTile() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      className="text-blue-600"
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9 L11 22" />
        <path d="M11 22 L16 13" />
        <path d="M16 13 L21 22" />
        <path d="M21 22 L26 9" />
        <path d="M16 13 Q22 7 26 9" />
      </g>
      <g fill="var(--wire-bg-surface, #ffffff)" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="9" r="2.5" />
        <circle cx="26" cy="9" r="2.5" />
        <circle cx="16" cy="13" r="2.5" />
        <circle cx="11" cy="22" r="2.5" />
        <circle cx="21" cy="22" r="2.5" />
      </g>
    </svg>
  );
}
