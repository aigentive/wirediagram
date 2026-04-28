"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <TopHeader onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />

      <div className="lg:flex">
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-20 w-[260px] overflow-auto border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:shrink-0 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-14 z-10 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
