"use client";

import type { ReactNode } from "react";

export function NavRailButton({
  icon,
  onClick,
  disabled = false,
  type = "button",
  children
}: {
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-[7px] rounded-lg bg-wire-nav-button px-3 py-[9px] text-[13px] font-semibold text-wire-nav-button-fg shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_1px_2px_rgba(0,0,0,0.25)] transition-colors hover:bg-wire-nav-button-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {children}
    </button>
  );
}
