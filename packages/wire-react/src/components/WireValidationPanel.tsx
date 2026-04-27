import type { CSSProperties, ReactElement } from "react";
import { useWireValidation } from "../hooks.js";

export interface WireValidationPanelProps {
  className?: string;
  style?: CSSProperties;
}

const PANEL_STYLE: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontSize: 13
};

export function WireValidationPanel({ className, style }: WireValidationPanelProps): ReactElement {
  const validation = useWireValidation();

  if (validation.issues.length === 0) {
    return (
      <section className={className} style={{ ...PANEL_STYLE, color: "#166534", ...style }}>
        Valid
      </section>
    );
  }

  return (
    <section className={className} style={{ ...PANEL_STYLE, ...style }}>
      {validation.issues.map((issue, index) => (
        <div key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? index}`} style={{ color: issue.severity === "error" ? "#b91c1c" : "#92400e" }}>
          <strong>{issue.code}</strong>: {issue.message}
        </div>
      ))}
    </section>
  );
}
