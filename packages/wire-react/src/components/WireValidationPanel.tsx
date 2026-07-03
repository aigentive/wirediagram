import type { CSSProperties, ReactElement } from "react";
import { useWireValidation } from "../hooks.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill, type StatusPillKind } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";

export interface WireValidationPanelProps {
  unstyled?: boolean;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
    issue?: string;
    empty?: string;
  };
  className?: string;
  style?: CSSProperties;
}

const DOT_CLASS: Record<StatusPillKind, string> = {
  valid: "bg-wire-status-valid",
  reserved: "bg-wire-status-reserved",
  warn: "bg-wire-status-warn",
  invalid: "bg-wire-status-invalid"
};

export function WireValidationPanel({
  unstyled = false,
  classNames,
  className,
  style
}: WireValidationPanelProps): ReactElement {
  const validation = useWireValidation();

  const hasErrors = validation.issues.some((issue) => issue.severity === "error");
  const hasWarnings = validation.issues.some((issue) => issue.severity === "warning");
  const status: StatusPillKind = hasErrors ? "invalid" : hasWarnings ? "warn" : "valid";
  const label = hasErrors ? "Invalid" : hasWarnings ? "Review" : "Valid";

  return (
    <section
      className={cx(
        "wire-validation-panel",
        !unstyled && "wire-validation-panel--styled grid gap-0 overflow-hidden rounded-md",
        classNames?.root,
        className
      )}
      style={style}
    >
      <header className={cx("wire-validation-panel__header", !unstyled && "flex items-center justify-between gap-2 px-[13px] py-[9px]", classNames?.header)}>
        <Eyebrow muted>Validation</Eyebrow>
        <StatusPill kind={status}>{label}</StatusPill>
      </header>

      {validation.issues.length === 0 ? (
        <p
          className={cx(
            "wire-validation-panel__empty",
            !unstyled && "border-t border-[rgba(15,23,42,0.06)] px-[13px] py-[11px] text-[12px] text-wire-tertiary",
            classNames?.empty
          )}
        >
          No issues
        </p>
      ) : (
        <ul
          className={cx(
            "wire-validation-panel__list",
            !unstyled && "grid gap-1.5 border-t border-[rgba(15,23,42,0.06)] bg-[rgba(248,250,252,0.55)] px-[13px] py-[11px]",
            classNames?.list
          )}
        >
          {validation.issues.map((issue, index) => {
            const issueStatus: StatusPillKind = issue.severity === "error" ? "invalid" : "warn";
            return (
              <li
                key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? index}`}
                className={cx(
                  "wire-validation-panel__issue",
                  !unstyled && "flex items-start gap-2 text-[12px] leading-snug text-wire-secondary",
                  classNames?.issue
                )}
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
