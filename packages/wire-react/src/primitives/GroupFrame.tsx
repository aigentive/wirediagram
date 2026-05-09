import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface GroupFrameProps {
  title: ReactNode;
  count?: number | string;
  selected?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GroupFrame({
  title,
  count,
  selected,
  children,
  className,
  style
}: GroupFrameProps): ReactElement {
  return (
    <div
      data-selected={selected ? "true" : undefined}
      className={cx(
        "relative rounded-lg border-[1.5px] bg-wire-canvas pb-[14px] pl-[14px] pr-[14px] pt-[26px]",
        selected ? "border-wire-focus" : "border-wire-strong",
        className
      )}
      style={style}
    >
      <span className="absolute left-[14px] top-[8px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-wire-primary">
        {title}
      </span>
      {count != null ? (
        <span className="absolute right-[14px] top-[8px] font-mono text-[11px] text-wire-tertiary">
          {count}
        </span>
      ) : null}
      {children}
    </div>
  );
}
