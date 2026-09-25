"use client";

import { Check } from "lucide-react";
import { useOrgStore } from "@/store/useOrgStore";

/** True until the first department, agent and process step exist. */
export function useOnboardingVisible() {
  return useOrgStore((s) => !(s.departments.length > 0 && s.agents.length > 0 && s.steps.length > 0));
}

/** First-run checklist, shown on the map until the basics exist. */
export default function Onboarding() {
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const steps = useOrgStore((s) => s.steps);
  const openModal = useOrgStore((s) => s.openModal);
  const selectAgent = useOrgStore((s) => s.selectAgent);

  const items = [
    {
      done: departments.length > 0,
      title: "Add a department",
      text: "Group your agents, e.g. Sales, Finance or Admin.",
      action: () => openModal({ type: "department" }),
      cta: "Add department",
    },
    {
      done: agents.length > 0,
      title: "Add your first agent",
      text: "An AI agent, an automation, or a person who does a job.",
      action: () => openModal({ type: "agent" }),
      cta: "Add agent",
    },
    {
      done: steps.length > 0,
      title: "Describe its process",
      text: "List the steps and mark which are automated. That drives the automation %.",
      action: () => agents[0] && selectAgent(agents[0].id),
      cta: "Open agent",
    },
    {
      done: agents.some((a) => a.hasWebhook),
      title: "Connect a webhook (optional)",
      text: "Let a real agent report its runs. Try it with a test run.",
      action: () => agents[0] && selectAgent(agents[0].id),
      cta: "Set up",
    },
  ];

  if (items.slice(0, 3).every((i) => i.done)) return null;
  const next = items.findIndex((i) => !i.done);

  return (
    <div className="glass pointer-events-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl px-5 py-5">
      <div className="label text-[10px] text-[#ff8a4c]">Get started</div>
      <h2 className="mt-1 text-[18px] font-semibold text-white">Map your organisation</h2>
      <ol className="mt-4 space-y-3">
        {items.map((item, i) => {
          const current = i === next;
          const disabled = !item.done && i > 0 && !items[Math.min(i - 1, 1)].done;
          return (
            <li key={item.title} className={`flex gap-3 ${disabled ? "opacity-40" : ""}`}>
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                  item.done ? "border-[#ff5a1f]/70 bg-[#ff5a1f]/20 text-[#ffb27a]" : current ? "border-[#ffb020] text-[#ffb020]" : "border-white/15 text-white/40"
                }`}
              >
                {item.done ? <Check size={12} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-[13.5px] ${item.done ? "text-white/50 line-through" : "text-white"}`}>{item.title}</div>
                {!item.done && <div className="text-[12px] text-white/45">{item.text}</div>}
              </div>
              {!item.done && !disabled && (
                <button
                  type="button"
                  onClick={item.action}
                  className={`h-fit shrink-0 rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    current ? "bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] text-black" : "border border-white/12 text-white/70 hover:text-white"
                  }`}
                >
                  {item.cta}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
