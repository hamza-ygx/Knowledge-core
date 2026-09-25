"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { departments } from "@/data/org";
import { AUTOMATION_LABELS, COLUMN_LABELS, type Agent, type AutomationLevel } from "@/data/types";
import { useOrgStore } from "@/store/useOrgStore";
import { TOOL_ICONS } from "./toolIcons";

const LEVELS: { id: AutomationLevel; label: string }[] = [
  { id: "documented", label: "Fully documented" },
  { id: "partly_automated", label: "Partly automated" },
  { id: "fully_automated", label: "Fully automated" },
];

export default function AgentDrawer() {
  const selectedId = useOrgStore((s) => s.selectedAgentId);
  const select = useOrgStore((s) => s.selectAgent);
  const agents = useOrgStore((s) => s.agents);
  const agent = agents.find((a) => a.id === selectedId);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  useEffect(() => {
    if (selectedId || !returnFocus.current) return;
    returnFocus.current.focus?.();
    returnFocus.current = null;
  }, [selectedId]);

  return (
    <AnimatePresence>
      {agent && (
        <motion.aside
          key="drawer"
          role="dialog"
          aria-modal="false"
          aria-label={`${agent.name} details`}
          className="glass absolute bottom-4 right-4 top-[68px] z-40 flex w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl"
          initial={{ x: "110%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0.4 }}
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
        >
          <DrawerBody agent={agent} agents={agents} closeRef={closeRef} onClose={() => select(null)} onSelect={select} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({
  agent,
  agents,
  closeRef,
  onClose,
  onSelect,
}: {
  agent: Agent;
  agents: Agent[];
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const dept = departments.find((d) => d.id === agent.departmentId)!;
  const manager = agents.find((a) => a.id === agent.reportsTo);
  const reports = agents.filter((a) => a.reportsTo === agent.id);
  const tasks = useOrgStore((s) => s.tasks).filter((t) => t.agentId === agent.id && t.column !== "done");
  const activity = useOrgStore((s) => s.activity);
  const log = activity.filter((e) => e.agentId === agent.id).slice(0, 8);
  const levelIdx = LEVELS.findIndex((l) => l.id === agent.automationLevel);
  const now = useNow(5000);

  return (
    <>
      <header className="relative border-b border-white/5 px-6 pb-5 pt-5">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${dept.color}, transparent)` }} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label text-[10px]" style={{ color: dept.color }}>
              {dept.name}
            </div>
            <h2 className="mt-1.5 truncate text-[24px] font-semibold leading-tight text-white">{agent.name}</h2>
            <div className="text-[13px] text-white/60">{agent.role}</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close agent details"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <StatusChip status={agent.status} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{AUTOMATION_LABELS[agent.automationLevel]}</span>
        </div>
      </header>

      <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-2.5 text-[12.5px]">
          <Meta>Department</Meta>
          <span className="text-white/85">{dept.name}</span>
          <Meta>Reports to</Meta>
          <span>
            {manager ? <AgentLink agent={manager} onSelect={onSelect} /> : <span className="text-white/40">— (department lead)</span>}
          </span>
          <Meta>Direct reports</Meta>
          <span className="flex flex-wrap items-start gap-1.5">
            {reports.length ? reports.map((r) => <AgentLink key={r.id} agent={r} onSelect={onSelect} />) : <span className="text-white/40">None</span>}
          </span>
        </section>

        <section>
          <SectionTitle>Automation level</SectionTitle>
          <ol className="mt-3 grid grid-cols-3 gap-1.5">
            {LEVELS.map((l, i) => {
              const reached = i <= levelIdx;
              const current = i === levelIdx;
              return (
                <li key={l.id} aria-current={current ? "step" : undefined}>
                  <div
                    className={`h-1.5 rounded-full ${reached ? "bg-gradient-to-r from-[#ff5a1f] to-[#ffb020]" : "bg-white/10"}`}
                    style={reached ? { boxShadow: "0 0 10px rgba(255,120,40,0.6)" } : undefined}
                  />
                  <div className={`mt-1.5 text-[10.5px] leading-tight ${current ? "text-[#ffb020]" : reached ? "text-white/70" : "text-white/35"}`}>
                    {l.label}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <SectionTitle>Process</SectionTitle>
          <ol className="mt-3">
            {agent.process.map((p, i) => (
              <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                {i < agent.process.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-px bg-white/10" />}
                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                    p.automated ? "border-[#ff5a1f]/70 bg-[#ff5a1f]/15 text-[#ffb27a]" : "border-white/15 bg-white/[0.03] text-white/55"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-0.5">
                  <span className="text-[12.5px] leading-snug text-white/85">{p.step}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                      p.automated ? "bg-[#ff5a1f]/15 text-[#ff9a5c]" : "bg-white/[0.06] text-white/45"
                    }`}
                  >
                    {p.automated ? "Automated" : "Manual"}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionTitle>Tools</SectionTitle>
          <ul className="mt-3 flex flex-wrap gap-2">
            {agent.tools.map((t) => {
              const Icon = TOOL_ICONS[t];
              return (
                <li key={t} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-white/75">
                  <Icon size={13} className="text-[#ff8a4c]" aria-hidden />
                  {t}
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <SectionTitle>Current tasks</SectionTitle>
          {tasks.length ? (
            <ul className="mt-3 space-y-1.5">
              {tasks.map((t) => (
                <motion.li
                  layout
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px]"
                >
                  <span className="truncate text-white/80">{t.title}</span>
                  <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#ff9a5c]">{COLUMN_LABELS[t.column]}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-white/40">No open tasks.</p>
          )}
        </section>

        <section>
          <SectionTitle>Activity</SectionTitle>
          <ul className="mt-3 space-y-2" aria-live="polite">
            <AnimatePresence initial={false}>
              {log.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 text-[12px]"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      e.kind === "kb" ? "bg-[#ffb020] shadow-[0_0_6px_#ffb020]" : e.kind === "task" ? "bg-[#ff5a1f]" : "bg-white/40"
                    }`}
                  />
                  <span className="flex-1 text-white/75">{e.text}</span>
                  <span className="shrink-0 font-mono text-[10px] text-white/35">{ago(now - e.at)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {!log.length && <li className="text-[12px] text-white/40">Waiting for activity…</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

function StatusChip({ status }: { status: Agent["status"] }) {
  const style =
    status === "working"
      ? "bg-[#ffb020]/15 text-[#ffcf70] border-[#ffb020]/30"
      : status === "blocked"
        ? "bg-red-500/15 text-red-300 border-red-500/40"
        : "bg-white/5 text-white/55 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${style}`}>
      {status === "working" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : status === "idle" ? <Check size={10} /> : null}
      {status}
    </span>
  );
}

function AgentLink({ agent, onSelect }: { agent: Agent; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className="rounded-full border border-[#ff5a1f]/30 bg-[#ff5a1f]/[0.06] px-2 py-0.5 text-[11.5px] text-[#ffc29a] hover:border-[#ff5a1f]/70 hover:text-white"
    >
      {agent.name}
    </button>
  );
}

const Meta = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 leading-[20px]">{children}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="label text-[10px] text-white/45">{children}</h3>
);

function useNow(interval: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}
