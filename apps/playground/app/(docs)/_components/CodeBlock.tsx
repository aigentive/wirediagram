"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, FileCode2, FileJson, Terminal as TerminalIcon, type LucideIcon } from "lucide-react";
import { tokenClass, tokenize } from "./syntax";

function languageIcon(language: string | undefined): LucideIcon {
  switch ((language ?? "").toLowerCase()) {
    case "json":
      return FileJson;
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
    case "css":
      return FileCode2;
    default:
      return FileCode2;
  }
}

export function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => tokenize(language ?? "text", children), [language, children]);
  const Icon = languageIcon(language);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="not-prose relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Icon size={12} aria-hidden strokeWidth={2.25} />
          {language ?? "code"}
        </span>
        <CopyButton copied={copied} onCopy={handleCopy} />
      </div>
      <pre className="m-0 overflow-auto p-4 font-mono text-[13px] leading-6">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={tokenClass(token.type)}>
              {token.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CopyButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy code"}
      className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
    >
      <Icon size={11} aria-hidden strokeWidth={2.5} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <TerminalIcon size={12} aria-hidden strokeWidth={2.25} />
          Terminal
        </span>
      </div>
      <pre className="m-0 overflow-auto p-4 font-mono text-[13px] leading-6 text-emerald-700 dark:text-emerald-300">
        {children}
      </pre>
    </div>
  );
}
