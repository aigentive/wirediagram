"use client";

import { Search } from "lucide-react";

export function NavRailSearch({
  value,
  onChange,
  placeholder = "Search wires..."
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex h-8 items-center gap-2 rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-[10px] text-wire-nav-fg transition-colors focus-within:border-[rgba(96,165,250,0.6)] focus-within:bg-[rgba(255,255,255,0.1)] focus-within:shadow-[0_0_0_2px_rgba(96,165,250,0.18)]">
      <Search size={13} strokeWidth={1.75} className="text-wire-nav-fg-dim" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] font-medium text-wire-nav-fg outline-none placeholder:text-wire-nav-fg-dim"
      />
    </label>
  );
}
