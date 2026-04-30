import type { ReactNode } from "react";
import { AlertTriangle, Info, Sparkles, type LucideIcon } from "lucide-react";

type Tone = "info" | "tip" | "warn";

const TONE_CONFIG: Record<
  Tone,
  { label: string; icon: LucideIcon; defaultTitle: string }
> = {
  info: {
    label: "text-wire-status-reserved",
    icon: Info,
    defaultTitle: "Note"
  },
  tip: {
    label: "text-wire-status-valid",
    icon: Sparkles,
    defaultTitle: "Tip"
  },
  warn: {
    label: "text-wire-status-warn",
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
    <aside className="not-prose grid gap-1 rounded-md border border-wire bg-wire-sunken px-4 py-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${cfg.label}`}>
        <Icon size={12} aria-hidden strokeWidth={1.5} />
        {heading}
      </div>
      <div className="text-[14px] leading-6 text-wire-secondary">{children}</div>
    </aside>
  );
}
