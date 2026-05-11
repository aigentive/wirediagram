import type { ReactNode } from "react";
import { MarketingHeader } from "./_components/MarketingHeader";
import { MarketingFooter } from "./_components/MarketingFooter";

export const metadata = {
  title: "Wire Diagram — diagrams agents can actually edit",
  description:
    "Open-source, LLM-first diagram library with native MCP support. One canonical JSON behind a React editor, a CLI, and an MCP server."
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-wire-page text-wire-primary">
      <MarketingHeader />
      <main className="min-w-0">{children}</main>
      <MarketingFooter />
    </div>
  );
}
