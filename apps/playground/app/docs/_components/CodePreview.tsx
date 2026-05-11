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
      <div className="flex w-fit items-center gap-0.5 rounded-md bg-wire-sunken p-0.5">
        <Tab active={view === "code"} onClick={() => setView("code")} icon={Code2} label="Code" />
        <Tab active={view === "preview"} onClick={() => setView("preview")} icon={Eye} label="Preview" />
      </div>
      {view === "code" ? (
        <CodeBlock language={language}>{snippet}</CodeBlock>
      ) : (
        <div
          className="overflow-hidden rounded-lg border border-wire bg-wire-surface"
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
      className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors duration-150 ${
        active
          ? "bg-wire-surface text-wire-primary shadow-wire-sm"
          : "text-wire-tertiary hover:text-wire-primary"
      }`}
    >
      <Icon size={11} aria-hidden strokeWidth={2.25} />
      {label}
    </button>
  );
}
