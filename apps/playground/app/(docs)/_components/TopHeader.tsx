"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { GithubRepoLink } from "../../_components/GithubRepoLink";
import { Brandmark } from "../../_components/wire-brand";

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
      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[248px_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-2 border-r border-wire px-3 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-wire text-wire-secondary transition-colors duration-150 hover:border-wire-strong hover:text-wire-primary lg:hidden"
          >
            <Menu size={14} aria-hidden strokeWidth={1.75} />
          </button>

          <Brandmark href="/" version="alpha" />

        </div>

        <div className="flex min-w-0 items-center gap-3 px-3 sm:px-4 lg:px-6">
          <div className="hidden min-w-0 items-baseline gap-2 md:flex">
            <span className="wire-eyebrow wire-eyebrow--muted">React components</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/playground"
              className="rounded-md border border-wire bg-wire-surface px-3 py-1.5 text-[13px] font-bold text-wire-primary no-underline transition-colors duration-150 hover:border-wire-strong"
            >
              Playground
            </Link>
            <Link
              href="/contact"
              className="hidden rounded-md border border-wire px-3 py-1.5 text-[13px] font-bold text-wire-secondary no-underline transition-colors duration-150 hover:border-wire-strong hover:text-wire-primary sm:inline-flex"
            >
              Contact
            </Link>
            <div className="hidden sm:block">
              <GithubRepoLink />
            </div>
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>
      </div>
    </header>
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
        className={`rounded-full px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-150 ${
          !isDark ? "bg-wire-primary text-wire-surface" : "text-wire-tertiary hover:text-wire-primary"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => onChange("dark")}
        className={`rounded-full px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-150 ${
          isDark ? "bg-wire-primary text-wire-surface" : "text-wire-tertiary hover:text-wire-primary"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
