"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GithubRepoLink } from "../../_components/GithubRepoLink";
import { Brandmark } from "../../_components/wire-brand";

type Theme = "light" | "dark";

export function MarketingHeader() {
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
    <header className="sticky top-0 z-30 border-b border-wire bg-wire-surface/90 backdrop-blur supports-[backdrop-filter]:bg-wire-surface/75">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Brandmark href="/" version="alpha" />

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/docs/mcp">MCP</NavLink>
          <NavLink href="/playground">Playground</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <GithubRepoLink />
          </div>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-wire-secondary no-underline transition-colors duration-150 hover:bg-wire-sunken hover:text-wire-primary"
    >
      {children}
    </Link>
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
