import type { ReactNode } from "react";

export type StatusKind = "valid" | "reserved" | "warn" | "invalid";

const STATUS_BG: Record<StatusKind, string> = {
  valid: "bg-wire-status-valid-bg text-wire-status-valid",
  reserved: "bg-wire-status-reserved-bg text-wire-status-reserved",
  warn: "bg-wire-status-warn-bg text-wire-status-warn",
  invalid: "bg-wire-status-invalid-bg text-wire-status-invalid"
};

const STATUS_DOT: Record<StatusKind, string> = {
  valid: "bg-wire-status-valid",
  reserved: "bg-wire-status-reserved",
  warn: "bg-wire-status-warn",
  invalid: "bg-wire-status-invalid"
};

export function StatusPill({
  kind,
  dot = false,
  icon,
  children,
  title
}: {
  kind: StatusKind;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium ${STATUS_BG[kind]}`}
      title={title}
    >
      {dot ? (
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[kind]}`}
        />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
