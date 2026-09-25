"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { Run, RunStatus } from "@/data/types";
import { useOrgStore } from "@/store/useOrgStore";
import { RunBadge } from "@/components/ui/badges";
import { Button, inputCls } from "@/components/ui/form";
import { duration, timeAgo } from "./format";

const STATUSES: (RunStatus | "all")[] = ["all", "running", "succeeded", "failed"];
const WEEK = 7 * 24 * 3600 * 1000;

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export default function RunsView() {
  useTick(10_000);
  const runs = useOrgStore((s) => s.runs);
  const agents = useOrgStore((s) => s.agents);
  const departments = useOrgStore((s) => s.departments);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const [agentFilter, setAgentFilter] = useState("");
  const [status, setStatus] = useState<RunStatus | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const colorOf = (agentId: string) => departments.find((d) => d.id === agentById.get(agentId)?.departmentId)?.color ?? "#888";

  const visible = runs.filter((r) => (!agentFilter || r.agentId === agentFilter) && (status === "all" || r.status === status));

  const stats = useMemo(() => {
    const since = Date.now() - WEEK;
    return agents
      .map((a) => {
        const own = runs.filter((r) => r.agentId === a.id);
        const week = own.filter((r) => new Date(r.startedAt).getTime() >= since && r.status !== "running");
        const ok = week.filter((r) => r.status === "succeeded").length;
        const durations = week.map((r) => r.durationMs).filter((d): d is number => d !== null);
        return {
          agent: a,
          last: own[0] as Run | undefined,
          count: week.length,
          rate: week.length ? ok / week.length : null,
          avg: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null,
        };
      })
      .filter((s) => s.last || s.agent.hasWebhook)
      .sort((a, b) => (b.last?.startedAt ?? "").localeCompare(a.last?.startedAt ?? ""));
  }, [agents, runs]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="label text-[10px] text-white/40">Monitor</div>
          <h1 className="mt-1 flex items-center gap-3 font-mono text-[22px] font-semibold uppercase tracking-[0.18em] text-white">
            Runs
            <span className="flex items-center gap-1.5 rounded-full border border-[#ff5a1f]/30 bg-[#ff5a1f]/10 px-2 py-0.5 text-[9.5px] tracking-[0.16em] text-[#ff9a5c]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5a1f]" /> Live
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputCls.replace("w-full", "w-48")} py-1.5`} value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label="Filter by agent">
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Filter by status" className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                  status === s ? "border-[#ff5a1f]/60 bg-[#ff5a1f]/15 text-white" : "border-white/10 text-white/55 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-6 pb-6">
        {stats.length > 0 && (
          <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {stats.map(({ agent, last, count, rate, avg }) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => selectAgent(agent.id)}
                className={`glass rounded-xl px-4 py-3 text-left transition-colors hover:border-[#ff5a1f]/50 ${
                  agent.status === "blocked" ? "!border-red-500/50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: colorOf(agent.id) }} />
                  <span className="truncate text-[13px] font-medium text-white">{agent.name}</span>
                  {last && (
                    <span className="ml-auto">
                      <RunBadge status={last.status} />
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] text-white/45">
                  <span>
                    <span className="block text-[13px] text-white/85">{rate === null ? "—" : `${Math.round(rate * 100)}%`}</span>ok · 7d
                  </span>
                  <span>
                    <span className="block text-[13px] text-white/85">{count}</span>runs · 7d
                  </span>
                  <span>
                    <span className="block text-[13px] text-white/85">{duration(avg)}</span>avg
                  </span>
                </div>
                <div className="mt-2 text-[10.5px] text-white/35">{last ? `last run ${timeAgo(last.startedAt)}` : "connected · no runs yet"}</div>
              </button>
            ))}
          </div>
        )}

        {runs.length === 0 ? (
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl px-6 py-6 text-center">
            <h2 className="text-[16px] font-semibold text-white">No runs yet</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">
              Open an agent and connect its webhook. Your scripts, Power Automate flows or GitHub Actions then report here. Try it first with a test
              run.
            </p>
            {agents[0] && (
              <Button tone="primary" className="mt-4" onClick={() => selectAgent(agents[0].id)}>
                Open {agents[0].name}
              </Button>
            )}
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-[#0f0b0b]/95 backdrop-blur">
                <tr className="border-b border-white/[0.07] font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Agent</th>
                  <th className="px-3 py-3 font-medium">Summary</th>
                  <th className="px-3 py-3 font-medium">Started</th>
                  <th className="px-3 py-3 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const a = agentById.get(r.agentId);
                  const expanded = open === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className={`cursor-pointer border-b border-white/[0.04] hover:bg-[#ff5a1f]/[0.05] ${expanded ? "bg-white/[0.02]" : ""}`}
                        onClick={() => setOpen(expanded ? null : r.id)}
                      >
                        <td className="px-3 py-2.5 text-white/40">
                          <button type="button" aria-expanded={expanded} aria-label={expanded ? "Hide details" : "Show details"} onClick={(e) => (e.stopPropagation(), setOpen(expanded ? null : r.id))}>
                            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <RunBadge status={r.status} />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-2 text-white/80">
                            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(r.agentId) }} />
                            {a?.name ?? "Deleted agent"}
                          </span>
                        </td>
                        <td className={`max-w-[360px] truncate px-3 py-2.5 ${r.error ? "text-red-300" : "text-white/65"}`}>{r.error ?? r.summary ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-white/50" title={new Date(r.startedAt).toLocaleString()}>
                          {timeAgo(r.startedAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-white/60">{duration(r.durationMs)}</td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-white/[0.04] bg-black/20">
                          <td />
                          <td colSpan={5} className="px-3 py-3">
                            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Run id</dt>
                              <dd className="font-mono text-white/70">{r.externalId}</dd>
                              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Started</dt>
                              <dd className="text-white/70">{new Date(r.startedAt).toLocaleString()}</dd>
                              {r.finishedAt && (
                                <>
                                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Finished</dt>
                                  <dd className="text-white/70">{new Date(r.finishedAt).toLocaleString()}</dd>
                                </>
                              )}
                              {r.summary && (
                                <>
                                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Summary</dt>
                                  <dd className="whitespace-pre-wrap text-white/80">{r.summary}</dd>
                                </>
                              )}
                              {r.error && (
                                <>
                                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Error</dt>
                                  <dd className="whitespace-pre-wrap text-red-300">{r.error}</dd>
                                </>
                              )}
                            </dl>
                            {r.output !== null && (
                              <pre className="scroll-thin mt-3 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-white/75">
                                {JSON.stringify(r.output, null, 2)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!visible.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                      No runs match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
