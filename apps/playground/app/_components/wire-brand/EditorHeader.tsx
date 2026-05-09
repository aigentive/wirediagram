import type { ReactNode } from "react";
import { Brandmark } from "./Brandmark";

export function EditorHeader({
  brandHref = "/",
  brandLabel = "Wire",
  version = "alpha",
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
    <header className="flex h-14 shrink-0 items-center gap-0 border-b border-wire bg-wire-surface pr-4">
      <div className="flex h-full w-[224px] shrink-0 items-center border-r border-wire px-[18px]">
        <Brandmark href={brandHref} label={brandLabel} version={version} />
      </div>
      {breadcrumb ? (
        <span className="ml-[14px] hidden min-w-0 items-center gap-2 text-[14px] font-semibold text-wire-tertiary sm:flex">
          {breadcrumb}
        </span>
      ) : null}
      <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>
    </header>
  );
}
