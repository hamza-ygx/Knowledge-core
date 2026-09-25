"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";
import AgentDrawer from "@/components/drawer/AgentDrawer";
import MapView from "@/components/map/MapView";
import Onboarding, { useOnboardingVisible } from "@/components/onboarding/Onboarding";
import Modals from "@/components/org/Modals";
import OrgView from "@/components/org/OrgView";
import ProjectsView from "@/components/projects/ProjectsView";
import SidePanel, { PANEL_RAIL, PANEL_WIDTH } from "@/components/panel/SidePanel";
import RunsView from "@/components/runs/RunsView";
import TasksView from "@/components/tasks/TasksView";
import { useOrgStore, type View } from "@/store/useOrgStore";
import TopBar from "./TopBar";

const TOP_INSET = 60;
const DRAWER_INSET = 440 + 24;
const VIEW_KEYS: Record<string, View> = { "1": "map", "2": "org", "3": "tasks", "4": "projects", "5": "runs" };

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable], [role=dialog][aria-modal=true]")) return;
      const s = useOrgStore.getState();
      const v = VIEW_KEYS[e.key];
      if (v) s.setView(v);
      else if (e.key.toLowerCase() === "d") s.toggleHud();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function AppShell({ email }: { email: string }) {
  const ready = useOrgStore((s) => s.ready);
  const loadError = useOrgStore((s) => s.loadError);
  const view = useOrgStore((s) => s.view);
  const panelOpen = useOrgStore((s) => s.panelOpen);
  const drawerOpen = useOrgStore((s) => s.selectedAgentId !== null);
  const toast = useOrgStore((s) => s.toast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = useOrgStore.getState();
    s.load();
    return s.subscribe();
  }, []);
  useShortcuts();

  const insetLeft = 16 + (panelOpen ? PANEL_WIDTH : PANEL_RAIL) + 8;
  const onboarding = useOnboardingVisible();
  const insetRight = drawerOpen ? DRAWER_INSET : 0;
  const mapInsetRight = drawerOpen ? DRAWER_INSET : onboarding ? 440 + 40 : 0;

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative h-dvh w-full overflow-hidden bg-[#07070a]">
        {!ready || !mounted ? (
          <div className="grid h-full place-items-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">Loading…</span>
          </div>
        ) : loadError ? (
          <div className="grid h-full place-items-center px-4">
            <div className="glass max-w-md rounded-2xl px-6 py-6 text-center">
              <h1 className="text-[18px] font-semibold text-white">Couldn&apos;t load your data</h1>
              <p className="mt-2 text-[13px] text-white/55">{loadError}</p>
              <button
                type="button"
                onClick={() => useOrgStore.getState().load()}
                className="mt-4 rounded-lg border border-white/15 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 hover:text-white"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {view === "map" ? (
                  <>
                    <MapView insetLeft={insetLeft} insetTop={TOP_INSET} insetRight={mapInsetRight} />
                    {onboarding && !drawerOpen && (
                      <div className="pointer-events-none absolute right-4 top-[76px] z-10">
                        <Onboarding />
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="noise absolute inset-0 transition-[padding] duration-300"
                    style={{ paddingLeft: insetLeft, paddingTop: TOP_INSET, paddingRight: insetRight }}
                  >
                    {view === "org" && <OrgView />}
                    {view === "tasks" && <TasksView />}
                    {view === "projects" && <ProjectsView />}
                    {view === "runs" && <RunsView />}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            <SidePanel />
            <AgentDrawer />
            <Modals />
          </>
        )}
        <TopBar email={email} />

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              className={`fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-[13px] shadow-2xl backdrop-blur ${
                toast.tone === "error" ? "border-red-500/40 bg-[#2a0d0b]/95 text-red-200" : "border-white/15 bg-[#15100e]/95 text-white/85"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
