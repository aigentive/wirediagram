import type { ElementType, ReactElement, ReactNode } from "react";
import { cx } from "../components/classes.js";

export interface EyebrowProps {
  children: ReactNode;
  muted?: boolean;
  className?: string;
  as?: ElementType;
}

export function Eyebrow({ children, muted, className, as }: EyebrowProps): ReactElement {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag className={cx("wire-eyebrow", muted && "wire-eyebrow--muted", className)}>
      {children}
    </Tag>
  );
}
