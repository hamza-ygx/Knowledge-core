"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";
import AgentsView from "@/components/agents/AgentsView";
import AskCore, { ASK_PANEL_WIDTH, AskButton } from "@/components/ask/AskCore";
import AgentDrawer from "@/components/drawer/AgentDrawer";
import KanbanView from "@/components/kanban/KanbanView";
import MapView from "@/components/map/MapView";
import OrgView from "@/components/org/OrgView";
import SidePanel, { PANEL_RAIL, PANEL_WIDTH } from "@/components/panel/SidePanel";
import { LANGS, type Lang } from "@/i18n/core";
import { useAutoTour, useSimulation } from "@/store/simulator";
import { useOrgStore, type View } from "@/store/useOrgStore";
import TopBar from "./TopBar";

const TOP_INSET = 60;
const DRAWER_INSET = 440 + 24;
const VIEW_KEYS: Record<string, View> = { "1": "map", "2": "org", "3": "kanban", "4": "agents" };
/** Booth mode: after this long without input the demo returns to the map on Auto tour. */
const IDLE_MS = 90_000;
const LANG_KEY = "agent-org-map.lang";

function useLanguagePersistence() {
  const lang = useOrgStore((s) => s.lang);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved && LANGS.includes(saved)) useOrgStore.getState().setLang(saved);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (!loaded) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
  }, [lang, loaded]);
}

function useIdleReturn() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const attract = () => {
      const s = useOrgStore.getState();
      s.selectAgent(null);
      s.setAskOpen(false);
      s.setSpotlight([]);
      s.setView("map");
      s.setSimPaused(false);
      s.setAutoTour(true);
    };
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(attract, IDLE_MS);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, []);
}

function usePresenterKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, [contenteditable]")) return;
      const s = useOrgStore.getState();
      const v = VIEW_KEYS[e.key];
      if (v) return s.setView(v);
      switch (e.key.toLowerCase()) {
        case "k":
          s.setView("map");
          s.setAskOpen(true);
          break;
        case "p":
          s.setSimPaused(!s.simPaused);
          break;
        case "d":
          s.toggleHud();
          break;
        case "l":
          s.setLang(s.lang === "sv" ? "en" : "sv");
          break;
        case "f":
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else document.documentElement.requestFullscreen?.().catch(() => {});
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function AppShell() {
  useSimulation();
  useAutoTour();
  useLanguagePersistence();
  useIdleReturn();
  usePresenterKeys();

  const view = useOrgStore((s) => s.view);
  const panelOpen = useOrgStore((s) => s.panelOpen);
  const drawerOpen = useOrgStore((s) => s.selectedAgentId !== null);
  const askOpen = useOrgStore((s) => s.askOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const insetLeft = 16 + (panelOpen ? PANEL_WIDTH : PANEL_RAIL) + 8;
  const mapInsetRight = drawerOpen ? DRAWER_INSET : askOpen ? ASK_PANEL_WIDTH + 24 : 0;

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative h-dvh w-full overflow-hidden bg-[#07070a]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {view === "map" ? (
              mounted && (
                <>
                  <MapView insetLeft={insetLeft} insetTop={TOP_INSET} insetRight={mapInsetRight} insetBottom={askOpen ? 0 : 56} />
                  <div
                    className="pointer-events-none absolute bottom-14 z-10 flex justify-center"
                    style={{ left: insetLeft, right: mapInsetRight }}
                  >
                    <AskButton />
                  </div>
                </>
              )
            ) : (
              <div
                className="noise absolute inset-0 transition-[padding] duration-300"
                style={{ paddingLeft: insetLeft, paddingTop: TOP_INSET, paddingRight: drawerOpen ? DRAWER_INSET : 0 }}
              >
                {view === "org" && <OrgView />}
                {view === "kanban" && <KanbanView />}
                {view === "agents" && <AgentsView />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <TopBar />
        <SidePanel />
        {view === "map" && <AskCore />}
        <AgentDrawer />
      </main>
    </MotionConfig>
  );
}
