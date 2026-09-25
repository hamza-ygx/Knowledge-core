"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useRef } from "react";
import { PRESENTED_BY } from "@/data/org";
import { LANGS, useT } from "@/i18n";
import { useOrgStore, type View } from "@/store/useOrgStore";

const TABS: View[] = ["map", "org", "kanban", "agents"];

export default function TopBar() {
  const view = useOrgStore((s) => s.view);
  const setView = useOrgStore((s) => s.setView);
  const autoTour = useOrgStore((s) => s.autoTour);
  const setAutoTour = useOrgStore((s) => s.setAutoTour);
  const reset = useOrgStore((s) => s.reset);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lang = useOrgStore((s) => s.lang);
  const setLang = useOrgStore((s) => s.setLang);
  const paused = useOrgStore((s) => s.simPaused);
  const { t, tx } = useT();

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    setView(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between gap-4 px-4">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-[#ffb020] blur-[3px]" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#ffd36a]" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="label truncate text-[11px] font-semibold text-white/85">Agent Org Map</div>
          <div className="truncate text-[10.5px] text-white/40">
            {tx(PRESENTED_BY)} · <span className="text-[#ff9a5c]/80">{t("demoBadge")}</span>
          </div>
        </div>
      </div>

      <nav
        role="tablist"
        aria-label="Views"
        className="glass pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-full p-1"
      >
        {TABS.map((id, i) => {
          const active = view === id;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setView(id)}
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
              <span className="relative font-semibold">{t(`tab.${id}`)}</span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-auto flex items-center gap-2">
        {paused && (
          <span className="rounded-full border border-[#ffb020]/40 bg-[#ffb020]/10 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#ffcf70]">
            {t("paused")}
          </span>
        )}
        <div role="group" aria-label={t("language")} className="glass flex rounded-full p-0.5">
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                lang === code ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
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
          {t("autoTour")}
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
          <RotateCcw size={12} /> {t("reset")}
        </button>
      </div>
    </header>
  );
}
