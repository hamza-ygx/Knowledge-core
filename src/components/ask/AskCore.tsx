"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { askScenarios, type AskScenario } from "@/data/askCore";
import { KNOWLEDGE_CORE_LABEL, departments } from "@/data/org";
import { useT } from "@/i18n";
import { l, type L } from "@/i18n/core";
import { simEvents } from "@/store/events";
import { prefersReducedMotion } from "@/store/simulator";
import { useOrgStore } from "@/store/useOrgStore";

export const ASK_PANEL_WIDTH = 440;

type Phase = { kind: "pick" } | { kind: "running"; step: number } | { kind: "answer" };

const deptColor = new Map(departments.flatMap((d) => d.agents.map((a) => [a.id, d.color] as const)));
const READ = l("Read knowledge base", "Läste kunskapsbasen");

/** Floating call-to-action on the map. */
export function AskButton() {
  const { t } = useT();
  const open = useOrgStore((s) => s.askOpen);
  const setOpen = useOrgStore((s) => s.setAskOpen);
  return (
    <AnimatePresence>
      {!open && (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[#ffb020]/60 bg-gradient-to-b from-[#2a1608]/90 to-[#170c06]/90 px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#ffd48a] shadow-[0_0_30px_rgba(255,160,40,0.35)] backdrop-blur transition-shadow hover:shadow-[0_0_44px_rgba(255,160,40,0.6)]"
        >
          <Sparkles size={15} className="text-[#ffb020]" />
          {t("askButton")}
          <kbd className="ml-1 rounded border border-white/15 px-1.5 text-[9px] text-white/40">K</kbd>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function AskCore() {
  const open = useOrgStore((s) => s.askOpen);
  return <AnimatePresence>{open && <AskPanel key="ask" />}</AnimatePresence>;
}

function AskPanel() {
  const { t, tx } = useT();
  const agents = useOrgStore((s) => s.agents);
  const [scenario, setScenario] = useState<AskScenario | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firstButton = useRef<HTMLButtonElement>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const close = useCallback(() => {
    const s = useOrgStore.getState();
    s.setSpotlight([]);
    s.setAskOpen(false);
  }, []);

  // Leave the map in a clean state when the panel goes away.
  useEffect(() => {
    const s = useOrgStore.getState();
    s.setAutoTour(false);
    s.focusDept(null);
    firstButton.current?.focus();
    return () => {
      clearTimers();
      useOrgStore.getState().setSpotlight([]);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useOrgStore.getState().selectedAgentId) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const run = (sc: AskScenario) => {
    clearTimers();
    const s = useOrgStore.getState();
    const fast = prefersReducedMotion() ? 0.5 : 1;
    const ids = sc.steps.map((st) => st.agentId);
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms * fast));

    setScenario(sc);
    setPhase({ kind: "running", step: 0 });
    s.selectAgent(null);
    s.focusDept(null);
    s.setSpotlight(ids);

    // 1. The question travels out from the core to every agent involved.
    ids.forEach((id, i) => at(150 + i * 120, () => simEvents.emit({ type: "task-flow", agentId: id, direction: "out" })));

    // 2. Each agent in turn reads the knowledge base.
    const STEP = 1500;
    sc.steps.forEach((st, i) => {
      const start = 1300 + i * STEP;
      at(start, () => {
        setPhase({ kind: "running", step: i + 1 });
        const store = useOrgStore.getState();
        store.setAgentStatus(st.agentId, "working");
        store.recordKbRead();
        store.log(st.agentId, { en: `${READ.en} · ${st.text.en}`, sv: `${READ.sv} · ${st.text.sv}` }, "kb");
        simEvents.emit({ type: "kb-read", agentId: st.agentId });
      });
      at(start + 650, () => simEvents.emit({ type: "kb-read", agentId: st.agentId }));
    });

    // 3. Compile: everyone streams into the core at once.
    const compile = 1300 + sc.steps.length * STEP;
    at(compile, () => {
      setPhase({ kind: "running", step: sc.steps.length + 1 });
      ids.forEach((id) => simEvents.emit({ type: "kb-read", agentId: id }));
    });
    at(compile + 500, () => ids.forEach((id) => simEvents.emit({ type: "kb-read", agentId: id })));

    // 4. Answer.
    const total = compile + 1500;
    at(total, () => {
      setElapsed(Math.round((total * fast) / 100) / 10);
      setPhase({ kind: "answer" });
    });
  };

  const reset = () => {
    clearTimers();
    useOrgStore.getState().setSpotlight([]);
    setScenario(null);
    setPhase({ kind: "pick" });
  };

  const stepsFor = (sc: AskScenario): L[] => [
    l("Question sent to the Knowledge Core", "Frågan skickas till kunskapskärnan"),
    ...sc.steps.map((s) => s.text),
    l("Compiling the answer", "Sammanställer svaret"),
  ];

  return (
    <motion.aside
      role="dialog"
      aria-label={t("askTitle")}
      className="glass absolute bottom-4 right-4 top-[68px] z-30 flex flex-col overflow-hidden rounded-2xl"
      style={{ width: `min(${ASK_PANEL_WIDTH}px, calc(100vw - 2rem))` }}
      initial={{ x: "110%", opacity: 0.4 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "110%", opacity: 0.4 }}
      transition={{ type: "spring", stiffness: 320, damping: 36 }}
    >
      <header className="relative border-b border-white/5 px-6 pb-4 pt-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffb020] to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label flex items-center gap-2 text-[10px] text-[#ffb020]">
              <Sparkles size={12} /> {tx(KNOWLEDGE_CORE_LABEL)}
            </div>
            <h2 className="mt-1.5 text-[20px] font-semibold leading-tight text-white">{t("askTitle")}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          {phase.kind === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-[13px] leading-relaxed text-white/55">{t("askIntro")}</p>
              <ul className="mt-4 space-y-2">
                {askScenarios.map((sc, i) => (
                  <li key={sc.id}>
                    <button
                      ref={i === 0 ? firstButton : undefined}
                      type="button"
                      onClick={() => run(sc)}
                      className="group w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[13.5px] leading-snug text-white/85 transition-colors hover:border-[#ffb020]/60 hover:bg-[#ffb020]/[0.07] hover:text-white"
                    >
                      <span className="mr-2 font-mono text-[11px] text-[#ffb020]/70 group-hover:text-[#ffb020]">{i + 1}</span>
                      {tx(sc.question)}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {phase.kind !== "pick" && scenario && (
            <motion.div key={`run-${scenario.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-xl border border-[#ffb020]/30 bg-[#ffb020]/[0.06] px-4 py-3 text-[14px] font-medium leading-snug text-white">
                {tx(scenario.question)}
              </div>

              <ol className="mt-4 space-y-2" aria-live="polite">
                {stepsFor(scenario).map((text, i) => {
                  const current = phase.kind === "running" ? phase.step : Infinity;
                  const done = i < current;
                  const active = i === current;
                  if (i > current) return null;
                  const agentId = i > 0 && i <= scenario.steps.length ? scenario.steps[i - 1].agentId : null;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 text-[12.5px]"
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          done ? "border-[#ff5a1f]/70 bg-[#ff5a1f]/20 text-[#ffb27a]" : "border-[#ffb020]/70 text-[#ffb020]"
                        }`}
                      >
                        {done ? <Check size={11} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffb020]" />}
                      </span>
                      {agentId && (
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: deptColor.get(agentId) }} aria-hidden />
                      )}
                      <span className={active ? "text-white" : "text-white/60"}>{tx(text)}</span>
                    </motion.li>
                  );
                })}
              </ol>

              {phase.kind === "answer" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                  <h3 className="label text-[10px] text-white/45">{t("askAnswer")}</h3>
                  <TypedText text={tx(scenario.answer)} />
                  <div className="mt-3 font-mono text-[10.5px] text-[#ff9a5c]">
                    {t("askTime", { s: elapsed.toLocaleString(tx(l("en-GB", "sv-SE"))), m: scenario.manualMinutes })}
                  </div>

                  <h3 className="label mt-5 text-[10px] text-white/45">{t("askSources")}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {scenario.sources.map((src, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-white/75"
                      >
                        <FileText size={12} className="text-[#ffb020]" aria-hidden />
                        {tx(src)}
                      </li>
                    ))}
                  </ul>

                  <h3 className="label mt-5 text-[10px] text-white/45">{t("askAgents")}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {scenario.steps.map((st) => {
                      const a = agents.find((x) => x.id === st.agentId);
                      if (!a) return null;
                      return (
                        <li key={st.agentId}>
                          <button
                            type="button"
                            onClick={() => useOrgStore.getState().selectAgent(a.id)}
                            className="flex items-center gap-1.5 rounded-full border border-[#ff5a1f]/30 bg-[#ff5a1f]/[0.06] px-2.5 py-1 text-[11.5px] text-[#ffc29a] hover:border-[#ff5a1f]/70 hover:text-white"
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: deptColor.get(a.id) }} aria-hidden />
                            {a.name} · {tx(a.role)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={reset}
                    className="mt-6 w-full rounded-xl border border-[#ffb020]/50 bg-[#ffb020]/10 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffd48a] hover:bg-[#ffb020]/20"
                  >
                    {t("askAnother")}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

/** Reveals the answer like it is being written. Click to show it all at once. */
function TypedText({ text }: { text: string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (shown >= text.length) return;
    const id = setTimeout(() => setShown((n) => Math.min(text.length, n + 3)), 22);
    return () => clearTimeout(id);
  }, [shown, text.length]);
  return (
    <p
      className="mt-2 cursor-text text-[14px] leading-relaxed text-white/90"
      onClick={() => setShown(text.length)}
      aria-label={text}
    >
      <span aria-hidden>{text.slice(0, shown)}</span>
      {shown < text.length && <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#ffb020]" />}
    </p>
  );
}
