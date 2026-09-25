export type AutomationLevel = "documented" | "partly_automated" | "fully_automated";
export type AgentStatus = "idle" | "working" | "blocked";
export type TaskColumn = "backlog" | "todo" | "in_progress" | "review" | "done";

export type ToolName =
  | "HubSpot"
  | "Gmail"
  | "Notion"
  | "Stripe"
  | "Slack"
  | "Google Drive"
  | "Google Sheets"
  | "Google Calendar"
  | "LinkedIn"
  | "Canva"
  | "Webflow"
  | "Google Analytics"
  | "Linear"
  | "Zapier"
  | "Xero"
  | "DocuSign"
  | "1Password"
  | "Perplexity";

export interface ProcessStep {
  step: string;
  automated: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  reportsTo: string | null;
  process: ProcessStep[];
  tools: ToolName[];
  automationLevel: AutomationLevel;
  status: AgentStatus;
}

export interface Department {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  agents: Agent[];
}

export interface Task {
  id: string;
  title: string;
  agentId: string;
  departmentId: string;
  column: TaskColumn;
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

export const AUTOMATION_WEIGHT: Record<AutomationLevel, number> = {
  documented: 0,
  partly_automated: 0.5,
  fully_automated: 1,
};
