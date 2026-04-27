import type { ReactElement } from "react";
import type { WireNode } from "@aigentive/wire-core";
import {
  readWireOption,
  type WireOptionSpec
} from "../options.js";
import type { WireNodeRenderContext } from "../canvas/nodeTypes.js";
import { cx } from "./classes.js";

export interface WireNodeCardViewProps extends WireNodeRenderContext {
  className?: string;
}

export interface WireGroupFrameProps extends WireNodeRenderContext {
  className?: string;
}

export function WireNodeCardView(ctx: WireNodeCardViewProps): ReactElement {
  const subtitle = subtitleForNode(ctx.node);
  const optionLine = optionSummary(ctx.node, ctx.optionSpecs);

  return (
    <div
      aria-selected={ctx.selected}
      className={cx(
        "box-border grid min-h-full w-full gap-2 rounded-lg border bg-white px-3.5 py-3 shadow-lg",
        ctx.selected ? "border-blue-600 ring-4 ring-blue-600/15" : "border-slate-200",
        ctx.className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase", kindBadgeClass(ctx.kind))}>
          {ctx.kind}
        </span>
        <span className="font-mono text-[11px] text-slate-400">{ctx.node.id}</span>
      </div>
      <strong className="text-sm leading-snug text-slate-950">{ctx.node.title}</strong>
      {subtitle ? <span className="text-xs leading-snug text-slate-600">{subtitle}</span> : null}
      {optionLine ? <span className="text-[11px] leading-snug text-slate-500">{optionLine}</span> : null}
    </div>
  );
}

export function WireGroupFrame(ctx: WireGroupFrameProps): ReactElement {
  return (
    <div
      aria-selected={ctx.selected}
      className={cx(
        "relative box-border h-full w-full rounded-lg border bg-slate-50/70 px-3.5 pb-3.5 pt-8 shadow-inner",
        ctx.selected ? "border-blue-600" : "border-slate-300",
        ctx.className
      )}
    >
      <div className="absolute left-3.5 right-3.5 top-2.5 flex items-center justify-between text-xs font-extrabold uppercase text-slate-700">
        <span>{ctx.node.title}</span>
        <span>{ctx.node.kind === "group" ? ctx.node.children?.length ?? 0 : 0}</span>
      </div>
    </div>
  );
}

function optionSummary(node: WireNode, specs: WireOptionSpec[]): string | undefined {
  const line = specs
    .slice(0, 2)
    .map((spec) => {
      const value = readWireOption(node, spec);
      return value === undefined ? undefined : `${spec.label ?? spec.key}: ${String(value)}`;
    })
    .filter(Boolean)
    .join(" / ");
  return line || undefined;
}

function kindBadgeClass(kind: WireNode["kind"]): string {
  switch (kind) {
    case "ai": return "bg-violet-50 text-violet-700";
    case "tool": return "bg-cyan-50 text-cyan-700";
    case "retrieval": return "bg-blue-50 text-blue-700";
    case "trigger": return "bg-emerald-50 text-emerald-700";
    case "action": return "bg-amber-50 text-amber-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

function subtitleForNode(node: WireNode): string | undefined {
  if (node.kind === "ai") return node.model;
  if (node.kind === "tool") return node.ref;
  return node.description;
}
