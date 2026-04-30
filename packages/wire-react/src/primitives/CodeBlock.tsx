import type { ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface CodeBlockProps {
  children: ReactNode;
  language?: string;
  className?: string;
}

export function CodeBlock({ children, language, className }: CodeBlockProps): ReactElement {
  return (
    <pre
      data-language={language}
      className={cx(
        "overflow-auto rounded-lg bg-wire-code p-4 font-mono text-[13px] leading-[1.55]",
        "text-[var(--wire-fg-on-code)]",
        className
      )}
    >
      {children}
    </pre>
  );
}
