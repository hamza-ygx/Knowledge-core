"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AUTOMATION_LABELS, COLUMN_LABELS, KIND_LABELS, type Agent, type AgentKind } from "@/data/types";
import { agentAutomation, automationLevel, between, pct } from "@/lib/metrics";
import { useOrgStore } from "@/store/useOrgStore";
import { RunBadge, StatusLabel } from "@/components/ui/badges";
import { Button, Field, inputCls } from "@/components/ui/form";
import { timeAgo, duration } from "@/components/runs/format";

export default function AgentDrawer() {
  const selectedId = useOrgStore((s) => s.selectedAgentId);
  const select = useOrgStore((s) => s.selectAgent);
  const agent = useOrgStore((s) => s.agents.find((a) => a.id === s.selectedAgentId));
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || useOrgStore.getState().modal) return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  useEffect(() => {
    if (selectedId || !returnFocus.current) return;
    returnFocus.current.focus?.();
    returnFocus.current = null;
  }, [selectedId]);

  return (
    <AnimatePresence>
      {agent && (
        <motion.aside
          key="drawer"
          role="dialog"
          aria-label={`${agent.name} details`}
          className="glass absolute bottom-4 right-4 top-[68px] z-40 flex w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl"
          initial={{ x: "110%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0.4 }}
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
        >
          <DrawerBody key={agent.id} agent={agent} closeRef={closeRef} onClose={() => select(null)} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({ agent, closeRef, onClose }: { agent: Agent; closeRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const allSteps = useOrgStore((s) => s.steps);
  const tasks = useOrgStore((s) => s.tasks);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const [editing, setEditing] = useState(false);

  const dept = departments.find((d) => d.id === agent.departmentId);
  const manager = agents.find((a) => a.id === agent.reportsTo);
  const reports = agents.filter((a) => a.reportsTo === agent.id);
  const steps = useMemo(() => allSteps.filter((s) => s.agentId === agent.id).sort((a, b) => a.position - b.position), [allSteps, agent.id]);
  const openTasks = tasks.filter((t) => t.agentId === agent.id && t.column !== "done");
  const auto = agentAutomation(steps);

  return (
    <>
      <header className="relative border-b border-white/5 px-6 pb-4 pt-5">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${dept?.color ?? "#ff5a1f"}, transparent)` }} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label text-[10px]" style={{ color: dept?.color }}>
              {dept?.name} · {KIND_LABELS[agent.kind]}
            </div>
            <h2 className="mt-1.5 truncate text-[24px] font-semibold leading-tight text-white">{agent.name}</h2>
            <div className="text-[13px] text-white/60">{agent.role || "No role yet"}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-pressed={editing}
              aria-label="Edit agent"
              className={`grid h-8 w-8 place-items-center rounded-full hover:bg-white/5 ${editing ? "text-[#ffb020]" : "text-white/50 hover:text-white"}`}
            >
              <Pencil size={14} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close agent details"
              className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <StatusLabel status={agent.status} />
          {agent.lastRunAt && <span className="font-mono text-[10px] text-white/35">last run {timeAgo(agent.lastRunAt)}</span>}
        </div>
      </header>

      <div className="scroll-thin flex-1 space-y-7 overflow-y-auto px-6 py-5">
        {editing ? (
          <EditAgent agent={agent} onDone={() => setEditing(false)} />
        ) : (
          <section className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-2.5 text-[12.5px]">
            <Meta>Reports to</Meta>
            <span>{manager ? <AgentLink agent={manager} onSelect={selectAgent} /> : <span className="text-white/40">— (leads the department)</span>}</span>
            <Meta>Direct reports</Meta>
            <span className="flex flex-wrap items-start gap-1.5">
              {reports.length ? reports.map((r) => <AgentLink key={r.id} agent={r} onSelect={selectAgent} />) : <span className="text-white/40">None</span>}
            </span>
            <Meta>Tools</Meta>
            <span className="flex flex-wrap gap-1.5">
              {agent.tools.length ? (
                agent.tools.map((t) => (
                  <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11.5px] text-white/75">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-white/40">None listed</span>
              )}
            </span>
            {agent.description && (
              <>
                <Meta>Notes</Meta>
                <span className="whitespace-pre-wrap text-white/70">{agent.description}</span>
              </>
            )}
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between">
            <SectionTitle>Process</SectionTitle>
            <span className="font-mono text-[10px] text-[#ffb020]">
              {AUTOMATION_LABELS[automationLevel(auto)]} · {pct(auto)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ff5a1f] to-[#ffb020]"
              initial={false}
              animate={{ width: `${Math.round(auto * 100)}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />
          </div>
          <StepList agentId={agent.id} steps={steps} />
        </section>

        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>Open tasks</SectionTitle>
            <button
              type="button"
              onClick={() => useOrgStore.getState().openModal({ type: "task", agentId: agent.id, departmentId: agent.departmentId, column: "todo" })}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff9a5c] hover:text-white"
            >
              <Plus size={12} /> Task
            </button>
          </div>
          {openTasks.length ? (
            <ul className="mt-3 space-y-1.5">
              {openTasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => useOrgStore.getState().openModal({ type: "task", id: t.id })}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left text-[12px] hover:border-white/15"
                  >
                    <span className="truncate text-white/80">{t.title}</span>
                    <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#ff9a5c]">{COLUMN_LABELS[t.column]}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-white/40">No open tasks.</p>
          )}
        </section>

        <WebhookSection agent={agent} />
      </div>
    </>
  );
}

/* ------------------------------ steps ------------------------------ */

function StepList({ agentId, steps }: { agentId: string; steps: ReturnType<typeof useOrgStore.getState>["steps"] }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const s = useOrgStore.getState;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await s().addStep(agentId, text.slice(0, 300));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    // Place the step between its new neighbours.
    const before = dir === -1 ? steps[j - 1]?.position : steps[j].position;
    const after = dir === -1 ? steps[j].position : steps[j + 1]?.position;
    s().updateStep(steps[i].id, { position: between(before, after) });
  };

  return (
    <div className="mt-3">
      {steps.length === 0 && <p className="mb-2 text-[12px] text-white/40">No steps yet. List what this agent does, in order.</p>}
      <ol>
        {steps.map((st, i) => (
          <li key={st.id} className="group relative flex gap-3 pb-2.5">
            {i < steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-14px)] w-px bg-white/10" />}
            <span
              className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                st.automated ? "border-[#ff5a1f]/70 bg-[#ff5a1f]/15 text-[#ffb27a]" : "border-white/15 bg-white/[0.03] text-white/55"
              }`}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-start gap-2 pt-0.5">
              {editingId === st.id ? (
                <form
                  className="flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = editText.trim();
                    if (text) s().updateStep(st.id, { text: text.slice(0, 300) });
                    setEditingId(null);
                  }}
                >
                  <input
                    autoFocus
                    className={`${inputCls} py-1 text-[12.5px]`}
                    value={editText}
                    maxLength={300}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                    onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(st.id);
                    setEditText(st.text);
                  }}
                  className="flex-1 text-left text-[12.5px] leading-snug text-white/85 hover:text-white"
                  title="Click to edit"
                >
                  {st.text}
                </button>
              )}
              <button
                type="button"
                onClick={() => s().updateStep(st.id, { automated: !st.automated })}
                aria-pressed={st.automated}
                title="Toggle automated / manual"
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                  st.automated ? "bg-[#ff5a1f]/20 text-[#ff9a5c] hover:bg-[#ff5a1f]/30" : "bg-white/[0.06] text-white/45 hover:bg-white/[0.12] hover:text-white/70"
                }`}
              >
                {st.automated ? "Automated" : "Manual"}
              </button>
              <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp size={12} />
                </IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                  <ArrowDown size={12} />
                </IconBtn>
                <IconBtn label="Delete step" onClick={() => s().deleteStep(st.id)}>
                  <Trash2 size={12} />
                </IconBtn>
              </span>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={add} className="mt-1 flex gap-2">
        <input className={`${inputCls} py-1.5 text-[12.5px]`} value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} placeholder="Add a step and press Enter" />
        <Button type="submit" disabled={!draft.trim()} aria-label="Add step">
          <Plus size={13} />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------ editing ------------------------------ */

function EditAgent({ agent, onDone }: { agent: Agent; onDone: () => void }) {
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [kind, setKind] = useState<AgentKind>(agent.kind);
  const [departmentId, setDepartmentId] = useState(agent.departmentId);
  const [reportsTo, setReportsTo] = useState(agent.reportsTo ?? "");
  const [tools, setTools] = useState(agent.tools.join(", "));
  const [description, setDescription] = useState(agent.description);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Someone can't report to themselves or to anyone below them.
  const descendants = useMemo(() => {
    const out = new Set<string>([agent.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const a of agents) if (a.reportsTo && out.has(a.reportsTo) && !out.has(a.id)) (out.add(a.id), (grew = true));
    }
    return out;
  }, [agents, agent.id]);
  const managers = agents.filter((a) => a.departmentId === departmentId && !descendants.has(a.id));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await useOrgStore.getState().updateAgent(agent.id, {
      name: name.trim(),
      role: role.trim(),
      kind,
      departmentId,
      reportsTo: reportsTo && managers.some((m) => m.id === reportsTo) ? reportsTo : null,
      tools: tools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
      description,
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-3.5">
      <Field label="Name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
      </Field>
      <Field label="Role">
        <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as AgentKind)}>
            {(Object.keys(KIND_LABELS) as AgentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select
            className={inputCls}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setReportsTo("");
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Reports to">
        <select className={inputCls} value={reportsTo} onChange={(e) => setReportsTo(e.target.value)}>
          <option value="">— Nobody (leads the department)</option>
          {managers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tools" hint="Comma separated, e.g. Outlook, HubSpot, Excel">
        <input className={inputCls} value={tools} onChange={(e) => setTools(e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea className={`${inputCls} min-h-[70px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      </Field>
      <div className="flex items-center justify-between gap-2 pt-1">
        {confirmDelete ? (
          <Button tone="danger" onClick={() => useOrgStore.getState().deleteAgent(agent.id)}>
            Delete for good
          </Button>
        ) : (
          <Button onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> Delete
          </Button>
        )}
        <div className="flex gap-2">
          <Button onClick={onDone}>Cancel</Button>
          <Button tone="primary" type="submit" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------ webhook ------------------------------ */

function WebhookSection({ agent }: { agent: Agent }) {
  const allRuns = useOrgStore((s) => s.runs);
  const runs = useMemo(() => allRuns.filter((r) => r.agentId === agent.id).slice(0, 6), [allRuns, agent.id]);
  const [token, setToken] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/hooks/${agent.id}` : "";
  const s = useOrgStore.getState;

  const generate = async () => {
    const t = await s().createWebhookToken(agent.id);
    if (t) setToken(t);
  };

  const shown = token ?? "YOUR_TOKEN";
  const curl = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${shown}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"started","run_id":"run-123"}'

curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${shown}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"succeeded","run_id":"run-123","summary":"Sent 4 invoices"}'`;

  return (
    <section>
      <SectionTitle>Runs &amp; webhook</SectionTitle>
      {!agent.hasWebhook ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/15 px-4 py-4">
          <p className="text-[12.5px] leading-relaxed text-white/60">
            Give this agent a webhook so it can report when it starts, finishes or fails. Works with scripts, Power Automate, Zapier and GitHub
            Actions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="primary" onClick={generate}>
              Connect webhook
            </Button>
            <Button onClick={() => s().sendTestRun(agent.id)}>Send test run</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-emerald-300">
              <Check size={10} /> Connected
            </span>
            <Button onClick={() => s().sendTestRun(agent.id)}>Test run</Button>
            <Button onClick={() => s().sendTestRun(agent.id, false)}>Test failure</Button>
            <Button onClick={generate} title="Replace the token; the old one stops working">
              New token
            </Button>
            {confirmRevoke ? (
              <Button
                tone="danger"
                onClick={async () => {
                  await s().revokeWebhook(agent.id);
                  setToken(null);
                  setConfirmRevoke(false);
                }}
              >
                Confirm revoke
              </Button>
            ) : (
              <Button onClick={() => setConfirmRevoke(true)}>Revoke</Button>
            )}
          </div>
          {token && (
            <div className="rounded-xl border border-[#ffb020]/40 bg-[#ffb020]/[0.07] px-3 py-3">
              <div className="text-[12px] font-medium text-[#ffd48a]">Copy this token now. It won&apos;t be shown again.</div>
              <CopyRow value={token} />
            </div>
          )}
          <div>
            <div className="label text-[9.5px] text-white/40">Endpoint</div>
            <CopyRow value={endpoint} />
          </div>
          <details className="group rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 hover:text-white">How to report a run</summary>
            <div className="space-y-2 px-3 pb-3 text-[12px] text-white/60">
              <p>
                POST JSON with <code className="text-[#ffb27a]">event</code>: <code>started</code>, <code>succeeded</code> or <code>failed</code>. Use the same{" "}
                <code className="text-[#ffb27a]">run_id</code> for start and finish to get a duration. Optional: <code>summary</code>, <code>error</code>,{" "}
                <code>output</code> (any JSON, max 64 KB).
              </p>
              <pre className="scroll-thin overflow-x-auto rounded-lg bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed text-white/75">{curl}</pre>
              <CopyRow value={curl} label="Copy example" />
            </div>
          </details>
        </div>
      )}

      <ul className="mt-4 space-y-1.5">
        {runs.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px]">
            <RunBadge status={r.status} />
            <span className="min-w-0 flex-1 truncate text-white/70">{r.error ?? r.summary ?? r.externalId}</span>
            <span className="shrink-0 font-mono text-[10px] text-white/35">
              {duration(r.durationMs)} · {timeAgo(r.startedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyRow({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      {!label && <code className="min-w-0 flex-1 truncate rounded-md bg-black/40 px-2 py-1.5 font-mono text-[11px] text-white/80">{value}</code>}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            useOrgStore.getState().showToast("Clipboard not available. Select and copy manually.", "info");
          }
        }}
        className="flex shrink-0 items-center gap-1 rounded-md border border-white/12 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 hover:text-white"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : (label ?? "Copy")}
      </button>
    </div>
  );
}

/* ------------------------------ bits ------------------------------ */

function IconBtn({ children, label, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className="grid h-6 w-6 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function AgentLink({ agent, onSelect }: { agent: Agent; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className="rounded-full border border-[#ff5a1f]/30 bg-[#ff5a1f]/[0.06] px-2 py-0.5 text-[11.5px] text-[#ffc29a] hover:border-[#ff5a1f]/70 hover:text-white"
    >
      {agent.name}
    </button>
  );
}

const Meta = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[10px] uppercase leading-[20px] tracking-[0.14em] text-white/40">{children}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => <h3 className="label text-[10px] text-white/45">{children}</h3>;
