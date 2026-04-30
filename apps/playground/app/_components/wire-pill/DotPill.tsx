import type { ButtonHTMLAttributes, ReactNode } from "react";

export type DotColor = "emerald" | "slate" | "blue" | "amber" | "red";
export type DotPillVariant = "outline" | "sunken";

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
  variant?: DotPillVariant;
};

const VARIANT_CLASS: Record<DotPillVariant, string> = {
  outline:
    "border border-wire bg-transparent text-wire-secondary hover:bg-wire-sunken hover:text-wire-primary",
  sunken:
    "border border-wire bg-wire-sunken text-wire-secondary hover:border-wire-strong hover:text-wire-primary"
};

const BASE =
  "inline-flex h-[26px] items-center gap-[6px] rounded-md px-[10px] text-[12px] font-medium no-underline transition-colors";

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
  variant = "outline",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`${BASE} ${VARIANT_CLASS[variant]} ${className ?? ""}`.trim()}
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
  title,
  variant = "outline"
}: CommonProps) {
  return (
    <span
      className={`${BASE} ${VARIANT_CLASS[variant]} cursor-default ${className ?? ""}`.trim()}
      title={title}
    >
      <Inner dotColor={dotColor} icon={icon}>
        {children}
      </Inner>
    </span>
  );
}
