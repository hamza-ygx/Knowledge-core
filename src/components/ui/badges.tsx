"use client";

import type { AgentStatus, AutomationLevel } from "@/data/types";
import { useT } from "@/i18n";

const AUTOMATION_STYLE: Record<AutomationLevel, string> = {
  fully_automated: "border-[#ff5a1f]/50 bg-[#ff5a1f]/15 text-[#ffab78]",
  partly_automated: "border-[#ffb020]/35 bg-[#ffb020]/10 text-[#ffd48a]",
  documented: "border-white/15 bg-white/[0.04] text-white/55",
};

export function AutomationBadge({ level }: { level: AutomationLevel }) {
  const { t } = useT();
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] ${AUTOMATION_STYLE[level]}`}
    >
      {t(`auto.${level}`)}
    </span>
  );
}

export function StatusDot({ status }: { status: AgentStatus }) {
  const cls =
    status === "working"
      ? "bg-[#ffe6cf] shadow-[0_0_8px_#ff8a3d]"
      : status === "blocked"
        ? "bg-[#ff3a2a] shadow-[0_0_8px_#ff2a1a] animate-pulse"
        : "bg-white/30";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

export function StatusLabel({ status }: { status: AgentStatus }) {
  const { t } = useT();
  const color = status === "working" ? "text-[#ffcf70]" : status === "blocked" ? "text-red-300" : "text-white/45";
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${color}`}>
      <StatusDot status={status} />
      {t(`status.${status}`)}
    </span>
  );
}
