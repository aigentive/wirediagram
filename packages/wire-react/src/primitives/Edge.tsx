import type { CSSProperties, ReactElement } from "react";
import { cx } from "../components/classes.js";

export interface EdgeProps {
  width?: number;
  dashed?: boolean;
  className?: string;
}

export function Edge({ width = 28, dashed, className }: EdgeProps): ReactElement {
  const style: CSSProperties = dashed
    ? {
      width,
      height: 1,
      backgroundImage:
        "linear-gradient(to right, var(--wire-slate-400) 50%, transparent 50%)",
      backgroundSize: "6px 1px",
      flexShrink: 0
    }
    : {
      width,
      height: 1,
      backgroundColor: "var(--wire-slate-400)",
      flexShrink: 0
    };
  return <div aria-hidden className={cx(className)} style={style} />;
}
