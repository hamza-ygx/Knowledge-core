"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileSpreadsheet, FileText, Loader2, Paperclip, Plus, Printer, RotateCw, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRIORITY_LABELS, type Intake, type Project } from "@/data/types";
import { DEFAULT_MODEL, estimateCost, MAX_INPUT_CHARS, usd } from "@/lib/organiser/cost";
import { exportExcel, exportWord, grouped } from "@/lib/organiser/export";
import { useOrgStore } from "@/store/useOrgStore";
import { Button, inputCls } from "@/components/ui/form";
import { timeAgo } from "@/components/runs/format";

const ACCEPT = ".txt,.md,.markdown,.csv,.tsv,.json,.log,.yaml,.yml,.xml,.html,.htm,.ini,.toml,.docx,.xlsx,.pdf";
const MAX_FILES = 10;
const MAX_BYTES = 4 * 1024 * 1024;

export default function ProjectsView() {
  const projects = useOrgStore((s) => s.projects);
  const openModal = useOrgStore((s) => s.openModal);
  const [exporting, setExporting] = useState<string | null>(null);
  const groups = useMemo(() => grouped(projects), [projects]);

  const run = async (kind: string, fn: () => Promise<void>) => {
    setExporting(kind);
    try {
      await fn();
    } catch (e) {
      useOrgStore.getState().showToast(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
          <div>
            <div className="label text-[10px] text-white/40">Organiser</div>
            <h1 className="mt-1 font-mono text-[22px] font-semibold uppercase tracking-[0.18em] text-white">Projects</h1>
            <p className="mt-0.5 text-[12px] text-white/45">
              {projects.length} projects · {projects.filter((p) => p.status === "active").length} being worked on ·{" "}
              {projects.filter((p) => p.status === "live").length} live
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!projects.length || !!exporting} onClick={() => run("xlsx", () => exportExcel(projects))}>
              {exporting === "xlsx" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
            </Button>
            <Button disabled={!projects.length || !!exporting} onClick={() => run("docx", () => exportWord(projects))}>
              {exporting === "docx" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Word
            </Button>
            <Button disabled={!projects.length} onClick={() => window.open("/print/projects", "_blank", "noopener")}>
              <Printer size={13} /> Print / PDF
            </Button>
            <Button tone="primary" onClick={() => openModal({ type: "project" })}>
              <Plus size={13} /> Project
            </Button>
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 pb-8">
          {projects.length === 0 ? (
            <div className="mx-auto mt-16 max-w-md text-center">
              <Sparkles className="mx-auto text-[#ffb020]" size={22} />
              <h2 className="mt-3 text-[17px] font-semibold text-white">No projects yet</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                Throw everything you&apos;ve got at Organiser: notes, files from your USB drives, GitHub links. It sorts it into live, in
                progress and up next.
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.status} className="mb-7">
                <h2 className="label mb-3 flex items-center gap-2 text-[10.5px] text-white/60">
                  {g.label} <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/45">{g.items.length}</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
                  <AnimatePresence initial={false}>
                    {g.items.map((p) => (
                      <ProjectCard key={p.id} project={p} onOpen={() => openModal({ type: "project", id: p.id })} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <Inbox />
    </div>
  );
}

const PRIORITY_STYLE = {
  high: "border-red-500/40 bg-red-500/10 text-red-300",
  medium: "border-[#ffb020]/35 bg-[#ffb020]/10 text-[#ffd48a]",
  low: "border-white/15 bg-white/[0.04] text-white/50",
} as const;

function ProjectCard({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <motion.button
      layout
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass flex flex-col rounded-xl px-4 py-3.5 text-left transition-[border-color] hover:!border-[#ff5a1f]/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold leading-snug text-white">{p.name}</h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${PRIORITY_STYLE[p.priority]}`}>
          {PRIORITY_LABELS[p.priority]}
        </span>
      </div>
      {p.summary && <p className="mt-1 line-clamp-2 text-[12px] text-white/55">{p.summary}</p>}
      {p.currentWork && (
        <p className="mt-2 text-[12px] text-white/80">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#ff9a5c]">Now </span>
          {p.currentWork}
        </p>
      )}
      {p.nextSteps.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-white/65">
          {p.nextSteps.slice(0, 3).map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-[#ff9a5c]">→</span>
              <span className="line-clamp-1">{s}</span>
            </li>
          ))}
          {p.nextSteps.length > 3 && <li className="pl-4 text-white/35">+{p.nextSteps.length - 3} more</li>}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 font-mono text-[10px] text-white/35">
        <span className="truncate">{p.location || " "}</span>
        {p.target && <span className="shrink-0 text-white/50">{p.target}</span>}
      </div>
    </motion.button>
  );
}

/* ------------------------------- inbox ------------------------------- */

interface BudgetStatus {
  model: string;
  budget: number;
  spent: number;
  enabled: boolean;
}

/** Rough text size of a file before the server extracts it. */
function approxChars(f: File) {
  const e = f.name.toLowerCase().split(".").pop();
  if (e === "docx") return f.size / 4;
  if (e === "xlsx") return f.size / 3;
  if (e === "pdf") return f.size / 8;
  return f.size;
}

function Inbox() {
  const agents = useOrgStore((s) => s.agents);
  const intakes = useOrgStore((s) => s.intakes);
  const projectCount = useOrgStore((s) => s.projects.length);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const refreshBudget = useCallback(async () => {
    const res = await fetch("/api/organise").catch(() => null);
    if (res?.ok) setBudget(await res.json());
  }, []);
  useEffect(() => {
    refreshBudget();
  }, [refreshBudget]);
  const [text, setText] = useState("");
  const [links, setLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [agentId, setAgentId] = useState(() => agents.find((a) => /organi[sz]/i.test(a.name))?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "info" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const typedChars = text.length + links.length;
  const approx = typedChars + files.reduce((s, f) => s + approxChars(f), 0);
  const tooLong = typedChars > MAX_INPUT_CHARS;
  const overBudget = !!budget && budget.spent >= budget.budget;
  const estimate = estimateCost(budget?.model ?? DEFAULT_MODEL, Math.min(approx, MAX_INPUT_CHARS), projectCount);
  const canSend = !busy && (text.trim() || links.trim() || files.length) && totalBytes <= MAX_BYTES && !tooLong;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_FILES));
  };

  const submit = async (body: FormData | { intakeId: string }) => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/organise", {
        method: "POST",
        ...(body instanceof FormData
          ? { body }
          : { body: JSON.stringify({ ...body, agentId: agentId || null }), headers: { "Content-Type": "application/json" } }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202 || res.status === 402) setResult({ tone: "info", text: data.message ?? "Saved to the inbox." });
      else if (!res.ok) setResult({ tone: "error", text: data.error ?? `Something went wrong (${res.status}).` });
      else {
        setResult({
          tone: "ok",
          text: `${data.summary} ${data.created} new, ${data.updated} updated.${typeof data.costUsd === "number" ? ` Cost ${usd(data.costUsd)}.` : ""}`,
        });
        if (body instanceof FormData) {
          setText("");
          setLinks("");
          setFiles([]);
        }
      }
      await useOrgStore.getState().load();
      refreshBudget();
    } catch {
      setResult({ tone: "error", text: "Couldn't reach the server. Check your connection." });
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const form = new FormData();
    form.set("text", text);
    form.set("links", links);
    if (agentId) form.set("agentId", agentId);
    files.forEach((f) => form.append("files", f));
    submit(form);
  };

  return (
    <aside className="scroll-thin hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l border-white/5 px-5 py-5 lg:flex">
      <div className="label flex items-center gap-2 text-[10px] text-[#ffb020]">
        <Sparkles size={12} /> Throw it at Organiser
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-white/45">
        Paste notes, drop files, add links. Organiser sorts everything into projects and updates the ones it already knows.
      </p>

      <textarea
        className={`${inputCls} mt-3 min-h-[160px] resize-y text-[13px]`}
        placeholder={"e.g.\nWebsite redesign is live, still fixing the contact form.\nNext: invoice app for Mum's shop, notes on the black USB.\nIdea: Swedish tax bot…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={150000}
      />
      <textarea
        className={`${inputCls} mt-2 min-h-[56px] resize-y font-mono text-[11.5px]`}
        placeholder="GitHub or other links, one per line"
        value={links}
        onChange={(e) => setLinks(e.target.value)}
        maxLength={20000}
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="mt-2 rounded-lg border border-dashed border-white/15 px-3 py-3 text-center"
      >
        <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white">
          <Paperclip size={13} /> Drop files or browse
        </button>
        <div className="mt-1 text-[10.5px] text-white/30">txt, md, csv, json, docx, xlsx, pdf · up to {MAX_FILES} files, 4 MB</div>
        {files.length > 0 && (
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-2 pr-1 text-[11px] text-white/70">
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="rounded-full p-0.5 hover:bg-white/10">
                  <X size={10} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {totalBytes > MAX_BYTES && <p className="mt-1 text-[11px] text-red-300">Files are over 4 MB in total.</p>}
      </div>

      <label className="mt-3 flex items-center gap-2 text-[11.5px] text-white/50">
        Run as
        <select className={`${inputCls.replace("w-full", "flex-1")} py-1.5 text-[12px]`} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">— No agent</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <Button tone="primary" className="mt-3 w-full py-2.5" disabled={!canSend} onClick={send}>
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Organising…
          </>
        ) : (
          <>
            <Sparkles size={14} /> Organise
          </>
        )}
      </Button>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/40">
        <span>{tooLong ? <span className="text-red-300">Too long: split into batches of {MAX_INPUT_CHARS.toLocaleString()} characters</span> : `≈ ${usd(estimate)} for this batch`}</span>
        {budget && (
          <span className={overBudget ? "text-red-300" : ""} title={`Model: ${budget.model}`}>
            {usd(budget.spent)} of {usd(budget.budget)} used
          </span>
        )}
      </div>
      {budget && !budget.enabled && <p className="mt-1 text-[10.5px] text-[#ffcf70]/80">No API key yet: items are saved and wait in the inbox.</p>}
      {busy && <p className="mt-2 text-center text-[11px] text-white/40">Usually 5–20 seconds.</p>}
      {result && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
            result.tone === "ok"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : result.tone === "info"
                ? "border-[#ffb020]/30 bg-[#ffb020]/10 text-[#ffd48a]"
                : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {result.text}
        </p>
      )}

      <h3 className="label mt-7 text-[10px] text-white/40">Inbox history</h3>
      {intakes.length === 0 ? (
        <p className="mt-2 text-[12px] text-white/35">Nothing yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {intakes.map((i) => (
            <IntakeRow key={i.id} intake={i} busy={busy} onRetry={() => submit({ intakeId: i.id })} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function IntakeRow({ intake: i, busy, onRetry }: { intake: Intake; busy: boolean; onRetry: () => void }) {
  const [open, setOpen] = useState(false);
  const badge = {
    done: "text-emerald-300",
    pending: "text-[#ffcf70]",
    processing: "text-[#ffcf70]",
    failed: "text-red-300",
  }[i.status];
  const preview = i.text.replace(/^# \w+\n/m, "").slice(0, 90);
  return (
    <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className={badge}>{i.status}</span>
          <span className="text-white/35">
            {i.costUsd > 0 && `${usd(i.costUsd)} · `}
            {timeAgo(i.createdAt)}
          </span>
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] text-white/65">{i.summary ?? (preview || `${i.files.length} files`)}</div>
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-t border-white/5 pt-2 text-[11.5px]">
          {i.error && <p className="text-red-300">{i.error}</p>}
          {i.summary && <p className="whitespace-pre-wrap text-white/60">{i.summary}</p>}
          {i.files.length > 0 && (
            <p className="text-white/40">
              Files: {i.files.map((f) => `${f.name}${f.note ? ` (${f.note})` : ""}`).join(", ")}
            </p>
          )}
          <div className="flex gap-2">
            {(i.status === "pending" || i.status === "failed") && (
              <Button onClick={onRetry} disabled={busy}>
                <RotateCw size={12} /> Organise now
              </Button>
            )}
            <Button onClick={() => useOrgStore.getState().deleteIntake(i.id)} aria-label="Delete from inbox">
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
