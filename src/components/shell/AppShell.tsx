"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";
import AgentsView from "@/components/agents/AgentsView";
import AgentDrawer from "@/components/drawer/AgentDrawer";
import KanbanView from "@/components/kanban/KanbanView";
import MapView from "@/components/map/MapView";
import OrgView from "@/components/org/OrgView";
import SidePanel, { PANEL_RAIL, PANEL_WIDTH } from "@/components/panel/SidePanel";
import { useAutoTour, useSimulation } from "@/store/simulator";
import { useOrgStore, type View } from "@/store/useOrgStore";
import TopBar from "./TopBar";

const TOP_INSET = 60;
const DRAWER_INSET = 440 + 24;
const VIEW_KEYS: Record<string, View> = { "1": "map", "2": "org", "3": "kanban", "4": "agents" };

export default function AppShell() {
  useSimulation();
  useAutoTour();

  const view = useOrgStore((s) => s.view);
  const panelOpen = useOrgStore((s) => s.panelOpen);
  const drawerOpen = useOrgStore((s) => s.selectedAgentId !== null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 1–4 switch views when focus isn't in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, [contenteditable]")) return;
      const v = VIEW_KEYS[e.key];
      if (v) useOrgStore.getState().setView(v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const insetLeft = 16 + (panelOpen ? PANEL_WIDTH : PANEL_RAIL) + 8;

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
              mounted && <MapView insetLeft={insetLeft} insetTop={TOP_INSET} insetRight={drawerOpen ? DRAWER_INSET : 0} />
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
        <AgentDrawer />
      </main>
    </MotionConfig>
  );
}
