"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListPlus, Pencil, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { KIND_LABELS, type Agent } from "@/data/types";
import { agentAutomation, automationLevel, automationScore, groupSteps, pct } from "@/lib/metrics";
import { useOrgStore } from "@/store/useOrgStore";
import { AutomationBadge, StatusDot } from "@/components/ui/badges";
import DeptChips from "@/components/ui/DeptChips";
import { Button } from "@/components/ui/form";

const CARD_W = 212;
const CARD_H = 104;
const H_GAP = 28;
const V_GAP = 64;

interface Placed {
  agent: Agent;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
}

/** Tidy tree: each subtree is as wide as its children, parents centred above them. Cycles are broken, never looped. */
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
  const width = (a: Agent, seen = new Set<string>()): number => {
    const cached = widthCache.get(a.id);
    if (cached !== undefined) return cached;
    seen.add(a.id);
    const kids = (children.get(a.id) ?? []).filter((k) => !seen.has(k.id));
    const w = kids.length ? Math.max(CARD_W, kids.reduce((s, k) => s + width(k, seen), 0) + H_GAP * (kids.length - 1)) : CARD_W;
    widthCache.set(a.id, w);
    return w;
  };

  const placed: Placed[] = [];
  const done = new Set<string>();
  let maxDepth = 0;
  const place = (a: Agent, left: number, depth: number, parentId: string | null) => {
    if (done.has(a.id)) return;
    done.add(a.id);
    const w = width(a);
    maxDepth = Math.max(maxDepth, depth);
    placed.push({ agent: a, x: left + w / 2 - CARD_W / 2, y: depth * (CARD_H + V_GAP), depth, parentId });
    const kids = (children.get(a.id) ?? []).filter((k) => !done.has(k.id));
    const kidsWidth = kids.reduce((s, k) => s + width(k), 0) + H_GAP * Math.max(0, kids.length - 1);
    let cursor = left + (w - kidsWidth) / 2;
    for (const k of kids) {
      place(k, cursor, depth + 1, a.id);
      cursor += width(k) + H_GAP;
    }
  };

  let left = 0;
  for (const r of [...roots, ...agents]) {
    if (done.has(r.id)) continue;
    place(r, left, 0, null);
    left += width(r) + H_GAP * 2;
  }
  const totalW = Math.max(CARD_W, left - H_GAP * 2);
  const totalH = (maxDepth + 1) * CARD_H + maxDepth * V_GAP;
  return { placed, totalW, totalH };
}

export default function OrgView() {
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const steps = useOrgStore((s) => s.steps);
  const tasks = useOrgStore((s) => s.tasks);
  const focusDeptId = useOrgStore((s) => s.focusDeptId);
  const focusDept = useOrgStore((s) => s.focusDept);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const selectedId = useOrgStore((s) => s.selectedAgentId);
  const openModal = useOrgStore((s) => s.openModal);

  const dept = departments.find((d) => d.id === focusDeptId) ?? departments[0];
  const own = useMemo(() => (dept ? agents.filter((a) => a.departmentId === dept.id) : []), [agents, dept]);
  const structure = own.map((a) => `${a.id}:${a.reportsTo}`).join(",");
  const tree = useMemo(() => layoutTree(own), [structure]);
  const byId = new Map(own.map((a) => [a.id, a]));
  const posById = new Map(tree.placed.map((p) => [p.agent.id, p]));
  const stepsByAgent = useMemo(() => groupSteps(steps), [steps]);

  if (!dept) {
    return (
      <div className="grid h-full place-items-center">
        <div className="glass max-w-sm rounded-2xl px-6 py-6 text-center">
          <h1 className="text-[18px] font-semibold text-white">No departments yet</h1>
          <p className="mt-2 text-[13px] text-white/55">Start by adding a department. Agents live inside departments.</p>
          <Button tone="primary" className="mt-4" onClick={() => openModal({ type: "department" })}>
            <Plus size={13} /> Add department
          </Button>
        </div>
      </div>
    );
  }

  const openTasks = (id: string) => tasks.filter((t) => t.agentId === id && t.column !== "done").length;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <div className="label text-[10px] text-white/40">Org chart</div>
            <h1 className="mt-1 flex items-center gap-2 font-mono text-[22px] font-semibold uppercase tracking-[0.18em]" style={{ color: dept.color }}>
              {dept.name}
              <button
                type="button"
                onClick={() => openModal({ type: "department", id: dept.id })}
                aria-label={`Edit ${dept.name}`}
                className="grid h-7 w-7 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"
              >
                <Pencil size={13} />
              </button>
            </h1>
            <div className="mt-0.5 text-[12.5px] text-white/50">
              {dept.subtitle && `${dept.subtitle} · `}
              {own.length} agents · {pct(automationScore(own, stepsByAgent))} automated
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeptChips label="Department" selected={[dept.id]} allowAll={false} onToggle={(id) => id && focusDept(id)} />
            <Button onClick={() => openModal({ type: "department" })}>
              <Plus size={13} /> Department
            </Button>
            <Button tone="primary" onClick={() => openModal({ type: "agent", departmentId: dept.id })}>
              <UserPlus size={13} /> Agent
            </Button>
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-auto px-6 pb-10 pt-4">
          {own.length === 0 ? (
            <div className="mx-auto mt-10 max-w-sm text-center">
              <p className="text-[13px] text-white/50">No agents in {dept.name} yet.</p>
              <Button tone="primary" className="mt-3" onClick={() => openModal({ type: "agent", departmentId: dept.id })}>
                <UserPlus size={13} /> Add the first agent
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={dept.id}
                className="relative mx-auto"
                style={{ width: tree.totalW, height: tree.totalH }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="pointer-events-none absolute inset-0 overflow-visible" width={tree.totalW} height={tree.totalH} aria-hidden>
                  {tree.placed.map((p) => {
                    if (!p.parentId) return null;
                    const parent = posById.get(p.parentId);
                    if (!parent) return null;
                    const x1 = parent.x + CARD_W / 2;
                    const y1 = parent.y + CARD_H;
                    const x2 = p.x + CARD_W / 2;
                    const y2 = p.y;
                    const mid = (y1 + y2) / 2;
                    return (
                      <path
                        key={p.agent.id}
                        d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                        fill="none"
                        stroke={dept.color}
                        strokeOpacity={0.4}
                        strokeWidth={1.2}
                      />
                    );
                  })}
                </svg>

                {tree.placed.map((p) => {
                  const a = byId.get(p.agent.id) ?? p.agent;
                  const agentSteps = stepsByAgent.get(a.id) ?? [];
                  const n = openTasks(a.id);
                  return (
                    <div key={a.id} className="group absolute" style={{ left: p.x, top: p.y, width: CARD_W, height: CARD_H }}>
                      <button
                        type="button"
                        onClick={() => selectAgent(a.id)}
                        aria-label={`${a.name}, ${a.role}. Open details`}
                        className={`flex h-full w-full flex-col rounded-xl border bg-[#0d0a0a]/90 px-3.5 py-3 text-left backdrop-blur transition-[border-color,box-shadow] ${
                          selectedId === a.id
                            ? "border-[#ffb020] shadow-[0_0_24px_rgba(255,176,32,0.35)]"
                            : "border-[#ff5a1f]/45 hover:border-[#ff5a1f] hover:shadow-[0_0_22px_rgba(255,90,31,0.3)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <StatusDot status={a.status} />
                          <span className="truncate text-[14px] font-semibold text-white">{a.name}</span>
                          <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">{KIND_LABELS[a.kind]}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-white/55">{a.role || "No role yet"}</div>
                        <div className="mt-auto flex items-center justify-between gap-2">
                          <AutomationBadge level={automationLevel(agentAutomation(agentSteps))} />
                          <span className="whitespace-nowrap font-mono text-[10px] text-white/40" title={`${n} open ${n === 1 ? "task" : "tasks"}`}>
                            {agentSteps.filter((s) => s.automated).length}/{agentSteps.length} steps
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal({ type: "agent", departmentId: dept.id, reportsTo: a.id })}
                        aria-label={`Add someone reporting to ${a.name}`}
                        title="Add a report"
                        className="absolute -bottom-3 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border border-[#ff5a1f]/50 bg-[#1a0f0b] text-[#ff9a5c] opacity-0 transition-opacity hover:bg-[#ff5a1f]/20 focus:opacity-100 group-hover:opacity-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <AutomationBacklog departmentId={dept.id} />
    </div>
  );
}

/** Every manual step in the department, one click from becoming a task. */
function AutomationBacklog({ departmentId }: { departmentId: string }) {
  const agents = useOrgStore((s) => s.agents);
  const steps = useOrgStore((s) => s.steps);
  const tasks = useOrgStore((s) => s.tasks);
  const [allDepts, setAllDepts] = useState(false);

  const scope = agents.filter((a) => allDepts || a.departmentId === departmentId);
  const agentIds = new Set(scope.map((a) => a.id));
  const manual = steps.filter((s) => !s.automated && agentIds.has(s.agentId));
  const taskTitles = new Set(tasks.map((t) => t.title));
  const titleFor = (text: string) => `Automate: ${text}`.slice(0, 200);

  return (
    <aside className="scroll-thin hidden w-80 shrink-0 overflow-y-auto border-l border-white/5 px-5 py-5 lg:block">
      <div className="flex items-center justify-between">
        <h2 className="label text-[10px] text-white/45">Automation backlog</h2>
        <button
          type="button"
          onClick={() => setAllDepts((v) => !v)}
          className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#ff9a5c] hover:text-white"
        >
          {allDepts ? "This department" : "All departments"}
        </button>
      </div>
      <p className="mt-1 text-[12px] text-white/40">
        {manual.length ? `${manual.length} manual steps left. Turn one into a task to plan the automation.` : "Nothing manual left here."}
      </p>
      <ul className="mt-4 space-y-4">
        {scope.map((a) => {
          const list = manual.filter((s) => s.agentId === a.id);
          if (!list.length) return null;
          return (
            <li key={a.id}>
              <div className="text-[12px] font-medium text-white/75">{a.name}</div>
              <ul className="mt-1.5 space-y-1.5">
                {list.map((s) => {
                  const planned = taskTitles.has(titleFor(s.text));
                  return (
                    <li key={s.id} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                      <span className="flex-1 text-[12px] leading-snug text-white/70">{s.text}</span>
                      {planned ? (
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">Planned</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            useOrgStore.getState().addTask({ title: titleFor(s.text), agentId: a.id, departmentId: a.departmentId, column: "todo" })
                          }
                          title="Create task"
                          aria-label={`Create a task to automate: ${s.text}`}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#ff9a5c] hover:bg-[#ff5a1f]/15"
                        >
                          <ListPlus size={13} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
