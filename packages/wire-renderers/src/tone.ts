import type { Tone } from "@aigentive/wire-core";

/**
 * Tailwind-friendly classnames per tone. The renderer ships these on
 * the rendered adapter node — the consuming app may swap in its own
 * color tokens by passing a custom `theme` object to `toReactFlow`.
 */
export const DEFAULT_TONE_CLASSES: Record<NonNullable<Tone>, string> = {
  default: "bg-white border-zinc-300 text-zinc-900",
  success: "bg-emerald-50 border-emerald-400 text-emerald-900",
  warning: "bg-amber-50 border-amber-400 text-amber-900",
  error: "bg-rose-50 border-rose-400 text-rose-900",
  info: "bg-sky-50 border-sky-400 text-sky-900",
  ai: "bg-violet-50 border-violet-400 text-violet-900"
};

/**
 * SVG color hex per tone — used by the renderer's `renderToSvg()` so
 * server-side rendering does not depend on Tailwind being loaded.
 */
export const DEFAULT_TONE_COLORS: Record<NonNullable<Tone>, { fill: string; stroke: string; text: string }> = {
  default: { fill: "#ffffff", stroke: "#d4d4d8", text: "#18181b" },
  success: { fill: "#ecfdf5", stroke: "#34d399", text: "#064e3b" },
  warning: { fill: "#fffbeb", stroke: "#fbbf24", text: "#78350f" },
  error: { fill: "#fff1f2", stroke: "#fb7185", text: "#881337" },
  info: { fill: "#f0f9ff", stroke: "#38bdf8", text: "#0c4a6e" },
  ai: { fill: "#f5f3ff", stroke: "#a78bfa", text: "#4c1d95" }
};

export function toneFor(tone: Tone | undefined): NonNullable<Tone> {
  return tone ?? "default";
}
