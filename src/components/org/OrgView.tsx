"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { departments } from "@/data/org";
import { useT } from "@/i18n";
import type { Agent } from "@/data/types";
import { automationScore, pct } from "@/lib/metrics";
import { useOrgStore } from "@/store/useOrgStore";
import { AutomationBadge, StatusDot } from "@/components/ui/badges";
import DeptChips from "@/components/ui/DeptChips";

const CARD_W = 212;
const CARD_H = 100;
const H_GAP = 28;
const V_GAP = 64;

interface Placed {
  agent: Agent;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
}

/** Simple tidy tree: each subtree is as wide as its children, parents centred above them. */
function layoutTree(agents: Agent[]) {
  const ids = new Set(agents.map((a) => a.id));
  const children = new Map<string, Agent[]>();
  const roots: Agent[] = [];
  for (const a of agents) {
    if (a.reportsTo && ids.has(a.reportsTo)) {
      const list = children.get(a.reportsTo) ?? [];
      list.push(a);
      children.set(a.reportsTo, list);
    } else roots.push(a);
  }

  const widthCache = new Map<string, number>();
  const width = (a: Agent): number => {
    const cached = widthCache.get(a.id);
    if (cached !== undefined) return cached;
    const kids = children.get(a.id) ?? [];
    const w = kids.length ? Math.max(CARD_W, kids.reduce((s, k) => s + width(k), 0) + H_GAP * (kids.length - 1)) : CARD_W;
    widthCache.set(a.id, w);
    return w;
  };

  const placed: Placed[] = [];
  let maxDepth = 0;
  const place = (a: Agent, left: number, depth: number, parentId: string | null) => {
    const w = width(a);
    maxDepth = Math.max(maxDepth, depth);
    placed.push({ agent: a, x: left + w / 2 - CARD_W / 2, y: depth * (CARD_H + V_GAP), depth, parentId });
    let cursor = left;
    const kids = children.get(a.id) ?? [];
    const kidsWidth = kids.reduce((s, k) => s + width(k), 0) + H_GAP * Math.max(0, kids.length - 1);
    cursor += (w - kidsWidth) / 2;
    for (const k of kids) {
      place(k, cursor, depth + 1, a.id);
      cursor += width(k) + H_GAP;
    }
  };

  let left = 0;
  for (const r of roots) {
    place(r, left, 0, null);
    left += width(r) + H_GAP * 2;
  }
  const totalW = Math.max(CARD_W, left - H_GAP * 2);
  const totalH = (maxDepth + 1) * CARD_H + maxDepth * V_GAP;
  return { placed, totalW, totalH };
}

export default function OrgView() {
  const agents = useOrgStore((s) => s.agents);
  const tasks = useOrgStore((s) => s.tasks);
  const focusDeptId = useOrgStore((s) => s.focusDeptId);
  const focusDept = useOrgStore((s) => s.focusDept);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const selectedId = useOrgStore((s) => s.selectedAgentId);
  const { t, tx } = useT();

  const dept = departments.find((d) => d.id === focusDeptId) ?? departments[0];
  const own = useMemo(() => agents.filter((a) => a.departmentId === dept.id), [agents, dept.id]);
  // Layout depends only on structure, not on live status, so key it on the department.
  const tree = useMemo(() => layoutTree(own), [dept.id]);
  const byId = new Map(own.map((a) => [a.id, a]));
  const posById = new Map(tree.placed.map((p) => [p.agent.id, p]));
  const openTasks = (id: string) => tasks.filter((task) => task.agentId === id && task.column !== "done").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="label text-[10px] text-white/40">{t("orgChart")}</div>
          <h1 className="mt-1 font-mono text-[22px] font-semibold uppercase tracking-[0.18em]" style={{ color: dept.color }}>
            {tx(dept.name)}
          </h1>
          <div className="mt-0.5 text-[12.5px] text-white/50">
            {tx(dept.subtitle)} · {own.length} {t("agentsWord")} · {pct(automationScore(own))} {t("automated")} ·{" "}
            {tasks.filter((task) => task.departmentId === dept.id && task.column !== "done").length} {t("openTasks")}
          </div>
        </div>
        <DeptChips label={t("department")} selected={[dept.id]} allowAll={false} onToggle={(id) => id && focusDept(id)} />
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-6 pb-10 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={dept.id}
            className="relative mx-auto"
            style={{ width: tree.totalW, height: tree.totalH }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width={tree.totalW} height={tree.totalH} aria-hidden>
              {tree.placed.map((p) => {
                if (!p.parentId) return null;
                const parent = posById.get(p.parentId)!;
                const x1 = parent.x + CARD_W / 2;
                const y1 = parent.y + CARD_H;
                const x2 = p.x + CARD_W / 2;
                const y2 = p.y;
                const mid = (y1 + y2) / 2;
                const d = `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
                const working = byId.get(p.agent.id)?.status === "working";
                return (
                  <g key={p.agent.id}>
                    <path d={d} fill="none" stroke={dept.color} strokeOpacity={0.28} strokeWidth={1.2} />
                    <path
                      d={d}
                      fill="none"
                      stroke={dept.color}
                      strokeWidth={1.6}
                      strokeDasharray="3 14"
                      className="org-flow"
                      strokeOpacity={working ? 0.95 : 0.35}
                      style={{ filter: `drop-shadow(0 0 3px ${dept.color})` }}
                    />
                  </g>
                );
              })}
            </svg>

            {tree.placed.map((p, i) => {
              const a = byId.get(p.agent.id) ?? p.agent;
              const selected = selectedId === a.id;
              const n = openTasks(a.id);
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  onClick={() => selectAgent(a.id)}
                  aria-label={`${a.name}, ${tx(a.role)}. ${t(`status.${a.status}`)}. ${t("openDetails")}`}
                  className={`group absolute flex flex-col rounded-xl border bg-[#0d0a0a]/90 px-3.5 py-3 text-left backdrop-blur transition-[border-color,box-shadow] ${
                    selected
                      ? "border-[#ffb020] shadow-[0_0_24px_rgba(255,176,32,0.35)]"
                      : "border-[#ff5a1f]/45 hover:border-[#ff5a1f] hover:shadow-[0_0_22px_rgba(255,90,31,0.3)]"
                  }`}
                  style={{ left: p.x, top: p.y, width: CARD_W, height: CARD_H }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: p.depth * 0.08 + i * 0.015, type: "spring", stiffness: 380, damping: 30 }}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={a.status} />
                    <span className="truncate text-[14px] font-semibold text-white">{a.name}</span>
                    {p.depth === 0 && <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-[#ffb020]">{t("lead")}</span>}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-white/55">{tx(a.role)}</div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <AutomationBadge level={a.automationLevel} />
                    <span className="font-mono text-[10px] text-white/40">
                      {n} {n === 1 ? t("task1") : t("taskN")}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
