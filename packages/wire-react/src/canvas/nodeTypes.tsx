import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Tone, WireNode } from "@aigentive/wire-core";
import type { ReactNode } from "react";
import {
  wireNodeOptions,
  wireOptionSpecsForNode,
  type WireOptionCatalog,
  type WireOptionSpec
} from "../options.js";

export interface WireNodeTheme {
  border: string;
  background: string;
  accent: string;
}

export interface WireNodeRenderContext {
  node: WireNode;
  data: WireNodeData;
  kind: WireNode["kind"];
  tone: NonNullable<Tone>;
  theme: WireNodeTheme;
  selected: boolean;
  width: number;
  height: number;
  options: Record<string, unknown>;
  optionSpecs: WireOptionSpec[];
}

export type WireNodeRenderer = (context: WireNodeRenderContext) => ReactNode;

export interface WireNodeData {
  title: string;
  description?: string;
  kind: WireNode["kind"];
  tone?: NonNullable<WireNode["tone"]>;
  wire: WireNode;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
  optionCatalog?: WireOptionCatalog;
  [key: string]: unknown;
}

const KIND_LABEL: Record<WireNode["kind"], string> = {
  trigger: "TR",
  action: "AC",
  ai: "AI",
  tool: "TL",
  condition: "IF",
  human: "HU",
  memory: "ME",
  retrieval: "RE",
  guardrail: "GU",
  end: "EN",
  note: "NO",
  group: "GR"
};

const HANDLE_STYLE = { background: "#64748b", width: 10, height: 10 } as const;

const TONE_STYLES: Record<NonNullable<Tone>, WireNodeTheme> = {
  default: { border: "#cbd5e1", background: "#ffffff", accent: "#475569" },
  success: { border: "#86efac", background: "#f0fdf4", accent: "#15803d" },
  warning: { border: "#facc15", background: "#fefce8", accent: "#a16207" },
  error: { border: "#fca5a5", background: "#fff1f2", accent: "#b91c1c" },
  info: { border: "#93c5fd", background: "#eff6ff", accent: "#1d4ed8" },
  ai: { border: "#c4b5fd", background: "#f5f3ff", accent: "#6d28d9" }
};

export function WireNodeCard({ data, sourcePosition, targetPosition, width, height, selected }: NodeProps) {
  const d = data as WireNodeData;
  const sourcePos = sourcePosition ?? Position.Right;
  const targetPos = targetPosition ?? Position.Left;
  const label = KIND_LABEL[d.kind] ?? "NO";
  const tone = d.tone ?? d.wire.tone ?? "default";
  const theme = TONE_STYLES[tone];
  const cardWidth = typeof width === "number" && width > 0 ? width : d.kind === "note" ? 220 : 220;
  const cardHeight = typeof height === "number" && height > 0 ? height : d.kind === "note" ? 88 : 80;
  const customRenderer = d.kind === "group" ? d.renderGroup ?? d.renderNodeCard : d.renderNodeCard;
  const customCard = customRenderer?.({
    node: d.wire,
    data: d,
    kind: d.kind,
    tone,
    theme,
    selected: Boolean(selected),
    width: cardWidth,
    height: cardHeight,
    options: wireNodeOptions(d.wire),
    optionSpecs: wireOptionSpecsForNode(d.optionCatalog, d.wire)
  });

  return (
    <>
      <Handle type="target" position={targetPos} style={HANDLE_STYLE} />
      {customRenderer ? customCard : (
      <div
        aria-selected={selected}
        style={{
          width: cardWidth,
          minHeight: cardHeight,
          padding: "12px 16px",
          boxSizing: "border-box",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: d.wire.style?.textColor ?? "#0f172a",
          background: d.wire.style?.fill ?? theme.background,
          border: `${d.wire.style?.strokeWidth ?? 1}px solid ${d.wire.style?.stroke ?? theme.border}`,
          borderRadius: d.wire.style?.borderRadius ?? 8,
          outline: selected ? "2px solid #2563eb" : undefined,
          outlineOffset: 3,
          boxShadow: selected
            ? "0 0 0 6px rgba(37, 99, 235, 0.16), 0 14px 34px rgba(15, 23, 42, 0.16)"
            : d.wire.style?.shadow
              ? "0 12px 30px rgba(15, 23, 42, 0.14)"
              : "0 6px 18px rgba(15, 23, 42, 0.08)",
          opacity: d.wire.style?.opacity ?? 1
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 5,
            fontSize: 11,
            fontWeight: 700,
            color: theme.accent
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 18,
              borderRadius: 4,
              background: theme.border,
              color: "#0f172a"
            }}
          >
            {label}
          </span>
          <span style={{ textTransform: "uppercase" }}>{d.kind}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 650, lineHeight: 1.35 }}>
          {d.title}
        </div>
        {d.description ? (
          <div style={{ textAlign: "center", fontSize: 11, marginTop: 5, color: "#64748b", lineHeight: 1.35 }}>
            {d.description}
          </div>
        ) : null}
      </div>
      )}
      <Handle type="source" position={sourcePos} style={HANDLE_STYLE} />
    </>
  );
}

export const DEFAULT_NODE_TYPES = {
  "wire-trigger": WireNodeCard,
  "wire-action": WireNodeCard,
  "wire-ai": WireNodeCard,
  "wire-tool": WireNodeCard,
  "wire-condition": WireNodeCard,
  "wire-human": WireNodeCard,
  "wire-memory": WireNodeCard,
  "wire-retrieval": WireNodeCard,
  "wire-guardrail": WireNodeCard,
  "wire-end": WireNodeCard,
  "wire-note": WireNodeCard,
  "wire-group": WireNodeCard
} as const;
