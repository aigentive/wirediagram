import type { ReactNode } from "react";
import { DocsShell } from "./_components/DocsShell";

export const metadata = {
  title: "Wire — React docs",
  description: "Docs and guides for the @aigentive/wire-react component library."
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
