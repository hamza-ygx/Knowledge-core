import type { Agent, AutomationLevel, ProcessStep } from "@/data/types";

/** Share of an agent's process steps that are automated (0 when it has no steps yet). */
export function agentAutomation(steps: ProcessStep[]): number {
  if (steps.length === 0) return 0;
  return steps.filter((s) => s.automated).length / steps.length;
}

export function automationLevel(fraction: number): AutomationLevel {
  if (fraction >= 1) return "fully_automated";
  if (fraction > 0) return "partly_automated";
  return "documented";
}

/** Average automation across agents: the "Runs without you" number. */
export function automationScore(agents: Agent[], stepsByAgent: Map<string, ProcessStep[]>): number {
  if (agents.length === 0) return 0;
  return agents.reduce((sum, a) => sum + agentAutomation(stepsByAgent.get(a.id) ?? []), 0) / agents.length;
}

export function groupSteps(steps: ProcessStep[]): Map<string, ProcessStep[]> {
  const map = new Map<string, ProcessStep[]>();
  for (const s of steps) {
    const list = map.get(s.agentId) ?? [];
    list.push(s);
    map.set(s.agentId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.position - b.position);
  return map;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Position between two neighbours, for drag-and-drop ordering without renumbering. */
export function between(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return after! - 1000;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}
