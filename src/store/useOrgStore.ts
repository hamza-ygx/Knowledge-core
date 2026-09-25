"use client";

import { create } from "zustand";
import { allAgents, tasks as seedTasks } from "@/data/org";
import type { Agent, AgentStatus, Task, TaskColumn } from "@/data/types";
import { DEFAULT_LANG, type L, type Lang } from "@/i18n/core";

export type View = "map" | "org" | "kanban" | "agents";

export interface ActivityEntry {
  id: number;
  agentId: string;
  at: number;
  text: L;
  kind: "kb" | "task" | "status";
}

const MAX_ACTIVITY = 400;

interface OrgState {
  agents: Agent[];
  tasks: Task[];
  activity: ActivityEntry[];
  kbReads: number;

  view: View;
  lang: Lang;
  selectedAgentId: string | null;
  hoveredDeptId: string | null;
  focusDeptId: string | null;
  autoTour: boolean;
  panelOpen: boolean;
  resetNonce: number;
  /** Task currently held by the user in the Kanban; the simulator leaves it alone. */
  draggingTaskId: string | null;
  /** Last task the simulator moved, so the board can flash it. */
  lastMovedTaskId: string | null;
  simPaused: boolean;
  /** Presenter debug overlay (FPS / particle count). */
  showHud: boolean;
  askOpen: boolean;
  /** Agents highlighted on the map during an "Ask the Knowledge Core" run. */
  spotlightAgentIds: string[];

  setView: (v: View) => void;
  setLang: (l: Lang) => void;
  selectAgent: (id: string | null) => void;
  hoverDept: (id: string | null) => void;
  focusDept: (id: string | null) => void;
  setAutoTour: (on: boolean) => void;
  togglePanel: () => void;
  reset: () => void;
  setDragging: (id: string | null) => void;
  markMoved: (id: string | null) => void;
  setSimPaused: (on: boolean) => void;
  toggleHud: () => void;
  setAskOpen: (on: boolean) => void;
  setSpotlight: (ids: string[]) => void;

  moveTask: (taskId: string, column: TaskColumn) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  log: (agentId: string, text: L, kind: ActivityEntry["kind"], at?: number) => void;
  recordKbRead: () => void;
}

let activitySeq = 0;

const freshData = () => ({
  agents: allAgents.map((a) => ({ ...a })),
  tasks: seedTasks.map((t) => ({ ...t })),
  activity: [] as ActivityEntry[],
  kbReads: 0,
});

export const useOrgStore = create<OrgState>((set) => ({
  ...freshData(),

  view: "map",
  lang: DEFAULT_LANG,
  selectedAgentId: null,
  hoveredDeptId: null,
  focusDeptId: null,
  autoTour: false,
  panelOpen: true,
  resetNonce: 0,
  draggingTaskId: null,
  lastMovedTaskId: null,
  simPaused: false,
  showHud: false,
  askOpen: false,
  spotlightAgentIds: [],

  setView: (view) =>
    set((s) => (view === "map" ? { view } : { view, askOpen: false, spotlightAgentIds: s.askOpen ? [] : s.spotlightAgentIds })),
  setLang: (lang) => set({ lang }),
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
  hoverDept: (hoveredDeptId) => set({ hoveredDeptId }),
  focusDept: (focusDeptId) => set({ focusDeptId }),
  setAutoTour: (autoTour) => set({ autoTour }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  reset: () =>
    set((s) => ({
      ...freshData(),
      view: "map",
      selectedAgentId: null,
      hoveredDeptId: null,
      focusDeptId: null,
      autoTour: false,
      simPaused: false,
      askOpen: false,
      spotlightAgentIds: [],
      resetNonce: s.resetNonce + 1,
    })),

  setDragging: (draggingTaskId) => set({ draggingTaskId }),
  markMoved: (lastMovedTaskId) => set({ lastMovedTaskId }),
  setSimPaused: (simPaused) => set({ simPaused }),
  toggleHud: () => set((s) => ({ showHud: !s.showHud })),
  setAskOpen: (askOpen) => set({ askOpen }),
  setSpotlight: (spotlightAgentIds) => set({ spotlightAgentIds }),

  moveTask: (taskId, column) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, column } : t)) })),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  removeTask: (taskId) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),
  setAgentStatus: (agentId, status) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? { ...a, status } : a)) })),
  log: (agentId, text, kind, at = Date.now()) =>
    set((s) => {
      const activity = [{ id: ++activitySeq, agentId, at, text, kind }, ...s.activity];
      if (activity.length > MAX_ACTIVITY) activity.length = MAX_ACTIVITY;
      return { activity };
    }),
  recordKbRead: () => set((s) => ({ kbReads: s.kbReads + 1 })),
}));

export const agentById = (agents: Agent[], id: string | null | undefined) =>
  id ? agents.find((a) => a.id === id) : undefined;
