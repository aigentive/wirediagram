import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { NodeStyle, Tone, WireNode } from "@aigentive/wire-core";
import {
  readWireOption,
  type WireOptionSpec
} from "../options.js";
import type { WireNodeRenderContext } from "../canvas/nodeTypes.js";
import { NodeCard } from "../primitives/NodeCard.js";
import { cx } from "./classes.js";

export interface WireNodeCardViewProps extends WireNodeRenderContext {
  unstyled?: boolean;
  classNames?: {
    root?: string;
    content?: string;
    badge?: string;
    meta?: string;
    progress?: string;
    footer?: string;
  };
  className?: string;
  content?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  showDefaultSummary?: boolean;
}

export interface WireGroupFrameProps extends WireNodeRenderContext {
  unstyled?: boolean;
  classNames?: {
    root?: string;
    header?: string;
    title?: string;
    count?: string;
  };
  className?: string;
}

export type WireCardBadgeTone = "default" | "info" | "success" | "warning" | "error";

type CardCssProperties = CSSProperties & Record<`--${string}`, string | number | undefined>;

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

const TONE_CARD_STYLE: Record<Tone, { fill: string; stroke: string; text: string }> = {
  default: { fill: "#ffffff", stroke: "#d4d4d8", text: "#18181b" },
  success: { fill: "#ecfdf5", stroke: "#34d399", text: "#064e3b" },
  warning: { fill: "#fffbeb", stroke: "#fbbf24", text: "#78350f" },
  error: { fill: "#fff1f2", stroke: "#fb7185", text: "#881337" },
  info: { fill: "#f0f9ff", stroke: "#38bdf8", text: "#0c4a6e" },
  ai: { fill: "#f5f3ff", stroke: "#a78bfa", text: "#4c1d95" }
};

export function WireNodeCardView(ctx: WireNodeCardViewProps): ReactElement {
  const cardContent = wireCardContentForNode(ctx.node);
  const subtitle = subtitleForNode(ctx.node);
  const optionLine = optionSummary(ctx.node, ctx.optionSpecs);
  const title = cardContent?.title ?? ctx.node.title;
  const description = cardContent?.description;
  const customContent = ctx.children ?? ctx.content;
  const hasStructuredContent = hasStructuredCardContent(cardContent);
  const shouldRenderStructuredContent = customContent === undefined && hasStructuredContent;
  const showDefaultSummary = ctx.showDefaultSummary ?? (customContent === undefined && !hasStructuredContent);

  return (
    <NodeCard
      kind={ctx.kind}
      title={title}
      meta={subtitle}
      selected={ctx.selected}
      ariaSelected={ctx.selected}
      unstyled={ctx.unstyled}
      classNames={{
        root: ctx.classNames?.root,
        content: ctx.classNames?.content,
        meta: ctx.classNames?.meta,
        footer: ctx.classNames?.footer
      }}
      className={cx(!ctx.unstyled && "box-border h-full w-full min-w-0", ctx.className)}
      style={cardStyleForNode(ctx.node)}
      showKindChip={false}
    >
      {description ? (
        <span className={cx("wire-node-card-view__description", !ctx.unstyled && "text-[12px] leading-snug text-wire-secondary", ctx.classNames?.content)}>
          {description}
        </span>
      ) : null}
      {customContent}
      {shouldRenderStructuredContent ? (
        <StructuredCardContent content={cardContent} unstyled={Boolean(ctx.unstyled)} classNames={ctx.classNames} />
      ) : null}
      {showDefaultSummary && optionLine ? (
        <span className={cx("wire-node-card-view__summary", !ctx.unstyled && "text-[11px] leading-snug text-wire-tertiary", ctx.classNames?.meta)}>{optionLine}</span>
      ) : null}
      {ctx.footer ? (
        <div className={cx("wire-node-card-view__footer", !ctx.unstyled && "text-[11px] leading-snug text-wire-tertiary", ctx.classNames?.footer)}>{ctx.footer}</div>
      ) : null}
    </NodeCard>
  );
}

export function cardStyleForNode(node: WireNode): CSSProperties | undefined {
  const nodeStyle = node.style;
  const style: CardCssProperties = {};
  let shadowSource: string | undefined;

  if (node.tone) {
    const toneStyle = TONE_CARD_STYLE[node.tone];
    style.backgroundColor = toneStyle.fill;
    style.backgroundImage = "none";
    style.borderColor = toneStyle.stroke;
    style["--wire-fg-primary"] = toneStyle.text;
    style["--wire-fg-secondary"] = toneStyle.text;
    style["--wire-fg-tertiary"] = toneStyle.text;
    shadowSource = toneStyle.stroke;
  }
  if (nodeStyle) {
    Object.assign(style, cardCssStyleForNodeStyle(nodeStyle));
    if (nodeStyle.stroke) shadowSource = nodeStyle.stroke;
  }

  if (nodeStyle?.shadow === false) {
    style["--wire-card-shadow"] = "none";
  } else if (shadowSource) {
    style["--wire-card-shadow"] = tintedShadow(shadowSource);
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function cardCssStyleForNodeStyle(style: NodeStyle): CardCssProperties {
  const cardStyle: CardCssProperties = {};
  if (style.fill) {
    cardStyle.backgroundColor = style.fill;
    cardStyle.backgroundImage = "none";
  }
  if (style.stroke) cardStyle.borderColor = style.stroke;
  if (style.strokeWidth !== undefined) cardStyle.borderWidth = style.strokeWidth;
  if (style.strokeDasharray) cardStyle.borderStyle = "dashed";
  if (style.borderRadius !== undefined) cardStyle.borderRadius = style.borderRadius;
  if (style.opacity !== undefined) cardStyle.opacity = style.opacity;
  if (style.textColor) {
    cardStyle["--wire-fg-primary"] = style.textColor;
    cardStyle["--wire-fg-secondary"] = style.textColor;
    cardStyle["--wire-fg-tertiary"] = style.textColor;
  }
  return cardStyle;
}

function tintedShadow(stroke: string): string {
  return [
    `0 1px 0 color-mix(in srgb, ${stroke} 18%, transparent)`,
    `0 6px 14px color-mix(in srgb, ${stroke} 22%, transparent)`,
    `0 2px 4px color-mix(in srgb, ${stroke} 14%, transparent)`
  ].join(", ");
}

export function WireGroupFrame(ctx: WireGroupFrameProps): ReactElement {
  return (
    <div
      aria-selected={ctx.selected}
      data-selected={ctx.selected ? "true" : undefined}
      className={cx(
        "wire-group-frame",
        !ctx.unstyled && "wire-group-frame--styled relative box-border h-full w-full rounded-lg border-[1.5px] bg-wire-canvas pb-3.5 pl-3.5 pr-3.5 pt-7",
        !ctx.unstyled && (ctx.selected ? "border-wire-focus" : "border-wire-strong"),
        ctx.classNames?.root,
        ctx.className
      )}
    >
      <div
        className={cx(
          "wire-group-frame__header",
          !ctx.unstyled && "absolute left-3.5 right-3.5 top-2 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-normal text-wire-primary",
          ctx.classNames?.header
        )}
      >
        <span className={cx("wire-group-frame__title", ctx.classNames?.title)}>{ctx.node.title}</span>
        <span className={cx("wire-group-frame__count", !ctx.unstyled && "font-mono text-[11px] text-wire-tertiary", ctx.classNames?.count)}>
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

function StructuredCardContent({
  content,
  unstyled,
  classNames
}: {
  content: WireCardContent | undefined;
  unstyled: boolean;
  classNames?: WireNodeCardViewProps["classNames"];
}): ReactElement {
  const progress = normalizeProgress(content?.progress);

  return (
    <div className={cx("wire-node-card-view__content", !unstyled && "grid gap-2", classNames?.content)}>
      {content?.badges?.length ? (
        <div className={cx("wire-node-card-view__badges", !unstyled && "flex flex-wrap items-center gap-1.5")}>
          {content.badges.map((badge, index) => {
            const parsed = parseBadge(badge);
            return (
              <span
                key={`${parsed.label}-${index}`}
                className={cx(
                  "wire-node-card-view__badge",
                  !unstyled && "rounded-sm px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-normal",
                  !unstyled && cardBadgeClass(parsed.tone),
                  classNames?.badge
                )}
              >
                {parsed.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {content?.meta?.length ? (
        <div className={cx("wire-node-card-view__meta", !unstyled && "grid gap-0.5 text-[11px] leading-snug text-wire-tertiary", classNames?.meta)}>
          {content.meta.map((item, index) => (
            <span key={`${metaItemText(item)}-${index}`}>{metaItemText(item)}</span>
          ))}
        </div>
      ) : null}

      {progress ? (
        <div className={cx("wire-node-card-view__progress", !unstyled && "grid gap-1.5", classNames?.progress)}>
          {(progress.label || progress.showPercent) ? (
            <div className={cx("wire-node-card-view__progress-label", !unstyled && "flex items-center justify-between gap-2 text-[11px] font-bold text-wire-tertiary")}>
              <span>{progress.label}</span>
              {progress.showPercent ? <span>{Math.round(progress.percent * 100)}%</span> : null}
            </div>
          ) : null}
          {progress.steps ? (
            <div className={cx("wire-node-card-view__steps", !unstyled && "flex items-center gap-1")}>
              {Array.from({ length: progress.steps }, (_, index) => (
                <span
                  key={index}
                  className={cx(
                    "wire-node-card-view__step",
                    !unstyled && "h-2 w-2 rounded-sm",
                    !unstyled && (index < progress.filledSteps ? "bg-wire-fg-secondary" : "bg-wire-sunken")
                  )}
                />
              ))}
            </div>
          ) : null}
          <div className={cx("wire-node-card-view__progress-track", !unstyled && "h-1.5 overflow-hidden rounded-sm bg-wire-sunken")}>
            <div
              className={cx("wire-node-card-view__progress-bar", !unstyled && "h-full rounded-sm bg-wire-fg-secondary")}
              style={{ width: `${Math.round(progress.percent * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {content?.footer ? (
        <span className={cx("wire-node-card-view__footer", !unstyled && "text-[11px] leading-snug text-wire-tertiary", classNames?.footer)}>{content.footer}</span>
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
