"use client";

import { departments } from "@/data/org";

interface Props {
  /** Selected department ids. Empty = all. */
  selected: string[];
  onToggle: (id: string | null) => void;
  allowAll?: boolean;
  label: string;
}

export default function DeptChips({ selected, onToggle, allowAll = true, label }: Props) {
  const chip = (active: boolean) =>
    `flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
      active ? "border-[#ff5a1f]/60 bg-[#ff5a1f]/15 text-white" : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"
    }`;

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {allowAll && (
        <button type="button" aria-pressed={selected.length === 0} onClick={() => onToggle(null)} className={chip(selected.length === 0)}>
          All
        </button>
      )}
      {departments.map((d) => {
        const active = selected.includes(d.id);
        return (
          <button key={d.id} type="button" aria-pressed={active} onClick={() => onToggle(d.id)} className={chip(active)}>
            <span className="h-2 w-2 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
