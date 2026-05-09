import type { ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export type StatusPillKind = "valid" | "reserved" | "warn" | "invalid";

export interface StatusPillProps {
  kind: StatusPillKind;
  children: ReactNode;
  className?: string;
}

const PILL_CLASS: Record<StatusPillKind, string> = {
  valid: "bg-wire-status-valid-bg text-wire-status-valid",
  reserved: "bg-wire-status-reserved-bg text-wire-status-reserved",
  warn: "bg-wire-status-warn-bg text-wire-status-warn",
  invalid: "bg-wire-status-invalid-bg text-wire-status-invalid"
};

export function StatusPill({ kind, children, className }: StatusPillProps): ReactElement {
  return (
    <span
      className={cx(
        "inline-block rounded-sm px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]",
        PILL_CLASS[kind],
        className
      )}
    >
      {children}
    </span>
  );
}
