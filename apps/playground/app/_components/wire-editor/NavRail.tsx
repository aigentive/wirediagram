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
    <aside className="flex min-h-0 w-[260px] shrink-0 flex-col border-r border-wire bg-wire-nav text-wire-nav-fg">
      {header ? (
        <div
          className="grid gap-3 border-b p-3"
          style={{ borderColor: "var(--wire-nav-divider)" }}
        >
          {header}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
      {footer ? (
        <div
          className="border-t p-3"
          style={{ borderColor: "var(--wire-nav-divider)" }}
        >
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
