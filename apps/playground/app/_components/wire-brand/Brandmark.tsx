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
    <span
      aria-hidden
      className="grid h-[26px] w-[26px] place-items-center rounded-md bg-slate-900"
    >
      <svg
        viewBox="0 0 32 32"
        width="14"
        height="14"
        fill="none"
        className="text-white"
      >
        <rect x="2" y="11" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="13" y="3" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="13" y="19" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="24" y="11" width="6" height="6" rx="1.5" fill="#60A5FA" />
        <path d="M8 14 L13 6" stroke="currentColor" strokeWidth={1.5} />
        <path d="M8 14 L13 22" stroke="currentColor" strokeWidth={1.5} />
        <path d="M19 6 L24 14" stroke="currentColor" strokeWidth={1.5} />
        <path d="M19 22 L24 14" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    </span>
  );
}
