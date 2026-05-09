"use client";

import { Children, useMemo, useState, type ReactNode } from "react";
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
    <div className="not-prose relative overflow-hidden rounded-lg border border-wire-code-border bg-wire-code shadow-wire-sm">
      <div className="flex items-center justify-between border-b border-wire-code-border bg-wire-code-header px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-wire-code-muted">
        <span className="flex items-center gap-1.5">
          <Icon size={12} aria-hidden strokeWidth={1.5} />
          {language ?? "code"}
        </span>
        <CopyButton copied={copied} onCopy={handleCopy} />
      </div>
      <pre
        className="m-0 overflow-auto p-4 font-mono text-[13px] leading-[1.6]"
        style={{ color: "var(--wire-fg-on-code)" }}
      >
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
      className="flex items-center gap-1 rounded border border-wire-code-border bg-white/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-on-code transition-colors duration-150 hover:bg-white/10"
    >
      <Icon size={11} aria-hidden strokeWidth={1.5} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const source = useMemo(() => childrenToString(children), [children]);
  const tokens = useMemo(() => tokenize("shell", source), [source]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="not-prose relative overflow-hidden rounded-lg border border-wire-code-border bg-wire-code shadow-wire-sm">
      <div className="flex items-center justify-between border-b border-wire-code-border bg-wire-code-header px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-wire-code-muted">
        <span className="flex items-center gap-1.5">
          <TerminalIcon size={12} aria-hidden strokeWidth={1.5} />
          Terminal
        </span>
        {source ? <CopyButton copied={copied} onCopy={handleCopy} /> : null}
      </div>
      <pre
        className="m-0 overflow-auto p-4 font-mono text-[13px] leading-[1.6]"
        style={{ color: "var(--wire-fg-on-code)" }}
      >
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

function childrenToString(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childrenToString).join("");
  if (typeof node === "object" && "props" in node && node.props && typeof node.props === "object" && "children" in node.props) {
    return Children.toArray((node.props as { children?: ReactNode }).children).map(childrenToString).join("");
  }
  return "";
}
