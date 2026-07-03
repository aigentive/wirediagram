import type { CSSProperties, ReactElement } from "react";
import type { NodeStyle, Tone, WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram, useWireSelection } from "../hooks.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";

export interface WireInspectorProps {
  className?: string;
  style?: CSSProperties;
}

const FIELD_LABEL = "text-[11.5px] font-medium text-wire-secondary mb-[3px]";
const TEXT_INPUT =
  "w-full rounded-md border border-wire bg-wire-page px-2.5 py-[6px] text-[12.5px] text-wire-primary outline-none transition-colors placeholder:text-wire-muted hover:border-wire-strong focus:border-wire-focus focus:bg-wire-surface focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]";
const INLINE_INPUT =
  "w-full rounded-md border border-wire bg-wire-page px-2.5 py-1.5 text-[12px] text-wire-primary outline-none transition-colors placeholder:text-wire-muted hover:border-wire-strong focus:border-wire-focus focus:bg-wire-surface focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]";
const CLEAR_BUTTON =
  "shrink-0 rounded-md border border-wire bg-wire-surface px-2 py-1 text-[11px] font-medium text-wire-tertiary transition-colors hover:border-wire-strong hover:text-wire-primary";

type CardStyleMode = Tone | "custom";

const CARD_STYLE_PRESETS: Record<Tone, Pick<NodeStyle, "fill" | "stroke" | "textColor">> = {
  default: { fill: "#ffffff", stroke: "#d4d4d8", textColor: "#18181b" },
  success: { fill: "#ecfdf5", stroke: "#34d399", textColor: "#064e3b" },
  warning: { fill: "#fffbeb", stroke: "#fbbf24", textColor: "#78350f" },
  error: { fill: "#fff1f2", stroke: "#fb7185", textColor: "#881337" },
  info: { fill: "#f0f9ff", stroke: "#38bdf8", textColor: "#0c4a6e" },
  ai: { fill: "#f5f3ff", stroke: "#a78bfa", textColor: "#4c1d95" }
};

const TONE_OPTIONS: Array<{ value: CardStyleMode; label: string }> = [
  { value: "default", label: "Neutral" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
  { value: "ai", label: "AI" },
  { value: "custom", label: "Custom" }
];

export function WireInspector({ className, style }: WireInspectorProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const node = selection.nodeIds.length === 1
    ? diagram.nodes.find((candidate) => candidate.id === selection.nodeIds[0])
    : undefined;

  if (!node) {
    return (
      <aside
        className={cx("wire-inspector wire-inspector--styled grid gap-2 rounded-md bg-wire-surface p-3", className)}
        style={style}
      >
        <Eyebrow muted>Options</Eyebrow>
        <p className="text-[12.5px] text-wire-tertiary">No node selected</p>
      </aside>
    );
  }

  const appearance = cardAppearanceForNode(node);
  const dispatchStylePatch = (patch: Partial<Record<keyof NodeStyle, unknown>>): void => {
    const stripsTone = "fill" in patch || "stroke" in patch || "textColor" in patch;
    actions.dispatch({
      type: "node.patch",
      id: node.id,
      patch: stripsTone
        ? { tone: null, ...patchNodeStyle(node, patch) }
        : patchNodeStyle(node, patch)
    });
  };

  return (
    <aside
      className={cx("wire-inspector wire-inspector--styled grid gap-3 rounded-md bg-wire-surface p-3", className)}
      style={style}
    >
      <Eyebrow muted>Options</Eyebrow>

      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Title</span>
        <input
          className={TEXT_INPUT}
          value={node.title}
          onChange={(event) => actions.dispatch({ type: "node.patch", id: node.id, patch: { title: event.target.value } })}
        />
      </label>

      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Description</span>
        <textarea
          className={cx(TEXT_INPUT, "min-h-[68px] resize-y")}
          value={node.description ?? ""}
          onChange={(event) =>
            actions.dispatch({
              type: "node.patch",
              id: node.id,
              patch: { description: event.target.value || null }
            })
          }
        />
      </label>

      <section className="grid gap-2 border-t border-wire pt-3">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow muted>Appearance</Eyebrow>
          {(node.tone || node.style) ? (
            <button
              type="button"
              className={CLEAR_BUTTON}
              onClick={() =>
                actions.dispatch({
                  type: "node.patch",
                  id: node.id,
                  patch: { tone: null, style: null }
                })
              }
            >
              Reset
            </button>
          ) : null}
        </div>

        <label className="grid">
          <span className={cx("wire-field-label", FIELD_LABEL)}>Card style</span>
          <select
            className={TEXT_INPUT}
            value={appearance.mode}
            onChange={(event) => {
              const mode = event.target.value as CardStyleMode;
              if (mode === "custom") return;
              actions.dispatch({
                type: "node.patch",
                id: node.id,
                patch: { tone: mode, style: styleForPreset(mode) }
              });
            }}
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <ColorField
          label="Fill"
          value={appearance.fill}
          fallback="#ffffff"
          canClear={Boolean(node.style?.fill)}
          onChange={(value) => dispatchStylePatch({ fill: value })}
        />
        <ColorField
          label="Border"
          value={appearance.stroke}
          fallback="#d4d4d8"
          canClear={Boolean(node.style?.stroke)}
          onChange={(value) => dispatchStylePatch({ stroke: value })}
        />
        <ColorField
          label="Text"
          value={appearance.textColor}
          fallback="#18181b"
          canClear={Boolean(node.style?.textColor)}
          onChange={(value) => dispatchStylePatch({ textColor: value })}
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="grid">
            <span className={cx("wire-field-label", FIELD_LABEL)}>Border width</span>
            <NumberFieldWithUnit
              value={appearance.strokeWidth}
              placeholder="1"
              unit="px"
              min={0}
              step={0.5}
              onChange={(value) => dispatchStylePatch({ strokeWidth: value })}
            />
          </label>

          <label className="grid">
            <span className={cx("wire-field-label", FIELD_LABEL)}>Radius</span>
            <NumberFieldWithUnit
              value={appearance.borderRadius}
              placeholder="8"
              unit="px"
              min={0}
              step={1}
              onChange={(value) => dispatchStylePatch({ borderRadius: value })}
            />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[12.5px] font-medium text-wire-secondary">Shadow</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={appearance.shadow}
            onChange={(event) => dispatchStylePatch({ shadow: event.target.checked })}
          />
        </label>
      </section>

      <footer className="flex justify-end pt-1">
        <StatusPill kind="valid">Valid</StatusPill>
      </footer>
    </aside>
  );
}

function NumberFieldWithUnit({
  value,
  placeholder,
  unit,
  min,
  step,
  onChange
}: {
  value: number | undefined;
  placeholder?: string;
  unit: string;
  min?: number;
  step?: number;
  onChange: (value: number | null) => void;
}): ReactElement {
  return (
    <div className="relative">
      <input
        className={cx(INLINE_INPUT, "pr-7")}
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => {
          const next = optionalNumberFromInput(event.target.value);
          if (next !== undefined) onChange(next);
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center font-mono text-[10.5px] font-semibold text-wire-muted">
        {unit}
      </span>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  canClear,
  onChange
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  canClear?: boolean;
  onChange: (value: string | null) => void;
}): ReactElement {
  return (
    <div className="grid gap-1">
      <span className={cx("wire-field-label", FIELD_LABEL)}>{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <input
          aria-label={`${label} swatch`}
          type="color"
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-wire bg-wire-surface p-0.5"
          value={hexColorOrFallback(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          aria-label={`${label} color`}
          className={cx(TEXT_INPUT, "min-w-0 flex-1 font-mono text-[11.5px]")}
          value={value ?? ""}
          placeholder={fallback}
          onChange={(event) => onChange(event.target.value || null)}
        />
        {canClear ? (
          <button
            type="button"
            className={CLEAR_BUTTON}
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function patchNodeStyle(
  node: WireNode,
  patch: Partial<Record<keyof NodeStyle, unknown>>
): Record<string, unknown> {
  const nextStyle: Record<string, unknown> = { ...(node.style ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") delete nextStyle[key];
    else nextStyle[key] = value;
  }
  return { style: Object.keys(nextStyle).length > 0 ? nextStyle : null };
}

function cardAppearanceForNode(node: WireNode): {
  mode: CardStyleMode;
  fill: string | undefined;
  stroke: string | undefined;
  textColor: string | undefined;
  strokeWidth: number | undefined;
  borderRadius: number | undefined;
  shadow: boolean;
} {
  const preset = node.tone ? CARD_STYLE_PRESETS[node.tone] : undefined;
  const style = node.style;
  const mode = cardStyleModeForNode(node, preset);
  return {
    mode,
    fill: style?.fill ?? preset?.fill,
    stroke: style?.stroke ?? preset?.stroke,
    textColor: style?.textColor ?? preset?.textColor,
    strokeWidth: style?.strokeWidth,
    borderRadius: style?.borderRadius,
    shadow: style?.shadow ?? true
  };
}

function cardStyleModeForNode(
  node: WireNode,
  preset: Pick<NodeStyle, "fill" | "stroke" | "textColor"> | undefined
): CardStyleMode {
  if (!node.tone) return node.style ? "custom" : "default";
  if (!node.style) return node.tone;
  return styleMatchesPreset(node.style, preset) ? node.tone : "custom";
}

function styleMatchesPreset(
  style: NodeStyle,
  preset: Pick<NodeStyle, "fill" | "stroke" | "textColor"> | undefined
): boolean {
  if (!preset) return false;
  if (style.strokeWidth !== undefined ||
    style.strokeDasharray !== undefined ||
    style.borderRadius !== undefined ||
    style.opacity !== undefined ||
    style.shadow !== undefined) {
    return false;
  }
  return (style.fill === undefined || style.fill === preset.fill) &&
    (style.stroke === undefined || style.stroke === preset.stroke) &&
    (style.textColor === undefined || style.textColor === preset.textColor);
}

function styleForPreset(tone: Tone): NodeStyle {
  const preset = CARD_STYLE_PRESETS[tone];
  return {
    fill: preset.fill,
    stroke: preset.stroke,
    textColor: preset.textColor
  };
}

function optionalNumberFromInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hexColorOrFallback(value: string | undefined, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : fallback;
}
