import type { ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";
import { kindChipKey, kindChipLabel, type WireKindChipKey, type WireNodeKind } from "./types.js";

export interface KindChipProps {
  kind: WireNodeKind;
  children?: ReactNode;
  className?: string;
}

const CHIP_CLASS: Record<WireKindChipKey, string> = {
  trigger: "bg-wire-kind-trigger-bg text-wire-kind-trigger",
  ai: "bg-wire-kind-ai-bg text-wire-kind-ai",
  retrieval: "bg-wire-kind-retrieval-bg text-wire-kind-retrieval",
  tool: "bg-wire-kind-tool-bg text-wire-kind-tool",
  action: "bg-wire-kind-action-bg text-wire-kind-action",
  human: "bg-wire-kind-human-bg text-wire-kind-human",
  note: "bg-wire-kind-note-bg text-wire-kind-note",
  end: "bg-wire-kind-end-bg text-wire-kind-end"
};

export function KindChip({ kind, children, className }: KindChipProps): ReactElement {
  const key = kindChipKey(kind);
  return (
    <span
      className={cx(
        "inline-block rounded-sm px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]",
        CHIP_CLASS[key],
        className
      )}
    >
      {children ?? kindChipLabel(kind)}
    </span>
  );
}
