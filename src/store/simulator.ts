"use client";

import { useEffect } from "react";
import { blockReasons, clientNames, departments, knowledgeTopics, taskTemplates } from "@/data/org";
import { TASK_COLUMNS, type Agent, type TaskColumn } from "@/data/types";
import { l, type L } from "@/i18n/core";
import { simEvents } from "./events";
import { useOrgStore } from "./useOrgStore";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Join a fixed prefix with a localized detail: "Started · <title>". */
const join = (prefix: L, detail: L): L => ({ en: `${prefix.en} · ${detail.en}`, sv: `${prefix.sv} · ${detail.sv}` });

const TXT = {
  kbRead: l("Read knowledge base", "Läste kunskapsbasen"),
  unblocked: l("Unblocked · resumed work", "Avblockerad · fortsätter arbeta"),
  blocked: l("Blocked", "Blockerad"),
  picked: l("Picked up work from queue", "Tog nästa uppgift från kön"),
  idle: l("Queue empty · idle", "Kön är tom · ledig"),
  newTask: l("New task", "Ny uppgift"),
};

const VERB: Record<TaskColumn, L> = {
  backlog: l("Queued", "Köad"),
  todo: l("Planned", "Planerad"),
  in_progress: l("Started", "Påbörjade"),
  review: l("Submitted for review", "Skickade för granskning"),
  done: l("Completed", "Slutförde"),
};

const MAX_DONE = 16;
let newTaskSeq = 1000;

function nextColumn(c: TaskColumn): TaskColumn | null {
  const i = TASK_COLUMNS.indexOf(c);
  return i < TASK_COLUMNS.length - 1 ? TASK_COLUMNS[i + 1] : null;
}

function pickActiveAgent(agents: Agent[]): Agent {
  const working = agents.filter((a) => a.status === "working");
  return working.length && chance(0.7) ? pick(working) : pick(agents);
}

function kbRead(emit: boolean, at?: number) {
  const s = useOrgStore.getState();
  const agent = pickActiveAgent(s.agents.filter((a) => a.status !== "blocked"));
  const topic = pick(knowledgeTopics[agent.departmentId] ?? [l("shared notes", "delade anteckningar")]);
  s.recordKbRead();
  s.log(agent.id, join(TXT.kbRead, topic), "kb", at);
  if (emit) simEvents.emit({ type: "kb-read", agentId: agent.id });
}

function statusChange(at?: number) {
  const s = useOrgStore.getState();
  const agent = pick(s.agents);
  const hasActiveTask = s.tasks.some((t) => t.agentId === agent.id && t.column === "in_progress");

  if (agent.status === "blocked") {
    s.setAgentStatus(agent.id, hasActiveTask ? "working" : "idle");
    s.log(agent.id, TXT.unblocked, "status", at);
  } else if (chance(0.18)) {
    s.setAgentStatus(agent.id, "blocked");
    s.log(agent.id, join(TXT.blocked, pick(blockReasons)), "status", at);
  } else if (agent.status === "idle") {
    s.setAgentStatus(agent.id, "working");
    s.log(agent.id, TXT.picked, "status", at);
  } else if (!hasActiveTask) {
    s.setAgentStatus(agent.id, "idle");
    s.log(agent.id, TXT.idle, "status", at);
  }
}

function advanceTask(emit: boolean, at?: number) {
  const s = useOrgStore.getState();
  const blocked = new Set(s.agents.filter((a) => a.status === "blocked").map((a) => a.id));
  const movable = s.tasks.filter(
    (t) => t.column !== "done" && !blocked.has(t.agentId) && t.id !== s.draggingTaskId,
  );
  if (!movable.length) return;

  const task = pick(movable);
  const to = nextColumn(task.column);
  if (!to) return;
  s.moveTask(task.id, to);
  if (emit) s.markMoved(task.id);
  s.log(task.agentId, join(VERB[to], task.title), "task", at);

  if (to === "in_progress") s.setAgentStatus(task.agentId, "working");
  if (to === "done") {
    const stillBusy = useOrgStore
      .getState()
      .tasks.some((t) => t.agentId === task.agentId && t.column === "in_progress");
    if (!stillBusy) s.setAgentStatus(task.agentId, "idle");
  }
  if (emit) {
    simEvents.emit({ type: "task-flow", agentId: task.agentId, direction: to === "done" || to === "review" ? "in" : "out" });
  }

  const done = useOrgStore.getState().tasks.filter((t) => t.column === "done");
  const oldest = done.find((t) => t.id !== s.draggingTaskId);
  if (done.length > MAX_DONE && oldest) s.removeTask(oldest.id);
}

function spawnTask(emit: boolean, at?: number) {
  const s = useOrgStore.getState();
  const dept = pick(departments);
  const agent = pick(s.agents.filter((a) => a.departmentId === dept.id));
  const client = pick(clientNames);
  const tpl = pick(taskTemplates[dept.id] ?? [l("New task", "Ny uppgift")]);
  const title: L = { en: tpl.en.replace("{client}", client), sv: tpl.sv.replace("{client}", client) };
  s.addTask({
    id: `n${++newTaskSeq}`,
    title,
    agentId: agent.id,
    departmentId: dept.id,
    column: chance(0.5) ? "backlog" : "todo",
  });
  s.log(agent.id, join(TXT.newTask, title), "task", at);
  if (emit) simEvents.emit({ type: "task-flow", agentId: agent.id, direction: "out" });
}

function backfill() {
  const now = Date.now();
  for (let i = 40; i > 0; i--) {
    const at = now - i * 9000;
    if (chance(0.5)) kbRead(false, at);
    else if (chance(0.5)) advanceTask(false, at);
    else statusChange(at);
  }
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const paused = () => useOrgStore.getState().simPaused;

/** Mount once at the app root. Drives all "live" behaviour. */
export function useSimulation() {
  const resetNonce = useOrgStore((s) => s.resetNonce);

  useEffect(() => {
    const slow = prefersReducedMotion() ? 2.5 : 1;
    if (useOrgStore.getState().activity.length === 0) backfill();

    const tick = setInterval(() => {
      if (paused()) return;
      const r = Math.random();
      if (r < 0.6) kbRead(true);
      else if (r < 0.8) {
        const agent = pickActiveAgent(useOrgStore.getState().agents);
        simEvents.emit({ type: "task-flow", agentId: agent.id, direction: chance(0.5) ? "in" : "out" });
      } else if (r < 0.9) statusChange();
    }, 450 * slow);

    let taskTimer: ReturnType<typeof setTimeout>;
    const scheduleTask = () => {
      taskTimer = setTimeout(() => {
        if (!paused()) {
          if (chance(0.15)) spawnTask(true);
          else advanceTask(true);
        }
        scheduleTask();
      }, between(2000, 4000) * slow);
    };
    scheduleTask();

    return () => {
      clearInterval(tick);
      clearTimeout(taskTimer);
    };
  }, [resetNonce]);
}

/** Cycles the map camera through each department while enabled. */
export function useAutoTour() {
  const autoTour = useOrgStore((s) => s.autoTour);

  useEffect(() => {
    if (!autoTour) return;
    const stops: (string | null)[] = [...departments.map((d) => d.id), null];
    let i = Math.max(0, stops.indexOf(useOrgStore.getState().focusDeptId) + 1) % stops.length;
    const step = () => {
      useOrgStore.getState().focusDept(stops[i]);
      i = (i + 1) % stops.length;
    };
    step();
    const id = setInterval(step, 5000);
    return () => clearInterval(id);
  }, [autoTour]);
}
