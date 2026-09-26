"use client";

import type { PostgrestError, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { create } from "zustand";
import type { Agent, AgentKind, AgentStatus, Department, Intake, Priority, ProcessStep, Project, ProjectStatus, Run, RunStatus, Task, TaskColumn } from "@/data/types";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { mapEvents } from "./events";

export type View = "map" | "org" | "tasks" | "projects" | "runs";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

const MAX_RUNS = 300;

/* ------------------------------ mappers ------------------------------ */

const toDepartment = (r: Row<"departments">): Department => ({
  id: r.id,
  name: r.name,
  subtitle: r.subtitle,
  color: r.color,
  position: r.position,
});

const toAgent = (r: Row<"agents">): Agent => ({
  id: r.id,
  departmentId: r.department_id,
  reportsTo: r.reports_to,
  name: r.name,
  role: r.role,
  kind: r.kind as AgentKind,
  status: r.status as AgentStatus,
  tools: r.tools,
  description: r.description,
  hasWebhook: r.webhook_token_hash !== null,
  lastRunAt: r.last_run_at,
  position: r.position,
});

const toStep = (r: Row<"process_steps">): ProcessStep => ({
  id: r.id,
  agentId: r.agent_id,
  position: r.position,
  text: r.text,
  automated: r.automated,
});

const toTask = (r: Row<"tasks">): Task => ({
  id: r.id,
  departmentId: r.department_id,
  agentId: r.agent_id,
  title: r.title,
  notes: r.notes,
  column: r.stage as TaskColumn,
  position: r.position,
  dueDate: r.due_date,
});

const toRun = (r: Row<"runs">): Run => ({
  id: r.id,
  agentId: r.agent_id,
  externalId: r.external_id,
  status: r.status as RunStatus,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  durationMs: r.duration_ms,
  summary: r.summary,
  output: r.output,
  error: r.error,
});

const toProject = (r: Row<"projects">): Project => ({
  id: r.id,
  name: r.name,
  status: r.status as ProjectStatus,
  priority: r.priority as Priority,
  summary: r.summary,
  currentWork: r.current_work,
  nextSteps: r.next_steps,
  location: r.location,
  links: r.links,
  target: r.target,
  notes: r.notes,
  position: r.position,
  updatedAt: r.updated_at,
});

const toIntake = (r: Row<"intakes">): Intake => ({
  id: r.id,
  text: r.text,
  files: (Array.isArray(r.files) ? r.files : []) as Intake["files"],
  status: r.status as Intake["status"],
  summary: r.summary,
  error: r.error,
  createdAt: r.created_at,
  costUsd: Number(r.cost_usd ?? 0),
});

const byCreatedDesc = (a: Intake, b: Intake) => b.createdAt.localeCompare(a.createdAt);

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
const byStartDesc = (a: Run, b: Run) => b.startedAt.localeCompare(a.startedAt);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "aom_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------- store ------------------------------- */

export interface Toast {
  id: number;
  text: string;
  tone: "error" | "info";
}

export type NewAgent = Pick<Agent, "departmentId" | "name"> & Partial<Pick<Agent, "role" | "kind" | "reportsTo" | "tools" | "description">>;
export type ModalState =
  | { type: "department"; id?: string }
  | { type: "agent"; departmentId?: string; reportsTo?: string }
  | { type: "project"; id?: string }
  | { type: "task"; id?: string; column?: TaskColumn; title?: string; agentId?: string | null; departmentId?: string | null }
  | null;

export type NewTask = Pick<Task, "title"> & Partial<Omit<Task, "id" | "title">>;

interface OrgState {
  ready: boolean;
  loadError: string | null;
  departments: Department[];
  agents: Agent[];
  steps: ProcessStep[];
  tasks: Task[];
  runs: Run[];
  projects: Project[];
  intakes: Intake[];

  view: View;
  selectedAgentId: string | null;
  hoveredDeptId: string | null;
  focusDeptId: string | null;
  panelOpen: boolean;
  resetNonce: number;
  draggingTaskId: string | null;
  showHud: boolean;
  toast: Toast | null;
  modal: ModalState;

  setView: (v: View) => void;
  selectAgent: (id: string | null) => void;
  hoverDept: (id: string | null) => void;
  focusDept: (id: string | null) => void;
  togglePanel: () => void;
  resetCamera: () => void;
  setDragging: (id: string | null) => void;
  toggleHud: () => void;
  showToast: (text: string, tone?: Toast["tone"]) => void;
  openModal: (m: ModalState) => void;

  load: () => Promise<void>;
  subscribe: () => () => void;

  addDepartment: (d: Pick<Department, "name"> & Partial<Pick<Department, "subtitle" | "color">>) => Promise<string | null>;
  updateDepartment: (id: string, patch: Partial<Omit<Department, "id">>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  addAgent: (a: NewAgent) => Promise<string | null>;
  updateAgent: (id: string, patch: Partial<Pick<Agent, "departmentId" | "reportsTo" | "name" | "role" | "kind" | "tools" | "description">>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  createWebhookToken: (agentId: string) => Promise<string | null>;
  revokeWebhook: (agentId: string) => Promise<void>;
  sendTestRun: (agentId: string, ok?: boolean) => Promise<void>;

  addStep: (agentId: string, text: string) => Promise<void>;
  updateStep: (id: string, patch: Partial<Pick<ProcessStep, "text" | "automated" | "position">>) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;

  addTask: (t: NewTask) => Promise<string | null>;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  saveProject: (id: string | null, patch: Partial<Omit<Project, "id" | "position" | "updatedAt">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteIntake: (id: string) => Promise<void>;
}

let toastSeq = 0;

export const useOrgStore = create<OrgState>((set, get) => {
  /** Apply a change locally, write it, and roll back with a toast if the write fails. */
  async function commit(apply: () => void, rollback: () => void, write: () => PromiseLike<{ error: PostgrestError | null }>, what: string) {
    apply();
    const { error } = await write();
    if (error) {
      rollback();
      get().showToast(`Couldn't ${what}: ${error.message}`);
      return false;
    }
    return true;
  }

  /** Merge a run into state and fire the map pulse once per state change. */
  const applyRun = (run: Run) => {
    const before = get().runs.find((r) => r.id === run.id);
    set((s) => ({ runs: upsert(s.runs, run).sort(byStartDesc).slice(0, MAX_RUNS) }));
    if (run.status === "running" && !before) mapEvents.emit({ type: "run-started", agentId: run.agentId });
    if (run.status !== "running" && before?.status !== run.status) {
      mapEvents.emit({ type: "run-finished", agentId: run.agentId, ok: run.status === "succeeded" });
    }
  };

  const setAgentLocal = (id: string, patch: Partial<Agent>) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const snapshot = () => {
    const { departments, agents, steps, tasks, runs, projects, intakes } = get();
    return { departments, agents, steps, tasks, runs, projects, intakes };
  };

  return {
    ready: false,
    loadError: null,
    departments: [],
    agents: [],
    steps: [],
    tasks: [],
    runs: [],
    projects: [],
    intakes: [],

    view: "map",
    selectedAgentId: null,
    hoveredDeptId: null,
    focusDeptId: null,
    panelOpen: true,
    resetNonce: 0,
    draggingTaskId: null,
    showHud: false,
    toast: null,
    modal: null,

    setView: (view) => set({ view }),
    selectAgent: (selectedAgentId) => set({ selectedAgentId }),
    hoverDept: (hoveredDeptId) => set({ hoveredDeptId }),
    focusDept: (focusDeptId) => set({ focusDeptId }),
    togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
    resetCamera: () => set((s) => ({ focusDeptId: null, resetNonce: s.resetNonce + 1 })),
    setDragging: (draggingTaskId) => set({ draggingTaskId }),
    toggleHud: () => set((s) => ({ showHud: !s.showHud })),
    openModal: (modal) => set({ modal }),
    showToast: (text, tone = "error") => {
      const id = ++toastSeq;
      set({ toast: { id, text, tone } });
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 5000);
    },

    /* ------------------------------ load ------------------------------ */
    load: async () => {
      const db = supabase();
      const [d, a, s, t, r, p, i] = await Promise.all([
        db.from("departments").select("*"),
        db.from("agents").select("*"),
        db.from("process_steps").select("*"),
        db.from("tasks").select("*"),
        db.from("runs").select("*").order("started_at", { ascending: false }).limit(MAX_RUNS),
        db.from("projects").select("*"),
        db.from("intakes").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const error = d.error ?? a.error ?? s.error ?? t.error ?? r.error ?? p.error ?? i.error;
      if (error) {
        set({ ready: true, loadError: error.message });
        return;
      }
      set({
        ready: true,
        loadError: null,
        departments: (d.data ?? []).map(toDepartment).sort(byPosition),
        agents: (a.data ?? []).map(toAgent).sort(byPosition),
        steps: (s.data ?? []).map(toStep).sort(byPosition),
        tasks: (t.data ?? []).map(toTask).sort(byPosition),
        runs: (r.data ?? []).map(toRun),
        projects: (p.data ?? []).map(toProject).sort(byPosition),
        intakes: (i.data ?? []).map(toIntake),
      });
    },

    /** Live updates from other tabs and from webhooks. */
    subscribe: () => {
      const db = supabase();
      const handle =
        <T extends keyof Tables, U extends { id: string }>(
          key: "departments" | "agents" | "steps" | "tasks" | "projects",
          map: (r: Row<T>) => U,
        ) =>
        (p: RealtimePostgresChangesPayload<Row<T>>) => {
          set((s) => {
            const list = s[key] as unknown as U[];
            if (p.eventType === "DELETE") {
              const id = (p.old as { id?: string }).id;
              return { [key]: list.filter((x) => x.id !== id) } as Partial<OrgState>;
            }
            return { [key]: upsert(list, map(p.new as Row<T>)).sort(byPosition as never) } as Partial<OrgState>;
          });
        };

      const onRun = (p: RealtimePostgresChangesPayload<Row<"runs">>) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id?: string }).id;
          set((s) => ({ runs: s.runs.filter((r) => r.id !== id) }));
          return;
        }
        applyRun(toRun(p.new as Row<"runs">));
      };

      const channel = db
        .channel("org-map")
        .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, handle<"departments", Department>("departments", toDepartment))
        .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, handle<"agents", Agent>("agents", toAgent))
        .on("postgres_changes", { event: "*", schema: "public", table: "process_steps" }, handle<"process_steps", ProcessStep>("steps", toStep))
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, handle<"tasks", Task>("tasks", toTask))
        .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, onRun)
        .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, handle<"projects", Project>("projects", toProject))
        .on("postgres_changes", { event: "*", schema: "public", table: "intakes" }, (p: RealtimePostgresChangesPayload<Row<"intakes">>) => {
          if (p.eventType === "DELETE") {
            const id = (p.old as { id?: string }).id;
            set((s) => ({ intakes: s.intakes.filter((x) => x.id !== id) }));
          } else set((s) => ({ intakes: upsert(s.intakes, toIntake(p.new as Row<"intakes">)).sort(byCreatedDesc) }));
        })
        .subscribe();

      return () => {
        db.removeChannel(channel);
      };
    },

    /* --------------------------- departments -------------------------- */
    addDepartment: async ({ name, subtitle = "", color = "#ff6a1f" }) => {
      const id = crypto.randomUUID();
      const position = Math.max(0, ...get().departments.map((d) => d.position)) + 1000;
      const prev = snapshot();
      const ok = await commit(
        () => set((s) => ({ departments: [...s.departments, { id, name, subtitle, color, position }] })),
        () => set(prev),
        () => supabase().from("departments").insert({ id, name, subtitle, color, position }),
        "add the department",
      );
      return ok ? id : null;
    },
    updateDepartment: async (id, patch) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)).sort(byPosition) })),
        () => set(prev),
        () => supabase().from("departments").update(patch).eq("id", id),
        "update the department",
      );
    },
    deleteDepartment: async (id) => {
      const prev = snapshot();
      const gone = new Set(prev.agents.filter((a) => a.departmentId === id).map((a) => a.id));
      await commit(
        () =>
          set((s) => ({
            departments: s.departments.filter((d) => d.id !== id),
            agents: s.agents.filter((a) => !gone.has(a.id)),
            steps: s.steps.filter((st) => !gone.has(st.agentId)),
            runs: s.runs.filter((r) => !gone.has(r.agentId)),
            tasks: s.tasks.map((t) => ({
              ...t,
              departmentId: t.departmentId === id ? null : t.departmentId,
              agentId: t.agentId && gone.has(t.agentId) ? null : t.agentId,
            })),
            focusDeptId: s.focusDeptId === id ? null : s.focusDeptId,
            selectedAgentId: s.selectedAgentId && gone.has(s.selectedAgentId) ? null : s.selectedAgentId,
          })),
        () => set(prev),
        () => supabase().from("departments").delete().eq("id", id),
        "delete the department",
      );
    },

    /* ------------------------------ agents ----------------------------- */
    addAgent: async (a) => {
      const id = crypto.randomUUID();
      const position = Math.max(0, ...get().agents.map((x) => x.position)) + 1000;
      const agent: Agent = {
        id,
        departmentId: a.departmentId,
        reportsTo: a.reportsTo ?? null,
        name: a.name,
        role: a.role ?? "",
        kind: a.kind ?? "ai_agent",
        status: "idle",
        tools: a.tools ?? [],
        description: a.description ?? "",
        hasWebhook: false,
        lastRunAt: null,
        position,
      };
      const prev = snapshot();
      const ok = await commit(
        () => set((s) => ({ agents: [...s.agents, agent] })),
        () => set(prev),
        () =>
          supabase().from("agents").insert({
            id,
            department_id: agent.departmentId,
            reports_to: agent.reportsTo,
            name: agent.name,
            role: agent.role,
            kind: agent.kind,
            tools: agent.tools,
            description: agent.description,
            position,
          }),
        "add the agent",
      );
      return ok ? id : null;
    },
    updateAgent: async (id, patch) => {
      const prev = snapshot();
      const row: Tables["agents"]["Update"] = {};
      if (patch.departmentId !== undefined) row.department_id = patch.departmentId;
      if (patch.reportsTo !== undefined) row.reports_to = patch.reportsTo;
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.kind !== undefined) row.kind = patch.kind;
      if (patch.tools !== undefined) row.tools = patch.tools;
      if (patch.description !== undefined) row.description = patch.description;
      await commit(
        () => set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
        () => set(prev),
        () => supabase().from("agents").update(row).eq("id", id),
        "save the agent",
      );
    },
    deleteAgent: async (id) => {
      const prev = snapshot();
      await commit(
        () =>
          set((s) => ({
            agents: s.agents.filter((a) => a.id !== id).map((a) => (a.reportsTo === id ? { ...a, reportsTo: null } : a)),
            steps: s.steps.filter((st) => st.agentId !== id),
            runs: s.runs.filter((r) => r.agentId !== id),
            tasks: s.tasks.map((t) => (t.agentId === id ? { ...t, agentId: null } : t)),
            selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
          })),
        () => set(prev),
        () => supabase().from("agents").delete().eq("id", id),
        "delete the agent",
      );
    },
    createWebhookToken: async (agentId) => {
      const token = randomToken();
      const hash = await sha256Hex(token);
      const prev = snapshot();
      const ok = await commit(
        () => set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? { ...a, hasWebhook: true } : a)) })),
        () => set(prev),
        () => supabase().from("agents").update({ webhook_token_hash: `\\x${hash}` }).eq("id", agentId),
        "create the webhook token",
      );
      return ok ? token : null;
    },
    revokeWebhook: async (agentId) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? { ...a, hasWebhook: false } : a)) })),
        () => set(prev),
        () => supabase().from("agents").update({ webhook_token_hash: null }).eq("id", agentId),
        "revoke the webhook",
      );
    },
    /** Simulates one run end to end so the pipeline can be checked without a real agent. */
    sendTestRun: async (agentId, ok = true) => {
      const db = supabase();
      const started = new Date();
      const { data, error } = await db
        .from("runs")
        .insert({ agent_id: agentId, status: "running", started_at: started.toISOString(), summary: "Test run from the app" })
        .select()
        .single();
      if (error || !data) {
        get().showToast(`Couldn't start the test run: ${error?.message ?? "unknown error"}`);
        return;
      }
      applyRun(toRun(data));
      setAgentLocal(agentId, { status: "working", lastRunAt: started.toISOString() });
      await db.from("agents").update({ status: "working", last_run_at: started.toISOString() }).eq("id", agentId);
      setTimeout(async () => {
        const finished = new Date();
        const done = {
          status: ok ? "succeeded" : "failed",
          finished_at: finished.toISOString(),
          duration_ms: finished.getTime() - started.getTime(),
          error: ok ? null : "Test failure triggered from the app",
        };
        applyRun(toRun({ ...data, ...done }));
        setAgentLocal(agentId, { status: ok ? "idle" : "blocked" });
        const res = await db.from("runs").update(done).eq("id", data.id);
        await db.from("agents").update({ status: ok ? "idle" : "blocked" }).eq("id", agentId);
        if (res.error) get().showToast(`Couldn't finish the test run: ${res.error.message}`);
      }, 1800);
    },

    /* ------------------------------ steps ------------------------------ */
    addStep: async (agentId, text) => {
      const id = crypto.randomUUID();
      const own = get().steps.filter((s) => s.agentId === agentId);
      const position = Math.max(0, ...own.map((s) => s.position)) + 1000;
      const prev = snapshot();
      await commit(
        () => set((s) => ({ steps: [...s.steps, { id, agentId, position, text, automated: false }] })),
        () => set(prev),
        () => supabase().from("process_steps").insert({ id, agent_id: agentId, position, text }),
        "add the step",
      );
    },
    updateStep: async (id, patch) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ steps: s.steps.map((st) => (st.id === id ? { ...st, ...patch } : st)).sort(byPosition) })),
        () => set(prev),
        () => supabase().from("process_steps").update(patch).eq("id", id),
        "save the step",
      );
    },
    deleteStep: async (id) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ steps: s.steps.filter((st) => st.id !== id) })),
        () => set(prev),
        () => supabase().from("process_steps").delete().eq("id", id),
        "delete the step",
      );
    },

    /* ------------------------------ tasks ------------------------------ */
    addTask: async (t) => {
      const id = crypto.randomUUID();
      const column = t.column ?? "backlog";
      const inColumn = get().tasks.filter((x) => x.column === column);
      const position = t.position ?? Math.max(0, ...inColumn.map((x) => x.position)) + 1000;
      const task: Task = {
        id,
        title: t.title,
        notes: t.notes ?? "",
        column,
        position,
        agentId: t.agentId ?? null,
        departmentId: t.departmentId ?? null,
        dueDate: t.dueDate ?? null,
      };
      const prev = snapshot();
      const ok = await commit(
        () => set((s) => ({ tasks: [...s.tasks, task].sort(byPosition) })),
        () => set(prev),
        () =>
          supabase().from("tasks").insert({
            id,
            title: task.title,
            notes: task.notes,
            stage: task.column,
            position,
            agent_id: task.agentId,
            department_id: task.departmentId,
            due_date: task.dueDate,
          }),
        "add the task",
      );
      return ok ? id : null;
    },
    updateTask: async (id, patch) => {
      const prev = snapshot();
      const row: Tables["tasks"]["Update"] = { updated_at: new Date().toISOString() };
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.notes !== undefined) row.notes = patch.notes;
      if (patch.column !== undefined) row.stage = patch.column;
      if (patch.position !== undefined) row.position = patch.position;
      if (patch.agentId !== undefined) row.agent_id = patch.agentId;
      if (patch.departmentId !== undefined) row.department_id = patch.departmentId;
      if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
      await commit(
        () => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)).sort(byPosition) })),
        () => set(prev),
        () => supabase().from("tasks").update(row).eq("id", id),
        "save the task",
      );
    },
    deleteTask: async (id) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
        () => set(prev),
        () => supabase().from("tasks").delete().eq("id", id),
        "delete the task",
      );
    },

    /* ----------------------------- projects ----------------------------- */
    saveProject: async (id, patch) => {
      const row: Tables["projects"]["Update"] = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.priority !== undefined) row.priority = patch.priority;
      if (patch.summary !== undefined) row.summary = patch.summary;
      if (patch.currentWork !== undefined) row.current_work = patch.currentWork;
      if (patch.nextSteps !== undefined) row.next_steps = patch.nextSteps;
      if (patch.location !== undefined) row.location = patch.location;
      if (patch.links !== undefined) row.links = patch.links;
      if (patch.target !== undefined) row.target = patch.target;
      if (patch.notes !== undefined) row.notes = patch.notes;
      const prev = snapshot();
      if (id) {
        await commit(
          () => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: row.updated_at! } : p)) })),
          () => set(prev),
          () => supabase().from("projects").update(row).eq("id", id),
          "save the project",
        );
        return;
      }
      const newId = crypto.randomUUID();
      const position = Math.max(0, ...get().projects.map((p) => p.position)) + 1000;
      const project: Project = {
        id: newId,
        name: patch.name ?? "Untitled project",
        status: patch.status ?? "upcoming",
        priority: patch.priority ?? "medium",
        summary: patch.summary ?? "",
        currentWork: patch.currentWork ?? "",
        nextSteps: patch.nextSteps ?? [],
        location: patch.location ?? "",
        links: patch.links ?? [],
        target: patch.target ?? "",
        notes: patch.notes ?? "",
        position,
        updatedAt: row.updated_at!,
      };
      await commit(
        () => set((s) => ({ projects: [...s.projects, project] })),
        () => set(prev),
        () => supabase().from("projects").insert({ ...row, id: newId, name: project.name, position }),
        "add the project",
      );
    },
    deleteProject: async (id) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
        () => set(prev),
        () => supabase().from("projects").delete().eq("id", id),
        "delete the project",
      );
    },
    deleteIntake: async (id) => {
      const prev = snapshot();
      await commit(
        () => set((s) => ({ intakes: s.intakes.filter((i) => i.id !== id) })),
        () => set(prev),
        () => supabase().from("intakes").delete().eq("id", id),
        "delete the inbox item",
      );
    },
  };
});
