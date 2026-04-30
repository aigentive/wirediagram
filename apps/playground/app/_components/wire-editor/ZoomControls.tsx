"use client";

import { Lock, Maximize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleLock,
  locked = false
}: {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
  onToggleLock?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="inline-flex flex-row overflow-hidden rounded-md border border-wire bg-wire-surface shadow-wire-sm">
      <ZoomButton label="Zoom in" onClick={onZoomIn}>
        <Plus size={14} strokeWidth={1.5} />
      </ZoomButton>
      <ZoomButton label="Zoom out" onClick={onZoomOut} divider>
        <Minus size={14} strokeWidth={1.5} />
      </ZoomButton>
      <ZoomButton label="Fit to view" onClick={onFit} divider wide>
        <Maximize2 size={14} strokeWidth={1.5} />
        <span className="pl-1 pr-2 text-[12px] font-semibold text-wire-secondary">Fit</span>
      </ZoomButton>
      <ZoomButton
        label={locked ? "Unlock canvas" : "Lock canvas"}
        onClick={onToggleLock}
        divider
      >
        <Lock size={14} strokeWidth={1.5} />
      </ZoomButton>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  divider = false,
  wide = false,
  children
}: {
  label: string;
  onClick?: () => void;
  divider?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const sizing = wide
    ? "h-7 inline-flex items-center gap-1 pl-1.5"
    : "h-7 w-7 grid place-items-center";
  const dividerClass = divider ? "border-l border-wire" : "";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`${sizing} ${dividerClass} text-wire-secondary transition-colors hover:bg-wire-sunken hover:text-wire-primary`.trim()}
    >
      {children}
    </button>
  );
}
