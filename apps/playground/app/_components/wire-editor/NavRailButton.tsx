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
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-wire-nav-button px-4 text-[14px] font-bold text-wire-nav-button-fg shadow-wire-sm transition-colors hover:bg-wire-nav-button-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {children}
    </button>
  );
}
