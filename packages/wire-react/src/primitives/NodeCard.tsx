import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";
import { KindChip } from "./KindChip.js";
import { Ref } from "./Ref.js";
import { kindChipKey, type WireKindChipKey, type WireNodeKind } from "./types.js";

export interface NodeCardProps {
  kind: WireNodeKind;
  title: ReactNode;
  refLabel?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaSelected?: boolean;
  showKindChip?: boolean;
}

const KIND_TINT: Record<WireKindChipKey, string> = {
  trigger: "var(--wire-kind-trigger-tint)",
  ai: "var(--wire-kind-ai-tint)",
  retrieval: "var(--wire-kind-retrieval-tint)",
  tool: "var(--wire-kind-tool-tint)",
  action: "var(--wire-kind-action-tint)",
  human: "var(--wire-kind-human-tint)",
  note: "var(--wire-kind-note-tint)",
  condition: "var(--wire-kind-condition-tint)",
  end: "var(--wire-kind-end-tint)"
};

export function NodeCard({
  kind,
  title,
  refLabel,
  meta,
  selected,
  children,
  footer,
  className,
  style,
  ariaSelected,
  showKindChip = true
}: NodeCardProps): ReactElement {
  const tint = KIND_TINT[kindChipKey(kind)];
  const hasAuxContent = Boolean(showKindChip || refLabel || meta || children || footer);
  const cardStyle: CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${tint} 0%, var(--wire-bg-surface) 80%)`,
    backgroundColor: "var(--wire-bg-surface)",
    boxShadow: selected
      ? "var(--wire-card-shadow-selected)"
      : "var(--wire-card-shadow)",
    minWidth: 220,
    ...style
  };
  return (
    <div
      aria-selected={ariaSelected ?? selected}
      className={cx(
        "wire-node-card wire-node-card--styled",
        "group/node flex flex-col gap-1 rounded-lg border px-3 pb-[10px] pt-[9px] transition-shadow duration-150",
        hasAuxContent ? null : "justify-center",
        selected ? "border-wire-focus" : "border-wire",
        className
      )}
      style={cardStyle}
    >
      {showKindChip || refLabel ? (
        <div className="flex items-center justify-between gap-1.5">
          {showKindChip ? <KindChip kind={kind} /> : <span />}
          {refLabel ? <Ref>{refLabel}</Ref> : null}
        </div>
      ) : null}
      <div className={cx(hasAuxContent ? "mt-0.5" : null, "text-[13px] font-semibold leading-snug tracking-[-0.005em] text-wire-primary")}>
        {title}
      </div>
      {meta ? (
        <div className="font-mono text-[10.5px] leading-[1.45] text-wire-tertiary">
          {meta}
        </div>
      ) : null}
      {children}
      {footer ? <div className="text-[11px] leading-snug text-wire-tertiary">{footer}</div> : null}
    </div>
  );
}
