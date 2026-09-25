import { AUTOMATION_WEIGHT, type Agent } from "@/data/types";

export function automationScore(agents: Agent[]): number {
  if (agents.length === 0) return 0;
  const total = agents.reduce((sum, a) => sum + AUTOMATION_WEIGHT[a.automationLevel], 0);
  return total / agents.length;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
