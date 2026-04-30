import type { ReactNode } from "react";

export function ToolRail({
  topbar,
  children
}: {
  topbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="flex min-h-0 w-[196px] shrink-0 flex-col border-r border-wire bg-wire-rail">
      {topbar ? (
        <div className="flex items-center gap-2 border-b border-wire p-2">
          {topbar}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 content-start gap-1.5 overflow-auto p-3">
        {children}
      </div>
    </aside>
  );
}
