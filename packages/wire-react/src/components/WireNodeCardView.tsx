import type { ReactElement, ReactNode } from "react";
import type { WireNode } from "@aigentive/wire-core";
import {
  readWireOption,
  type WireOptionSpec
} from "../options.js";
import type { WireNodeRenderContext } from "../canvas/nodeTypes.js";
import { NodeCard } from "../primitives/NodeCard.js";
import { cx } from "./classes.js";

export interface WireNodeCardViewProps extends WireNodeRenderContext {
  className?: string;
  content?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  showDefaultSummary?: boolean;
}

export interface WireGroupFrameProps extends WireNodeRenderContext {
  className?: string;
}

export type WireCardBadgeTone = "default" | "info" | "success" | "warning" | "error";

export type WireCardBadge =
  | string
  | {
    label: string;
    tone?: WireCardBadgeTone;
  };

export type WireCardMetaItem =
  | string
  | number
  | boolean
  | {
    label?: string;
    value: string | number | boolean;
  };

export interface WireCardProgress {
  value: number;
  max?: number;
  label?: string;
  steps?: number;
  showPercent?: boolean;
}

export interface WireCardContent {
  /** Overrides the card title without changing the canonical node title. */
  title?: string;
  /** Body copy shown below the title. */
  description?: string;
  /** Inline badges such as priority, mode, or status. */
  badges?: WireCardBadge[];
  /** Small serializable facts rendered as text rows. */
  meta?: WireCardMetaItem[];
  /** Progress bar and optional step dots. */
  progress?: number | WireCardProgress;
  /** Short text shown after progress/meta content. */
  footer?: string;
}

export function WireNodeCardView(ctx: WireNodeCardViewProps): ReactElement {
  const cardContent = wireCardContentForNode(ctx.node);
  const subtitle = subtitleForNode(ctx.node);
  const optionLine = optionSummary(ctx.node, ctx.optionSpecs);
  const title = cardContent?.title ?? ctx.node.title;
  const description = cardContent?.description ?? subtitle;
  const customContent = ctx.children ?? ctx.content;
  const hasStructuredContent = hasStructuredCardContent(cardContent);
  const shouldRenderStructuredContent = customContent === undefined && hasStructuredContent;
  const showDefaultSummary = ctx.showDefaultSummary ?? (customContent === undefined && !hasStructuredContent);
  const refLabel = ctx.node.id;

  return (
    <NodeCard
      kind={ctx.kind}
      title={title}
      refLabel={refLabel}
      selected={ctx.selected}
      ariaSelected={ctx.selected}
      className={cx("box-border h-full w-full min-w-0", ctx.className)}
    >
      {description ? (
        <span className="text-[12px] leading-snug text-wire-secondary">{description}</span>
      ) : null}
      {customContent}
      {shouldRenderStructuredContent ? <StructuredCardContent content={cardContent} /> : null}
      {showDefaultSummary && optionLine ? (
        <span className="text-[11px] leading-snug text-wire-tertiary">{optionLine}</span>
      ) : null}
      {ctx.footer ? (
        <div className="text-[11px] leading-snug text-wire-tertiary">{ctx.footer}</div>
      ) : null}
    </NodeCard>
  );
}

export function WireGroupFrame(ctx: WireGroupFrameProps): ReactElement {
  return (
    <div
      aria-selected={ctx.selected}
      data-selected={ctx.selected ? "true" : undefined}
      className={cx(
        "relative box-border h-full w-full rounded-lg border-[1.5px] bg-wire-canvas pb-3.5 pl-3.5 pr-3.5 pt-7",
        ctx.selected ? "border-wire-focus" : "border-wire-strong",
        ctx.className
      )}
    >
      <div className="absolute left-3.5 right-3.5 top-2 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-[0.08em] text-wire-primary">
        <span>{ctx.node.title}</span>
        <span className="font-mono text-[11px] text-wire-tertiary">
          {ctx.node.kind === "group" ? ctx.node.children?.length ?? 0 : 0}
        </span>
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

function StructuredCardContent({ content }: { content: WireCardContent | undefined }): ReactElement {
  const progress = normalizeProgress(content?.progress);

  return (
    <div className="grid gap-2">
      {content?.badges?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {content.badges.map((badge, index) => {
            const parsed = parseBadge(badge);
            return (
              <span
                key={`${parsed.label}-${index}`}
                className={cx(
                  "rounded-sm px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]",
                  cardBadgeClass(parsed.tone)
                )}
              >
                {parsed.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {content?.meta?.length ? (
        <div className="grid gap-0.5 text-[11px] leading-snug text-wire-tertiary">
          {content.meta.map((item, index) => (
            <span key={`${metaItemText(item)}-${index}`}>{metaItemText(item)}</span>
          ))}
        </div>
      ) : null}

      {progress ? (
        <div className="grid gap-1.5">
          {(progress.label || progress.showPercent) ? (
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-wire-tertiary">
              <span>{progress.label}</span>
              {progress.showPercent ? <span>{Math.round(progress.percent * 100)}%</span> : null}
            </div>
          ) : null}
          {progress.steps ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: progress.steps }, (_, index) => (
                <span
                  key={index}
                  className={cx(
                    "h-2 w-2 rounded-sm",
                    index < progress.filledSteps ? "bg-wire-fg-secondary" : "bg-wire-sunken"
                  )}
                />
              ))}
            </div>
          ) : null}
          <div className="h-1.5 overflow-hidden rounded-sm bg-wire-sunken">
            <div
              className="h-full rounded-sm bg-wire-fg-secondary"
              style={{ width: `${Math.round(progress.percent * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {content?.footer ? (
        <span className="text-[11px] leading-snug text-wire-tertiary">{content.footer}</span>
      ) : null}
    </div>
  );
}

export function wireCardContentForNode(node: WireNode): WireCardContent | undefined {
  const candidate = node.data?.card;
  if (!isRecord(candidate)) return undefined;

  const content: WireCardContent = {};
  if (typeof candidate.title === "string") content.title = candidate.title;
  if (typeof candidate.description === "string") content.description = candidate.description;
  if (typeof candidate.footer === "string") content.footer = candidate.footer;
  if (Array.isArray(candidate.badges)) content.badges = candidate.badges.filter(isCardBadge);
  if (Array.isArray(candidate.meta)) content.meta = candidate.meta.filter(isCardMetaItem);
  if (typeof candidate.progress === "number" || isProgress(candidate.progress)) content.progress = candidate.progress;

  return Object.keys(content).length > 0 ? content : undefined;
}

function hasStructuredCardContent(content: WireCardContent | undefined): boolean {
  return Boolean(content?.badges?.length || content?.meta?.length || content?.progress !== undefined || content?.footer);
}

function parseBadge(badge: WireCardBadge): { label: string; tone: WireCardBadgeTone } {
  return typeof badge === "string"
    ? { label: badge, tone: "default" }
    : { label: badge.label, tone: badge.tone ?? "default" };
}

function cardBadgeClass(tone: WireCardBadgeTone): string {
  switch (tone) {
    case "info": return "bg-wire-status-reserved-bg text-wire-status-reserved";
    case "success": return "bg-wire-status-valid-bg text-wire-status-valid";
    case "warning": return "bg-wire-status-warn-bg text-wire-status-warn";
    case "error": return "bg-wire-status-invalid-bg text-wire-status-invalid";
    default: return "bg-wire-sunken text-wire-secondary";
  }
}

function metaItemText(item: WireCardMetaItem): string {
  if (typeof item === "object") {
    return item.label ? `${item.label}: ${String(item.value)}` : String(item.value);
  }
  return String(item);
}

function normalizeProgress(progress: WireCardContent["progress"] | undefined): {
  label?: string;
  percent: number;
  steps?: number;
  filledSteps: number;
  showPercent?: boolean;
} | undefined {
  if (progress === undefined) return undefined;
  const spec: WireCardProgress = typeof progress === "number" ? { value: progress, showPercent: true } : progress;
  if (!Number.isFinite(spec.value)) return undefined;

  const max = typeof spec.max === "number" && spec.max > 0 ? spec.max : spec.value > 1 ? 100 : 1;
  const percent = Math.max(0, Math.min(1, spec.value / max));
  const steps = typeof spec.steps === "number" && spec.steps > 0 ? Math.min(24, Math.floor(spec.steps)) : undefined;
  return {
    label: spec.label,
    percent,
    steps,
    filledSteps: steps ? Math.round(percent * steps) : 0,
    showPercent: spec.showPercent
  };
}

function isCardBadge(value: unknown): value is WireCardBadge {
  return typeof value === "string" || (isRecord(value) && typeof value.label === "string" && (value.tone === undefined || isCardBadgeTone(value.tone)));
}

function isCardBadgeTone(value: unknown): value is WireCardBadgeTone {
  return value === "default" || value === "info" || value === "success" || value === "warning" || value === "error";
}

function isCardMetaItem(value: unknown): value is WireCardMetaItem {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (isRecord(value) && (value.label === undefined || typeof value.label === "string") && isCardMetaPrimitive(value.value));
}

function isCardMetaPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isProgress(value: unknown): value is WireCardProgress {
  return isRecord(value) &&
    typeof value.value === "number" &&
    (value.max === undefined || typeof value.max === "number") &&
    (value.label === undefined || typeof value.label === "string") &&
    (value.steps === undefined || typeof value.steps === "number") &&
    (value.showPercent === undefined || typeof value.showPercent === "boolean");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function subtitleForNode(node: WireNode): string | undefined {
  if (node.kind === "ai") return node.model;
  if (node.kind === "tool") return node.ref;
  return node.description;
}
