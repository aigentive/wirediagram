"use client";

import type { ReactNode } from "react";

export type WireNodeKind =
  | "trigger"
  | "ai"
  | "tool"
  | "action"
  | "condition"
  | "human"
  | "retrieval"
  | "memory"
  | "guardrail"
  | "end"
  | "note"
  | "group";

const KIND_HUE: Record<WireNodeKind, string> = {
  trigger: "text-wire-kind-trigger",
  ai: "text-wire-kind-ai",
  tool: "text-wire-kind-tool",
  action: "text-wire-kind-action",
  condition: "text-wire-kind-ai",
  human: "text-wire-kind-human",
  retrieval: "text-wire-kind-retrieval",
  memory: "text-wire-kind-end",
  guardrail: "text-wire-kind-action",
  end: "text-wire-kind-end",
  note: "text-wire-kind-note",
  group: "text-wire-kind-end"
};

export function ToolRailKindButton({
  kind,
  label,
  icon,
  shortcut,
  onAdd
}: {
  kind: WireNodeKind;
  label: string;
  icon: ReactNode;
  shortcut: string;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex h-9 items-center gap-2 rounded-md border border-wire bg-wire-surface px-3 transition-colors hover:border-wire-strong"
    >
      <span className={`grid place-items-center ${KIND_HUE[kind]}`} aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-left text-[13px] font-semibold text-wire-primary">
        {label}
      </span>
      <kbd className="rounded-sm border border-wire bg-wire-sunken px-1.5 py-0.5 font-mono text-[11px] text-wire-tertiary">
        {shortcut}
      </kbd>
    </button>
  );
}
