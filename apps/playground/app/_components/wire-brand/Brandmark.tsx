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
      className="flex items-center gap-2 text-wire-primary no-underline"
    >
      <BrandmarkTile />
      <span className="text-[15px] font-bold tracking-tight">{label}</span>
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
      className="grid h-7 w-7 place-items-center rounded-md bg-slate-800"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-blue-400"
      >
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <circle cx="19" cy="18" r="2.5" />
        <path d="M7.2 11l9.6-4M7.2 13l9.6 4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
