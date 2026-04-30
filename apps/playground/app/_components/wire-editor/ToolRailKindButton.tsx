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

const KIND_TILE: Record<WireNodeKind, string> = {
  trigger: "bg-wire-kind-trigger-bg text-wire-kind-trigger",
  ai: "bg-wire-kind-ai-bg text-wire-kind-ai",
  tool: "bg-wire-kind-tool-bg text-wire-kind-tool",
  action: "bg-wire-kind-action-bg text-wire-kind-action",
  condition: "bg-wire-kind-condition-bg text-wire-kind-condition",
  human: "bg-wire-kind-human-bg text-wire-kind-human",
  retrieval: "bg-wire-kind-retrieval-bg text-wire-kind-retrieval",
  memory: "bg-wire-kind-end-bg text-wire-kind-end",
  guardrail: "bg-wire-kind-action-bg text-wire-kind-action",
  end: "bg-wire-kind-end-bg text-wire-kind-end",
  note: "bg-wire-kind-note-bg text-wire-kind-note",
  group: "bg-wire-kind-end-bg text-wire-kind-end"
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
      className="group/palette flex items-center gap-[10px] rounded-[7px] border border-transparent bg-transparent px-[10px] py-[7px] transition-colors hover:border-[rgba(15,23,42,0.06)] hover:bg-wire-surface hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md shadow-[0_0_0_1px_rgba(15,23,42,0.04)_inset] ${KIND_TILE[kind]}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex-1 text-left text-[13px] font-semibold text-wire-primary">
        {label}
      </span>
      <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm border border-transparent bg-transparent px-[5px] font-mono text-[10px] font-medium text-wire-muted opacity-70 transition group-hover/palette:border-[rgba(15,23,42,0.06)] group-hover/palette:bg-wire-sunken group-hover/palette:opacity-100">
        {shortcut}
      </kbd>
    </button>
  );
}
