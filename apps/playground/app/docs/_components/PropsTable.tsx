import type { ReactNode } from "react";

export type PropRow = {
  name: string;
  type: string;
  default?: string;
  notes: ReactNode;
};

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="not-prose overflow-x-auto rounded-lg border border-wire bg-wire-surface">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead className="bg-wire-sunken">
          <tr className="border-b border-wire">
            <th className="h-11 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">Prop</th>
            <th className="h-11 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">Type</th>
            <th className="h-11 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">Default</th>
            <th className="h-11 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-wire-tertiary">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-wire first:border-t-0">
              <td className="h-11 px-3 font-mono text-[12px] font-bold text-wire-primary">{row.name}</td>
              <td className="h-11 px-3 font-mono text-[12px] text-wire-secondary">{row.type}</td>
              <td className="h-11 px-3 font-mono text-[12px] text-wire-tertiary">{row.default ?? "—"}</td>
              <td className="h-11 px-3 text-wire-secondary">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
