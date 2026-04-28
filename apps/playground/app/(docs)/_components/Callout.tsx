import type { ReactNode } from "react";
import { AlertTriangle, Info, Sparkles, type LucideIcon } from "lucide-react";

type Tone = "info" | "tip" | "warn";

const TONE_CONFIG: Record<
  Tone,
  { wrap: string; label: string; icon: LucideIcon; defaultTitle: string }
> = {
  info: {
    wrap: "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40",
    label: "text-blue-700 dark:text-blue-300",
    icon: Info,
    defaultTitle: "Note"
  },
  tip: {
    wrap: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    label: "text-emerald-700 dark:text-emerald-300",
    icon: Sparkles,
    defaultTitle: "Tip"
  },
  warn: {
    wrap: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40",
    label: "text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
    defaultTitle: "Heads up"
  }
};

export function Callout({
  tone = "info",
  title,
  children
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const cfg = TONE_CONFIG[tone];
  const Icon = cfg.icon;
  const heading = title ?? cfg.defaultTitle;

  return (
    <aside className={`not-prose grid gap-1 rounded-lg border px-4 py-3 ${cfg.wrap}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${cfg.label}`}>
        <Icon size={12} aria-hidden strokeWidth={2.5} />
        {heading}
      </div>
      <div className="text-[14px] leading-6 text-slate-800 dark:text-slate-200">{children}</div>
    </aside>
  );
}
