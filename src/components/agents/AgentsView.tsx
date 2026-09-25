"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { departments } from "@/data/org";
import type { Agent, AgentStatus, AutomationLevel } from "@/data/types";
import { useOrgStore } from "@/store/useOrgStore";
import { useT, type UIKey } from "@/i18n";
import { AutomationBadge, StatusLabel } from "@/components/ui/badges";
import DeptChips from "@/components/ui/DeptChips";
import { TOOL_ICONS } from "@/components/drawer/toolIcons";

type SortKey = "name" | "department" | "automation" | "status" | "tasks";
type Dir = "asc" | "desc";

const deptOrder = new Map(departments.map((d, i) => [d.id, i]));
const deptById = new Map(departments.map((d) => [d.id, d]));
const AUTOMATION_RANK: Record<AutomationLevel, number> = { documented: 0, partly_automated: 1, fully_automated: 2 };
const STATUS_RANK: Record<AgentStatus, number> = { blocked: 0, working: 1, idle: 2 };

const COLUMNS: { key: SortKey | null; label: UIKey; className?: string }[] = [
  { key: "name", label: "th.agent" },
  { key: "department", label: "th.department" },
  { key: null, label: "th.reportsTo", className: "hidden xl:table-cell" },
  { key: "automation", label: "th.automation" },
  { key: "status", label: "th.status" },
  { key: "tasks", label: "th.tasks", className: "text-right" },
  { key: null, label: "th.tools", className: "hidden lg:table-cell" },
];

export default function AgentsView() {
  const agents = useOrgStore((s) => s.agents);
  const tasks = useOrgStore((s) => s.tasks);
  const focusDeptId = useOrgStore((s) => s.focusDeptId);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const selectedId = useOrgStore((s) => s.selectedAgentId);

  const { t, tx } = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string[]>(focusDeptId ? [focusDeptId] : []);
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "department", dir: "asc" });

  useEffect(() => {
    setFilter(focusDeptId ? [focusDeptId] : []);
  }, [focusDeptId]);

  const openTasks = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (t.column !== "done") m.set(t.agentId, (m.get(t.agentId) ?? 0) + 1);
    return m;
  }, [tasks]);

  const nameById = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = agents.filter((a) => {
      if (filter.length && !filter.includes(a.departmentId)) return false;
      if (!q) return true;
      const dept = deptById.get(a.departmentId);
      const hay = [
        a.name,
        tx(a.role),
        dept && tx(dept.name),
        t(`status.${a.status}`),
        t(`auto.${a.automationLevel}`),
        ...a.tools,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    const cmp = (a: Agent, b: Agent): number => {
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name);
        case "department":
          return (deptOrder.get(a.departmentId) ?? 0) - (deptOrder.get(b.departmentId) ?? 0) || (a.reportsTo ? 1 : 0) - (b.reportsTo ? 1 : 0);
        case "automation":
          return AUTOMATION_RANK[a.automationLevel] - AUTOMATION_RANK[b.automationLevel];
        case "status":
          return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        case "tasks":
          return (openTasks.get(a.id) ?? 0) - (openTasks.get(b.id) ?? 0);
      }
    };
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => cmp(a, b) * dir || a.name.localeCompare(b.name));
  }, [agents, filter, query, sort, openTasks, t, tx]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const toggleDept = (id: string | null) => {
    if (id === null) return setFilter([]);
    setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="label text-[10px] text-white/40">{t("directory")}</div>
          <h1 className="mt-1 font-mono text-[22px] font-semibold uppercase tracking-[0.18em] text-white">
            {t("agentsTitle")} <span className="text-white/35">{rows.length}/{agents.length}</span>
          </h1>
        </div>
        <label className="glass flex w-full max-w-xs items-center gap-2 rounded-full px-3.5 py-2 focus-within:border-[#ff5a1f]/60">
          <Search size={14} className="text-white/40" aria-hidden />
          <span className="sr-only">{t("searchAria")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="w-full bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none"
          />
        </label>
      </div>
      <div className="px-6 pb-3">
        <DeptChips label={t("filterDept")} selected={filter} onToggle={toggleDept} />
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#0f0b0b]/95 backdrop-blur">
              <tr className="border-b border-white/[0.07]">
                {COLUMNS.map((c) => {
                  const active = c.key && sort.key === c.key;
                  return (
                    <th
                      key={c.label}
                      scope="col"
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/45 ${c.className ?? ""}`}
                    >
                      {c.key ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key!)}
                          className={`inline-flex items-center gap-1.5 uppercase tracking-[0.16em] hover:text-white ${active ? "text-[#ff9a5c]" : ""}`}
                        >
                          {t(c.label)}
                          {active ? sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} className="opacity-40" />}
                        </button>
                      ) : (
                        t(c.label)
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const dept = deptById.get(a.departmentId)!;
                return (
                  <tr
                    key={a.id}
                    onClick={() => selectAgent(a.id)}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-[#ff5a1f]/[0.05] ${
                      selectedId === a.id ? "bg-[#ffb020]/[0.07]" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => selectAgent(a.id)} className="text-left">
                        <div className="text-[13px] font-medium text-white">{a.name}</div>
                        <div className="text-[11.5px] text-white/50">{tx(a.role)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 text-[12.5px] text-white/75">
                        <span className="h-2 w-2 rounded-full" style={{ background: dept.color, boxShadow: `0 0 6px ${dept.color}` }} />
                        {tx(dept.name)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-[12.5px] text-white/55 xl:table-cell">
                      {a.reportsTo ? nameById.get(a.reportsTo) : <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#ffb020]">{t("lead")}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <AutomationBadge level={a.automationLevel} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusLabel status={a.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] text-white/70">{openTasks.get(a.id) ?? 0}</td>
                    <td className="hidden px-4 py-2.5 lg:table-cell">
                      <span className="flex gap-1.5">
                        {a.tools.map((t) => {
                          const Icon = TOOL_ICONS[t];
                          return (
                            <span key={t} title={t} className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-white/[0.03]">
                              <Icon size={12} className="text-[#ff8a4c]" aria-label={t} />
                            </span>
                          );
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[13px] text-white/40">
                    {t("noMatch", { q: query })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
