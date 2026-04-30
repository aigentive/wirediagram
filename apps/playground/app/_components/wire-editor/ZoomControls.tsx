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
    <div className="flex flex-col overflow-hidden rounded-md border border-wire bg-wire-surface shadow-wire-sm">
      <ZoomButton label="Zoom in" onClick={onZoomIn}>
        <Plus size={14} strokeWidth={1.5} />
      </ZoomButton>
      <ZoomButton label="Zoom out" onClick={onZoomOut} divider>
        <Minus size={14} strokeWidth={1.5} />
      </ZoomButton>
      <ZoomButton label="Fit to view" onClick={onFit} divider>
        <Maximize2 size={14} strokeWidth={1.5} />
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
  children
}: {
  label: string;
  onClick?: () => void;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        divider
          ? "grid h-7 w-7 place-items-center border-t border-wire text-wire-secondary transition-colors hover:bg-wire-sunken hover:text-wire-primary"
          : "grid h-7 w-7 place-items-center text-wire-secondary transition-colors hover:bg-wire-sunken hover:text-wire-primary"
      }
    >
      {children}
    </button>
  );
}
