"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useRef } from "react";
import { useOrgStore, type View } from "@/store/useOrgStore";

const TABS: { id: View; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "org", label: "Org" },
  { id: "kanban", label: "Kanban" },
  { id: "agents", label: "Agents" },
];

export default function TopBar() {
  const view = useOrgStore((s) => s.view);
  const setView = useOrgStore((s) => s.setView);
  const autoTour = useOrgStore((s) => s.autoTour);
  const setAutoTour = useOrgStore((s) => s.setAutoTour);
  const reset = useOrgStore((s) => s.reset);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    setView(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between gap-4 px-4">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-[#ffb020] blur-[3px]" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#ffd36a]" />
        </span>
        <span className="label truncate text-[11px] font-semibold text-white/85">Agent Org Map</span>
      </div>

      <nav
        role="tablist"
        aria-label="Views"
        className="glass pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-full p-1"
      >
        {TABS.map((t, i) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setView(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                active ? "text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] shadow-[0_0_18px_rgba(255,90,31,0.55)]"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative font-semibold">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={autoTour}
          onClick={() => {
            if (view !== "map") setView("map");
            setAutoTour(!autoTour);
          }}
          className="glass flex items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
        >
          Auto tour
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${autoTour ? "bg-[#ff5a1f]" : "bg-white/15"}`}
          >
            <motion.span
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow"
              animate={{ left: autoTour ? 14 : 2 }}
              transition={{ type: "spring", stiffness: 600, damping: 35 }}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={reset}
          className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </header>
  );
}
