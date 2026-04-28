"use client";

import { useState, type ReactNode } from "react";
import { Code2, Eye, type LucideIcon } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

type View = "code" | "preview";

export function CodePreview({
  snippet,
  language = "tsx",
  preview,
  height = 320
}: {
  snippet: string;
  language?: string;
  preview: ReactNode;
  height?: number;
}) {
  const [view, setView] = useState<View>("code");

  return (
    <div className="not-prose grid gap-2">
      <div className="flex w-fit items-center gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
        <Tab active={view === "code"} onClick={() => setView("code")} icon={Code2} label="Code" />
        <Tab active={view === "preview"} onClick={() => setView("preview")} icon={Eye} label="Preview" />
      </div>
      {view === "code" ? (
        <CodeBlock language={language}>{snippet}</CodeBlock>
      ) : (
        <div
          className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          style={{ height }}
        >
          {preview}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50"
          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50"
      }`}
    >
      <Icon size={11} aria-hidden strokeWidth={2.25} />
      {label}
    </button>
  );
}
