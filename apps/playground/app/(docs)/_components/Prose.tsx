import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "grid gap-5 text-[15px] leading-7 text-slate-700 dark:text-slate-300",
        "[&_h2]:m-0 [&_h2]:mt-6 [&_h2]:scroll-mt-24 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-950 dark:[&_h2]:text-slate-50",
        "[&_h3]:m-0 [&_h3]:mt-4 [&_h3]:scroll-mt-24 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-slate-950 dark:[&_h3]:text-slate-50",
        "[&_p]:m-0 [&_p]:max-w-[68ch]",
        "[&_ul]:m-0 [&_ul]:grid [&_ul]:gap-2 [&_ul]:pl-5 [&_ul>li]:list-disc",
        "[&_ol]:m-0 [&_ol]:grid [&_ol]:gap-2 [&_ol]:pl-5 [&_ol>li]:list-decimal",
        "[&_strong]:font-bold [&_strong]:text-slate-950 dark:[&_strong]:text-slate-50",
        "[&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-300"
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-100">
      {children}
    </code>
  );
}
