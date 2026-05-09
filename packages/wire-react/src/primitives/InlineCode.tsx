import type { ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface InlineCodeProps {
  children: ReactNode;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps): ReactElement {
  return (
    <code
      className={cx(
        "rounded-sm bg-wire-sunken px-[5px] py-[1px] font-mono text-[12.5px] text-wire-primary",
        className
      )}
    >
      {children}
    </code>
  );
}
