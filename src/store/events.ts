// Fire-and-forget bus for visual effects. The map canvas listens here so
// run pulses never trigger React renders.

export type MapEvent = { type: "run-started"; agentId: string } | { type: "run-finished"; agentId: string; ok: boolean };

type Listener = (e: MapEvent) => void;
const listeners = new Set<Listener>();

export const mapEvents = {
  emit(e: MapEvent) {
    listeners.forEach((l) => l(e));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
