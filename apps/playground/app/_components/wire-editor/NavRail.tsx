import type { ReactNode } from "react";

export function NavRail({
  header,
  footer,
  children
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="flex min-h-0 w-[224px] shrink-0 flex-col bg-wire-nav text-wire-nav-fg shadow-[inset_-1px_0_0_rgba(0,0,0,0.25)]">
      {header ? (
        <div className="grid gap-[10px] border-b border-[var(--wire-nav-divider)] p-[14px]">{header}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto px-2 py-3">{children}</div>
      {footer ? (
        <div className="border-t border-[var(--wire-nav-divider)] px-3 pb-[14px] pt-[10px]">{footer}</div>
      ) : null}
    </aside>
  );
}
