import type { L } from "@/i18n/core";

export type AutomationLevel = "documented" | "partly_automated" | "fully_automated";
export type AgentStatus = "idle" | "working" | "blocked";
export type TaskColumn = "backlog" | "todo" | "in_progress" | "review" | "done";

export type ToolName =
  | "HubSpot"
  | "Outlook"
  | "Outlook Calendar"
  | "Teams"
  | "SharePoint"
  | "Excel"
  | "Planner"
  | "Power Automate"
  | "Notion"
  | "Stripe"
  | "Fortnox"
  | "Scrive"
  | "LinkedIn"
  | "Canva"
  | "Webflow"
  | "Google Analytics"
  | "1Password"
  | "Perplexity";

export interface ProcessStep {
  step: L;
  automated: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: L;
  departmentId: string;
  reportsTo: string | null;
  process: ProcessStep[];
  tools: ToolName[];
  automationLevel: AutomationLevel;
  status: AgentStatus;
}

export interface Department {
  id: string;
  name: L;
  subtitle: L;
  color: string;
  agents: Agent[];
}

export interface Task {
  id: string;
  title: L;
  agentId: string;
  departmentId: string;
  column: TaskColumn;
}

export const TASK_COLUMNS: TaskColumn[] = ["backlog", "todo", "in_progress", "review", "done"];

export const AUTOMATION_WEIGHT: Record<AutomationLevel, number> = {
  documented: 0,
  partly_automated: 0.5,
  fully_automated: 1,
};
