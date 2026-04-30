import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";
import { KindChip } from "./KindChip.js";
import { Ref } from "./Ref.js";
import type { WireNodeKind } from "./types.js";

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
}

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
  ariaSelected
}: NodeCardProps): ReactElement {
  return (
    <div
      aria-selected={ariaSelected ?? selected}
      className={cx(
        "flex min-w-[140px] flex-col gap-1 rounded-lg border bg-wire-surface px-3 py-[10px]",
        selected
          ? "border-wire-focus shadow-[0_0_0_2px_var(--wire-blue-500)_inset]"
          : "border-wire",
        className
      )}
      style={style}
    >
      <div className="flex items-center justify-between gap-1.5">
        <KindChip kind={kind} />
        {refLabel ? <Ref>{refLabel}</Ref> : null}
      </div>
      <div className="mt-0.5 text-[13px] font-bold leading-snug text-wire-primary">
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
