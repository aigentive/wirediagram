import type { CSSProperties, ReactElement } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram } from "../hooks.js";

const DEFAULT_KINDS: WireNode["kind"][] = [
  "trigger",
  "ai",
  "tool",
  "action",
  "condition",
  "human",
  "retrieval",
  "memory",
  "guardrail",
  "end",
  "note",
  "group"
];

const KIND_META: Record<WireNode["kind"], { label: string; icon: string }> = {
  trigger: { label: "Trigger", icon: "▶" },
  action: { label: "Action", icon: "→" },
  ai: { label: "AI", icon: "✦" },
  tool: { label: "Tool", icon: "✱" },
  condition: { label: "Condition", icon: "?" },
  human: { label: "Human", icon: "◎" },
  memory: { label: "Memory", icon: "⊙" },
  retrieval: { label: "Retrieval", icon: "⊕" },
  guardrail: { label: "Guardrail", icon: "◆" },
  end: { label: "End", icon: "■" },
  note: { label: "Note", icon: "✎" },
  group: { label: "Group", icon: "▢" }
};

const PANEL_STYLE: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 12,
  background: "rgba(255,255,255,0.96)",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
};

const HEADING_STYLE: CSSProperties = {
  padding: "0 2px 2px",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: "uppercase"
};

const BUTTON_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  minHeight: 40,
  padding: "8px 12px",
  background: "#ffffff",
  border: "1px solid #dbe4ef",
  borderRadius: 8,
  color: "#0f172a",
  cursor: "pointer",
  font: "inherit",
  fontSize: 15,
  fontWeight: 700,
  textAlign: "left",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)"
};

const ICON_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  flex: "0 0 20px",
  color: "#0f172a",
  fontSize: 15,
  lineHeight: 1
};

export interface WirePaletteProps {
  kinds?: WireNode["kind"][];
  className?: string;
  style?: CSSProperties;
}

export function WirePalette({ kinds = DEFAULT_KINDS, className, style }: WirePaletteProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();

  return (
    <div className={className} style={{ ...PANEL_STYLE, ...style }}>
      <div style={HEADING_STYLE}>Add node</div>
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          style={BUTTON_STYLE}
          onClick={() => {
            const id = nextNodeId(kind, diagram.nodes.map((node) => node.id));
            actions.dispatch({
              type: "node.add",
              node: {
                id,
                kind,
                title: titleForKind(kind),
                branches: kind === "condition" ? ["yes", "no"] : undefined
              }
            });
          }}
        >
          <span aria-hidden="true" style={ICON_STYLE}>
            {KIND_META[kind].icon}
          </span>
          <span>{KIND_META[kind].label}</span>
        </button>
      ))}
    </div>
  );
}

function nextNodeId(kind: WireNode["kind"], existing: Iterable<string>): string {
  const used = new Set(existing);
  for (let i = 1; i < 1000; i += 1) {
    const id = `${kind}-${i}`;
    if (!used.has(id)) return id;
  }
  return `${kind}-${Date.now().toString(36)}`;
}

function titleForKind(kind: WireNode["kind"]): string {
  return KIND_META[kind].label;
}
