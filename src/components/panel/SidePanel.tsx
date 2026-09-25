"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useMemo } from "react";
import type { AutomationLevel } from "@/data/types";
import { agentAutomation, automationLevel, automationScore, groupSteps, pct } from "@/lib/metrics";
import { useOrgStore } from "@/store/useOrgStore";

export const PANEL_WIDTH = 330;
export const PANEL_RAIL = 52;

export default function SidePanel() {
  const open = useOrgStore((s) => s.panelOpen);
  const toggle = useOrgStore((s) => s.togglePanel);
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const steps = useOrgStore((s) => s.steps);
  const tasks = useOrgStore((s) => s.tasks);
  const runs = useOrgStore((s) => s.runs);
  const hovered = useOrgStore((s) => s.hoveredDeptId);
  const focused = useOrgStore((s) => s.focusDeptId);
  const hoverDept = useOrgStore((s) => s.hoverDept);
  const focusDept = useOrgStore((s) => s.focusDept);
  const openModal = useOrgStore((s) => s.openModal);

  const stepsByAgent = useMemo(() => groupSteps(steps), [steps]);
  const overall = automationScore(agents, stepsByAgent);
  const automatedSteps = steps.filter((s) => s.automated).length;

  const today = new Date().toDateString();
  const runsToday = runs.filter((r) => new Date(r.startedAt).toDateString() === today);
  const failedToday = runsToday.filter((r) => r.status === "failed").length;

  const rows = useMemo(
    () =>
      departments.map((d) => {
        const own = agents.filter((a) => a.departmentId === d.id);
        return {
          dept: d,
          levels: own.map((a) => automationLevel(agentAutomation(stepsByAgent.get(a.id) ?? []))),
          score: automationScore(own, stepsByAgent),
          agentCount: own.length,
          openTasks: tasks.filter((t) => t.departmentId === d.id && t.column !== "done").length,
        };
      }),
    [departments, agents, tasks, stepsByAgent],
  );

  return (
    <motion.aside
      aria-label="Departments"
      className="glass absolute bottom-4 left-4 top-[68px] z-20 flex flex-col overflow-hidden rounded-2xl"
      initial={false}
      animate={{ width: open ? PANEL_WIDTH : PANEL_RAIL }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Collapse panel" : "Expand panel"}
        className="absolute right-2 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
      >
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="open"
            className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto"
            style={{ width: PANEL_WIDTH }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="border-b border-white/5 px-5 pb-5 pt-4">
              <div className="label text-[10px] text-[#ff8a4c]">Your organisation</div>
              <div className="mt-3 text-[12px] text-white/55">Runs without you</div>
              <div className="flex items-end justify-between">
                <div className="bg-gradient-to-b from-[#ffd36a] to-[#ff5a1f] bg-clip-text font-mono text-[44px] font-semibold leading-none tracking-tight text-transparent">
                  {pct(overall)}
                </div>
                <div className="pb-1 text-right font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-white/40">
                  {agents.length} agents
                  <br />
                  {automatedSteps}/{steps.length} steps automated
                </div>
              </div>
              <Bar value={overall} color="#ff5a1f" thick />
            </div>

            <div className="px-3 py-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="label text-[10px] text-white/40">Departments</span>
                <button
                  type="button"
                  onClick={() => openModal({ type: "department" })}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff9a5c] hover:bg-[#ff5a1f]/10"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {rows.length === 0 && <p className="px-2 pb-2 text-[12.5px] text-white/40">No departments yet.</p>}
              <ul className="flex flex-col gap-1">
                {rows.map(({ dept, levels, score, agentCount, openTasks }) => {
                  const active = hovered === dept.id || focused === dept.id;
                  return (
                    <li key={dept.id} className="group relative">
                      <button
                        type="button"
                        onMouseEnter={() => hoverDept(dept.id)}
                        onMouseLeave={() => hoverDept(null)}
                        onFocus={() => hoverDept(dept.id)}
                        onBlur={() => hoverDept(null)}
                        onClick={() => focusDept(dept.id)}
                        aria-pressed={focused === dept.id}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active ? "border-[#ff5a1f]/35 bg-[#ff5a1f]/[0.07]" : "border-transparent hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2 pr-6">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dept.color, boxShadow: `0 0 8px ${dept.color}` }} />
                          <span className="flex-1 truncate text-[13px] font-medium text-white/90">{dept.name}</span>
                          <span className="font-mono text-[10.5px] text-white/55">{pct(score)} automated</span>
                        </div>
                        <Bar value={score} color={dept.color} />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Pips levels={levels} color={dept.color} />
                          <span className="shrink-0 font-mono text-[10px] text-white/40">
                            {agentCount} agents · {openTasks} tasks
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal({ type: "department", id: dept.id })}
                        aria-label={`Edit ${dept.name}`}
                        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-white/40 opacity-0 transition-opacity hover:bg-white/10 hover:text-white focus:opacity-100 group-hover:opacity-100"
                      >
                        <Pencil size={11} />
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      focusDept(null);
                      useOrgStore.getState().setView("runs");
                    }}
                    className="w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#ffb020] shadow-[0_0_10px_#ffb020]" />
                      <span className="flex-1 truncate text-[13px] font-medium text-white/90">Knowledge Core</span>
                      <span className="font-mono text-[10.5px] text-white/55">{runsToday.length} runs today</span>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-white/40">
                      {failedToday ? <span className="text-red-300">{failedToday} failed today</span> : "no failures today"} ·{" "}
                      {agents.filter((a) => a.hasWebhook).length} agents connected
                    </div>
                  </button>
                </li>
              </ul>
            </div>

            <div className="mt-auto flex items-center gap-4 border-t border-white/5 px-5 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">
              <span className="flex items-center gap-1.5">
                <Pip level="fully_automated" color="#ff8a4c" /> Fully
              </span>
              <span className="flex items-center gap-1.5">
                <Pip level="partly_automated" color="#ff8a4c" /> Partly
              </span>
              <span className="flex items-center gap-1.5">
                <Pip level="documented" color="#ff8a4c" /> Manual
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.ul
            key="rail"
            className="mt-12 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {departments.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  title={d.name}
                  aria-label={d.name}
                  onMouseEnter={() => hoverDept(d.id)}
                  onMouseLeave={() => hoverDept(null)}
                  onClick={() => focusDept(d.id)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/5"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function Bar({ value, color, thick }: { value: number; color: string; thick?: boolean }) {
  return (
    <div className={`mt-2 w-full overflow-hidden rounded-full bg-white/[0.06] ${thick ? "h-1.5" : "h-[3px]"}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 10px ${color}` }}
        initial={false}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

function Pips({ levels, color }: { levels: AutomationLevel[]; color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-[3px]" aria-hidden>
      {levels.map((level, i) => (
        <Pip key={i} level={level} color={color} />
      ))}
    </div>
  );
}

function Pip({ level, color }: { level: AutomationLevel; color: string }) {
  if (level === "fully_automated") {
    return <span className="h-[7px] w-[7px] rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />;
  }
  if (level === "partly_automated") {
    return (
      <span
        className="h-[7px] w-[7px] rounded-full"
        style={{ background: `linear-gradient(90deg, ${color} 50%, transparent 50%)`, border: `1px solid ${color}` }}
      />
    );
  }
  return <span className="h-[7px] w-[7px] rounded-full border" style={{ borderColor: `${color}99` }} />;
}
