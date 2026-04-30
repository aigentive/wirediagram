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
    <label
      className="flex h-9 items-center gap-2 rounded-md border px-2 text-wire-nav-fg"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.08)"
      }}
    >
      <Search size={14} strokeWidth={1.5} className="text-wire-nav-fg-dim" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-wire-nav-fg outline-none placeholder:text-wire-nav-fg-dim"
      />
    </label>
  );
}
