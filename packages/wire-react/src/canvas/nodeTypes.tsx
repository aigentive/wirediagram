import type { Tone, WireNode } from "@aigentive/wire-core";
import type { ReactNode } from "react";
import {
  wireNodeOptions,
  wireOptionSpecsForNode,
  type WireOptionCatalog,
  type WireOptionSpec
} from "../options.js";
import { WireNodeCardView } from "../components/WireNodeCardView.js";

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

const DEFAULT_THEME: WireNodeTheme = {
  border: "var(--wire-border)",
  background: "var(--wire-surface)",
  accent: "var(--wire-fg-secondary)"
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
    theme: DEFAULT_THEME,
    selected,
    width,
    height,
    options: wireNodeOptions(node),
    optionSpecs: wireOptionSpecsForNode(optionCatalog, node)
  };
}

export function WireNodeCard(ctx: WireNodeCardProps) {
  return <WireNodeCardView {...ctx} />;
}

export const DEFAULT_NODE_RENDERERS = {
  node: WireNodeCard,
  group: WireNodeCard
} as const;
