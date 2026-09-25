import { AUTOMATION_LABELS, STATUS_LABELS, type AgentStatus, type AutomationLevel, type RunStatus } from "@/data/types";

const AUTOMATION_STYLE: Record<AutomationLevel, string> = {
  fully_automated: "border-[#ff5a1f]/50 bg-[#ff5a1f]/15 text-[#ffab78]",
  partly_automated: "border-[#ffb020]/35 bg-[#ffb020]/10 text-[#ffd48a]",
  documented: "border-white/15 bg-white/[0.04] text-white/55",
};

export function AutomationBadge({ level }: { level: AutomationLevel }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] ${AUTOMATION_STYLE[level]}`}
    >
      {AUTOMATION_LABELS[level]}
    </span>
  );
}

export function StatusDot({ status }: { status: AgentStatus }) {
  const cls =
    status === "working"
      ? "bg-[#ffe6cf] shadow-[0_0_8px_#ff8a3d] animate-pulse"
      : status === "blocked"
        ? "bg-[#ff3a2a] shadow-[0_0_8px_#ff2a1a]"
        : "bg-white/30";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

export function StatusLabel({ status }: { status: AgentStatus }) {
  const color = status === "working" ? "text-[#ffcf70]" : status === "blocked" ? "text-red-300" : "text-white/45";
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${color}`}>
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function RunBadge({ status }: { status: RunStatus }) {
  const style =
    status === "succeeded"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : status === "failed"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-[#ffb020]/40 bg-[#ffb020]/10 text-[#ffcf70]";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] ${style}`}>
      {status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}
