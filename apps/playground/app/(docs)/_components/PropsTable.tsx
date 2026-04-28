import type { ReactNode } from "react";

export type PropRow = {
  name: string;
  type: string;
  default?: string;
  notes: ReactNode;
};

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="not-prose overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-2.5 font-extrabold">Prop</th>
            <th className="px-4 py-2.5 font-extrabold">Type</th>
            <th className="px-4 py-2.5 font-extrabold">Default</th>
            <th className="px-4 py-2.5 font-extrabold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
              <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-slate-950 dark:text-slate-50">{row.name}</td>
              <td className="px-4 py-2.5 font-mono text-[12px] text-slate-700 dark:text-slate-300">{row.type}</td>
              <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">{row.default ?? "—"}</td>
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
