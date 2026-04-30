"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { GithubRepoLink } from "../../_components/GithubRepoLink";

type Theme = "light" | "dark";

export function TopHeader({
  onToggleSidebar,
  sidebarOpen
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("wire-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("wire-theme", theme);
  }, [theme]);

  return (
    <header className="sticky top-0 z-30 border-b border-wire bg-wire-surface">
      <div className="mx-auto flex h-14 items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          className="grid h-9 w-9 place-items-center rounded-md border border-wire text-wire-secondary hover:border-wire-strong hover:text-wire-primary lg:hidden"
        >
          <Menu size={14} aria-hidden />
        </button>

        <Link href="/" className="flex items-center gap-2 text-wire-primary no-underline">
          <BrandMark />
          <span className="text-[15px] font-bold tracking-tight">Wire</span>
          <span className="hidden text-[12px] font-medium text-wire-tertiary sm:inline">
            React components
          </span>
          <span className="hidden font-mono text-[11px] text-wire-tertiary sm:inline">v1.0</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/playground"
            className="rounded-md border border-wire bg-wire-surface px-3 py-1.5 text-[13px] font-bold text-wire-primary no-underline transition-colors hover:border-wire-strong"
          >
            Playground
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-wire px-3 py-1.5 text-[13px] font-bold text-wire-secondary no-underline transition-colors hover:border-wire-strong hover:text-wire-primary"
          >
            Contact
          </Link>
          <GithubRepoLink />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-slate-800">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <circle cx="19" cy="18" r="2.5" />
        <path d="M7.2 11l9.6-4M7.2 13l9.6 4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const isDark = theme === "dark";
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-wire bg-wire-surface p-[3px]"
    >
      <button
        type="button"
        aria-pressed={!isDark}
        onClick={() => onChange("light")}
        className={`rounded-full px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
          !isDark ? "bg-slate-900 text-white" : "text-wire-tertiary hover:text-wire-primary"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => onChange("dark")}
        className={`rounded-full px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
          isDark ? "bg-slate-900 text-white" : "text-wire-tertiary hover:text-wire-primary"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
