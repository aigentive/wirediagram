import type { ReactNode } from "react";
import { Brandmark } from "./Brandmark";

export function EditorHeader({
  brandHref = "/",
  brandLabel = "Wire",
  version = "v1.4",
  breadcrumb,
  children
}: {
  brandHref?: string;
  brandLabel?: ReactNode;
  version?: string;
  breadcrumb?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-wire bg-wire-surface px-4">
      <Brandmark href={brandHref} label={brandLabel} version={version} />
      {breadcrumb ? (
        <span className="hidden min-w-0 items-center gap-2 text-[13px] font-semibold text-wire-tertiary sm:flex">
          <span aria-hidden>/</span>
          <span className="min-w-0 truncate">{breadcrumb}</span>
        </span>
      ) : null}
      <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>
    </header>
  );
}
