import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "grid gap-5 text-[15px] leading-7 text-wire-secondary",
        "[&_h2]:m-0 [&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-wire [&_h2]:pt-8 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-wire-primary [&_h2:first-child]:mt-0 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0",
        "[&_h3]:m-0 [&_h3]:mt-5 [&_h3]:scroll-mt-24 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:tracking-tight [&_h3]:text-wire-primary",
        "[&_p]:m-0 [&_p]:max-w-[68ch]",
        "[&_ul]:m-0 [&_ul]:grid [&_ul]:gap-2.5 [&_ul]:pl-5 [&_ul>li]:list-disc [&_ul>li::marker]:text-wire-tertiary",
        "[&_ol]:m-0 [&_ol]:grid [&_ol]:gap-2.5 [&_ol]:pl-5 [&_ol>li]:list-decimal [&_ol>li::marker]:font-bold [&_ol>li::marker]:text-wire-tertiary",
        "[&_strong]:font-bold [&_strong]:text-wire-primary",
        "[&_a]:font-medium [&_a]:text-wire-link [&_a]:underline [&_a]:underline-offset-2",
        "[&_table]:w-full [&_table]:border-collapse",
        "[&_th]:h-11 [&_th]:px-3 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-wire-tertiary [&_th]:border-b [&_th]:border-wire",
        "[&_td]:h-11 [&_td]:px-3 [&_td]:border-b [&_td]:border-wire [&_td]:text-[13px] [&_td]:text-wire-secondary"
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm border border-wire bg-wire-sunken px-[5px] py-[1px] font-mono text-[12.5px] text-wire-primary">
      {children}
    </code>
  );
}
