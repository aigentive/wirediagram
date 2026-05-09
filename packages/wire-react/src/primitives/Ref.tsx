import type { ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface RefProps {
  children: ReactNode;
  className?: string;
}

export function Ref({ children, className }: RefProps): ReactElement {
  return (
    <span className={cx("font-mono text-[10.5px] text-wire-tertiary", className)}>
      {children}
    </span>
  );
}
