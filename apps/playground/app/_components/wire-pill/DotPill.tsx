import type { ButtonHTMLAttributes, ReactNode } from "react";

export type DotColor = "emerald" | "slate" | "blue" | "amber" | "red";

const DOT_BG: Record<DotColor, string> = {
  emerald: "bg-wire-status-valid",
  slate: "bg-wire-tertiary",
  blue: "bg-wire-status-reserved",
  amber: "bg-wire-status-warn",
  red: "bg-wire-status-invalid"
};

type CommonProps = {
  dotColor?: DotColor;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
};

const BASE =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-wire bg-wire-surface px-2.5 text-[12px] font-medium text-wire-secondary hover:border-wire-strong hover:text-wire-primary no-underline";

function Inner({
  dotColor,
  icon,
  children
}: {
  dotColor?: DotColor;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {dotColor ? (
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_BG[dotColor]}`}
        />
      ) : null}
      {icon}
      {children}
    </>
  );
}

export function DotPill({
  dotColor,
  icon,
  children,
  className,
  title,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`${BASE} ${className ?? ""}`.trim()}
      title={title}
      {...rest}
    >
      <Inner dotColor={dotColor} icon={icon}>
        {children}
      </Inner>
    </button>
  );
}

export function DotPillStatic({
  dotColor,
  icon,
  children,
  className,
  title
}: CommonProps) {
  return (
    <span
      className={`${BASE} cursor-default ${className ?? ""}`.trim()}
      title={title}
    >
      <Inner dotColor={dotColor} icon={icon}>
        {children}
      </Inner>
    </span>
  );
}
