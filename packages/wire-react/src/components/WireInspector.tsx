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
  "w-full rounded-md border border-wire bg-wire-surface px-[9px] py-[5px] text-[12.5px] text-wire-primary outline-none transition-colors focus:border-wire-focus";
const INLINE_INPUT =
  "rounded-md border border-wire bg-wire-surface px-2 py-1.5 text-[12px] text-wire-primary outline-none transition-colors focus:border-wire-focus";
const CLEAR_BUTTON =
  "shrink-0 rounded-md border border-wire px-2 py-1 text-[11px] font-medium text-wire-tertiary transition-colors hover:text-wire-primary";

const TONE_OPTIONS: Array<{ value: "" | Tone; label: string }> = [
  { value: "", label: "Kind default" },
  { value: "default", label: "Neutral" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
  { value: "ai", label: "AI" }
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
        className={cx("grid gap-2 rounded-md bg-wire-surface p-3", className)}
        style={style}
      >
        <Eyebrow muted>Options</Eyebrow>
        <p className="text-[12.5px] text-wire-tertiary">No node selected</p>
      </aside>
    );
  }

  const dispatchStylePatch = (patch: Partial<Record<keyof NodeStyle, unknown>>): void => {
    actions.dispatch({
      type: "node.patch",
      id: node.id,
      patch: patchNodeStyle(node, patch)
    });
  };

  return (
    <aside
      className={cx("grid gap-3 rounded-md bg-wire-surface p-3", className)}
      style={style}
    >
      <Eyebrow muted>Options</Eyebrow>

      <label className="grid">
        <span className={FIELD_LABEL}>Title</span>
        <input
          className={TEXT_INPUT}
          value={node.title}
          onChange={(event) => actions.dispatch({ type: "node.patch", id: node.id, patch: { title: event.target.value } })}
        />
      </label>

      <label className="grid">
        <span className={FIELD_LABEL}>Description</span>
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
          <span className={FIELD_LABEL}>Card style</span>
          <select
            className={TEXT_INPUT}
            value={node.tone ?? ""}
            onChange={(event) =>
              actions.dispatch({
                type: "node.patch",
                id: node.id,
                patch: { tone: event.target.value || null }
              })
            }
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
          value={node.style?.fill}
          fallback="#ffffff"
          onChange={(value) => dispatchStylePatch({ fill: value })}
        />
        <ColorField
          label="Border"
          value={node.style?.stroke}
          fallback="#d4d4d8"
          onChange={(value) => dispatchStylePatch({ stroke: value })}
        />
        <ColorField
          label="Text"
          value={node.style?.textColor}
          fallback="#18181b"
          onChange={(value) => dispatchStylePatch({ textColor: value })}
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="grid">
            <span className={FIELD_LABEL}>Border width</span>
            <input
              className={INLINE_INPUT}
              type="number"
              min={0}
              step={0.5}
              value={node.style?.strokeWidth ?? ""}
              onChange={(event) => {
                const value = optionalNumberFromInput(event.target.value);
                if (value !== undefined) dispatchStylePatch({ strokeWidth: value });
              }}
            />
          </label>

          <label className="grid">
            <span className={FIELD_LABEL}>Radius</span>
            <input
              className={INLINE_INPUT}
              type="number"
              min={0}
              step={1}
              value={node.style?.borderRadius ?? ""}
              onChange={(event) => {
                const value = optionalNumberFromInput(event.target.value);
                if (value !== undefined) dispatchStylePatch({ borderRadius: value });
              }}
            />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border border-wire px-2.5 py-2">
          <span className="text-[12px] font-medium text-wire-secondary">Shadow</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={node.style?.shadow ?? true}
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

function ColorField({
  label,
  value,
  fallback,
  onChange
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (value: string | null) => void;
}): ReactElement {
  return (
    <div className="grid gap-1">
      <span className={FIELD_LABEL}>{label}</span>
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
        {value ? (
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

function optionalNumberFromInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hexColorOrFallback(value: string | undefined, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : fallback;
}
