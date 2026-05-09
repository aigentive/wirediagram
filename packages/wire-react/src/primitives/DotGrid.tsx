import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface DotGridProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function DotGrid({ children, className, style }: DotGridProps): ReactElement {
  const merged: CSSProperties = {
    backgroundImage: "radial-gradient(var(--wire-grid-dot) 1px, transparent 1px)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0",
    ...style
  };
  return (
    <div
      className={cx(
        "relative rounded-lg border border-wire bg-wire-canvas p-4",
        className
      )}
      style={merged}
    >
      {children}
    </div>
  );
}
