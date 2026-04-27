import type { CSSProperties, ReactElement } from "react";
import { useWireHistory, useWireMode } from "../hooks.js";

export interface WireToolbarProps {
  className?: string;
  style?: CSSProperties;
}

const BAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: 8,
  background: "rgba(255,255,255,0.96)",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
};

const BUTTON_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 42,
  height: 34,
  padding: "0 10px",
  border: "1px solid #dbe4ef",
  borderRadius: 6,
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  font: "inherit",
  fontSize: 14,
  fontWeight: 700
};

const ICON_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  fontSize: 18,
  lineHeight: 1
};

const DISABLED_STYLE: CSSProperties = {
  color: "#94a3b8",
  background: "#f8fafc",
  cursor: "not-allowed"
};

export function WireToolbar({ className, style }: WireToolbarProps): ReactElement {
  const history = useWireHistory();
  const [mode, setMode] = useWireMode();
  const undoStyle = history.canUndo ? ICON_BUTTON_STYLE : { ...ICON_BUTTON_STYLE, ...DISABLED_STYLE };
  const redoStyle = history.canRedo ? ICON_BUTTON_STYLE : { ...ICON_BUTTON_STYLE, ...DISABLED_STYLE };

  return (
    <div className={className} style={{ ...BAR_STYLE, ...style }}>
      <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo" style={undoStyle}>
        ↺
      </button>
      <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo" style={redoStyle}>
        ↻
      </button>
      <button type="button" onClick={() => setMode(mode === "edit" ? "view" : "edit")} style={BUTTON_STYLE}>
        {mode === "edit" ? "View" : "Edit"}
      </button>
    </div>
  );
}
