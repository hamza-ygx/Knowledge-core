import type { Json } from "@/lib/supabase/database.types";

export type AgentKind = "ai_agent" | "automation" | "human";
export type AgentStatus = "idle" | "working" | "blocked";
export type TaskColumn = "backlog" | "todo" | "in_progress" | "review" | "done";
export type RunStatus = "running" | "succeeded" | "failed";
/** Derived from an agent's process steps, never stored. */
export type AutomationLevel = "documented" | "partly_automated" | "fully_automated";

export interface Department {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  position: number;
}

export interface Agent {
  id: string;
  departmentId: string;
  reportsTo: string | null;
  name: string;
  role: string;
  kind: AgentKind;
  status: AgentStatus;
  tools: string[];
  description: string;
  hasWebhook: boolean;
  lastRunAt: string | null;
  position: number;
}

export interface ProcessStep {
  id: string;
  agentId: string;
  position: number;
  text: string;
  automated: boolean;
}

export interface Task {
  id: string;
  departmentId: string | null;
  agentId: string | null;
  title: string;
  notes: string;
  column: TaskColumn;
  position: number;
  dueDate: string | null;
}

export interface Run {
  id: string;
  agentId: string;
  externalId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  summary: string | null;
  output: Json | null;
  error: string | null;
}

export const TASK_COLUMNS: TaskColumn[] = ["backlog", "todo", "in_progress", "review", "done"];

export const COLUMN_LABELS: Record<TaskColumn, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export const AUTOMATION_LABELS: Record<AutomationLevel, string> = {
  documented: "Documented",
  partly_automated: "Partly automated",
  fully_automated: "Fully automated",
};

export const KIND_LABELS: Record<AgentKind, string> = {
  ai_agent: "AI agent",
  automation: "Automation",
  human: "Person",
};

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "idle",
  working: "running",
  blocked: "failed",
};

/** Warm palette offered when creating a department. */
export const DEPARTMENT_COLORS = ["#ff6a1f", "#ff3d5e", "#ffb020", "#ff2d1f", "#ffd25e", "#ff8c5a", "#e8743b", "#ff9fb0"];

export type ProjectStatus = "live" | "active" | "upcoming" | "idea" | "paused" | "done";
export type Priority = "high" | "medium" | "low";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  summary: string;
  currentWork: string;
  nextSteps: string[];
  location: string;
  links: string[];
  target: string;
  notes: string;
  position: number;
  updatedAt: string;
}

export interface Intake {
  id: string;
  text: string;
  files: { name: string; size: number; kind: string; note: string | null }[];
  status: "pending" | "processing" | "done" | "failed";
  summary: string | null;
  error: string | null;
  createdAt: string;
}

export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["active", "live", "upcoming", "paused", "idea", "done"];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  live: "Live",
  active: "Being worked on",
  upcoming: "Up next",
  idea: "Ideas",
  paused: "Paused",
  done: "Done",
};

export const PRIORITY_LABELS: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
