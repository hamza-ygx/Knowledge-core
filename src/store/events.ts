// Fire-and-forget bus for visual effects. The map canvas listens here so
// particle bursts never trigger React renders.

export type SimEvent =
  | { type: "kb-read"; agentId: string }
  | { type: "task-flow"; agentId: string; direction: "in" | "out" };

type Listener = (e: SimEvent) => void;
const listeners = new Set<Listener>();

export const simEvents = {
  emit(e: SimEvent) {
    listeners.forEach((l) => l(e));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
