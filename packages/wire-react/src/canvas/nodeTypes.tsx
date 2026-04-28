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

export interface WireNodeCardProps extends WireNodeRenderContext {}

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

export const WIRE_NODE_THEMES: Record<NonNullable<Tone>, WireNodeTheme> = {
  default: { border: "#cbd5e1", background: "#ffffff", accent: "#475569" },
  success: { border: "#86efac", background: "#f0fdf4", accent: "#15803d" },
  warning: { border: "#facc15", background: "#fefce8", accent: "#a16207" },
  error: { border: "#fca5a5", background: "#fff1f2", accent: "#b91c1c" },
  info: { border: "#93c5fd", background: "#eff6ff", accent: "#1d4ed8" },
  ai: { border: "#c4b5fd", background: "#f5f3ff", accent: "#6d28d9" }
};

export function createWireNodeRenderContext({
  node,
  selected,
  width,
  height,
  optionCatalog,
  renderNodeCard,
  renderGroup
}: {
  node: WireNode;
  selected: boolean;
  width: number;
  height: number;
  optionCatalog?: WireOptionCatalog;
  renderNodeCard?: WireNodeRenderer;
  renderGroup?: WireNodeRenderer;
}): WireNodeRenderContext {
  const tone = (node.tone ?? "default") as NonNullable<Tone>;
  const data: WireNodeData = {
    title: node.title,
    description: node.description,
    kind: node.kind,
    tone,
    wire: node,
    optionCatalog,
    renderNodeCard,
    renderGroup
  };
  return {
    node,
    data,
    kind: node.kind,
    tone,
    theme: WIRE_NODE_THEMES[tone],
    selected,
    width,
    height,
    options: wireNodeOptions(node),
    optionSpecs: wireOptionSpecsForNode(optionCatalog, node)
  };
}

export function WireNodeCard(ctx: WireNodeCardProps) {
  const label = KIND_LABEL[ctx.kind] ?? "NO";
  const theme = ctx.theme;

  return (
    <div
      aria-selected={ctx.selected}
      style={{
        width: ctx.width,
        minHeight: ctx.height,
        padding: "12px 16px",
        boxSizing: "border-box",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: ctx.node.style?.textColor ?? "#0f172a",
        background: ctx.node.style?.fill ?? theme.background,
        border: `${ctx.node.style?.strokeWidth ?? 1}px solid ${ctx.node.style?.stroke ?? theme.border}`,
        borderRadius: ctx.node.style?.borderRadius ?? 8,
        outline: ctx.selected ? "2px solid #2563eb" : undefined,
        outlineOffset: 3,
        boxShadow: ctx.selected
          ? "0 0 0 6px rgba(37, 99, 235, 0.16), 0 14px 34px rgba(15, 23, 42, 0.16)"
          : ctx.node.style?.shadow
            ? "0 12px 30px rgba(15, 23, 42, 0.14)"
            : "0 6px 18px rgba(15, 23, 42, 0.08)",
        opacity: ctx.node.style?.opacity ?? 1
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
        <span style={{ textTransform: "uppercase" }}>{ctx.kind}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 650, lineHeight: 1.35 }}>
        {ctx.node.title}
      </div>
      {ctx.node.description ? (
        <div style={{ textAlign: "center", fontSize: 11, marginTop: 5, color: "#64748b", lineHeight: 1.35 }}>
          {ctx.node.description}
        </div>
      ) : null}
    </div>
  );
}

export const DEFAULT_NODE_RENDERERS = {
  node: WireNodeCard,
  group: WireNodeCard
} as const;
