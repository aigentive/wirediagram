"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-50 lg:hidden"
        >
          <Menu size={14} aria-hidden />
        </button>

        <Link href="/" className="flex items-center gap-2 text-slate-950 no-underline dark:text-slate-50">
          <BrandMark />
          <span className="text-[15px] font-bold tracking-tight">Wire</span>
          <span className="hidden text-[12px] font-medium text-slate-500 sm:inline dark:text-slate-400">
            React components
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/contact"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-bold text-slate-700 no-underline transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-50"
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
    <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-slate-950 dark:bg-slate-50">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-50 dark:text-slate-950">
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <circle cx="19" cy="18" r="2.5" />
        <path d="M7.2 11l9.6-4M7.2 13l9.6 4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label={`Switch to ${next} theme`}
      onClick={() => onChange(next)}
      className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-50"
    >
      <Icon size={14} aria-hidden />
    </button>
  );
}
