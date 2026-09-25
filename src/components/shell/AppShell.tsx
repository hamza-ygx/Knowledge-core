"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";
import AgentDrawer from "@/components/drawer/AgentDrawer";
import MapView from "@/components/map/MapView";
import SidePanel, { PANEL_RAIL, PANEL_WIDTH } from "@/components/panel/SidePanel";
import { useAutoTour, useSimulation } from "@/store/simulator";
import { useOrgStore, type View } from "@/store/useOrgStore";
import ComingNext from "./ComingNext";
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
              <div className="absolute inset-0 noise" style={{ paddingLeft: insetLeft, paddingTop: TOP_INSET }}>
                {view === "org" && (
                  <ComingNext title="Org chart" detail="Per-department org chart built from reportsTo, with a department picker." />
                )}
                {view === "kanban" && (
                  <ComingNext title="Kanban" detail="One live board across all departments with drag-and-drop and simulated flow." />
                )}
                {view === "agents" && (
                  <ComingNext title="Agents" detail="Searchable, sortable table of all agents." />
                )}
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
