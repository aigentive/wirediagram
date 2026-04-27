import type { CSSProperties, ReactElement } from "react";
import { useWireValidation } from "../hooks.js";
import { cx } from "./classes.js";

export interface WireValidationPanelProps {
  className?: string;
  style?: CSSProperties;
}

export function WireValidationPanel({ className, style }: WireValidationPanelProps): ReactElement {
  const validation = useWireValidation();

  if (validation.issues.length === 0) {
    return (
      <section
        className={cx("rounded-lg border border-emerald-100 bg-white p-3 text-[13px] font-medium text-emerald-700 shadow-sm", className)}
        style={style}
      >
        Valid
      </section>
    );
  }

  return (
    <section className={cx("grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[13px] shadow-sm", className)} style={style}>
      {validation.issues.map((issue, index) => (
        <div
          key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? index}`}
          className={issue.severity === "error" ? "text-red-700" : "text-amber-700"}
        >
          <strong>{issue.code}</strong>: {issue.message}
        </div>
      ))}
    </section>
  );
}
