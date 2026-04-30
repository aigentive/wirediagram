import type { CSSProperties, ReactElement } from "react";
import { useWireValidation } from "../hooks.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill, type StatusPillKind } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";

export interface WireValidationPanelProps {
  className?: string;
  style?: CSSProperties;
}

const DOT_CLASS: Record<StatusPillKind, string> = {
  valid: "bg-wire-status-valid",
  reserved: "bg-wire-status-reserved",
  warn: "bg-wire-status-warn",
  invalid: "bg-wire-status-invalid"
};

export function WireValidationPanel({ className, style }: WireValidationPanelProps): ReactElement {
  const validation = useWireValidation();

  const hasErrors = validation.issues.some((issue) => issue.severity === "error");
  const hasWarnings = validation.issues.some((issue) => issue.severity === "warning");
  const status: StatusPillKind = hasErrors ? "invalid" : hasWarnings ? "warn" : "valid";
  const label = hasErrors ? "Invalid" : hasWarnings ? "Review" : "Valid";

  return (
    <section
      className={cx(
        "grid gap-0 overflow-hidden rounded-md",
        className
      )}
      style={style}
    >
      <header className="flex items-center justify-between gap-2 px-[13px] py-[9px]">
        <Eyebrow muted>Validation</Eyebrow>
        <StatusPill kind={status}>{label}</StatusPill>
      </header>

      {validation.issues.length === 0 ? null : (
        <ul className="grid gap-1.5 border-t border-[rgba(15,23,42,0.06)] bg-[rgba(248,250,252,0.55)] px-[13px] py-[11px]">
          {validation.issues.map((issue, index) => {
            const issueStatus: StatusPillKind = issue.severity === "error" ? "invalid" : "warn";
            return (
              <li
                key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? index}`}
                className="flex items-start gap-2 text-[12px] leading-snug text-wire-secondary"
              >
                <span
                  aria-hidden
                  className={cx(
                    "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    DOT_CLASS[issueStatus]
                  )}
                />
                <span>
                  <strong className="font-semibold text-wire-primary">{issue.code}</strong>
                  <span className="text-wire-secondary">: {issue.message}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
