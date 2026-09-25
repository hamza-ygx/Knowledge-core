"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DEPARTMENT_COLORS,
  KIND_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  TASK_COLUMNS,
  COLUMN_LABELS,
  type AgentKind,
  type Priority,
  type ProjectStatus,
  type TaskColumn,
} from "@/data/types";
import { useOrgStore, type ModalState } from "@/store/useOrgStore";
import { Button, Field, Modal, inputCls } from "@/components/ui/form";

/** Renders whichever create/edit dialog is open in the store. */
export default function Modals() {
  const modal = useOrgStore((s) => s.modal);
  const close = () => useOrgStore.getState().openModal(null);
  // Key by the modal identity so each open starts from fresh form state.
  const key = modal ? JSON.stringify(modal) : "none";
  return (
    <>
      <Modal open={modal?.type === "department"} title={modal?.type === "department" && modal.id ? "Edit department" : "New department"} onClose={close}>
        {modal?.type === "department" && <DepartmentForm key={key} modal={modal} onDone={close} />}
      </Modal>
      <Modal open={modal?.type === "agent"} title="New agent" onClose={close}>
        {modal?.type === "agent" && <AgentForm key={key} modal={modal} onDone={close} />}
      </Modal>
      <Modal open={modal?.type === "project"} title={modal?.type === "project" && modal.id ? "Edit project" : "New project"} onClose={close} width={560}>
        {modal?.type === "project" && <ProjectForm key={key} modal={modal} onDone={close} />}
      </Modal>
      <Modal open={modal?.type === "task"} title={modal?.type === "task" && modal.id ? "Edit task" : "New task"} onClose={close} width={520}>
        {modal?.type === "task" && <TaskForm key={key} modal={modal} onDone={close} />}
      </Modal>
    </>
  );
}

/* ----------------------------- department ----------------------------- */

function DepartmentForm({ modal, onDone }: { modal: Extract<ModalState, { type: "department" }>; onDone: () => void }) {
  const existing = useOrgStore((s) => s.departments.find((d) => d.id === modal.id));
  const count = useOrgStore((s) => s.departments.length);
  const agentCount = useOrgStore((s) => s.agents.filter((a) => a.departmentId === modal.id).length);
  const [name, setName] = useState(existing?.name ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [color, setColor] = useState(existing?.color ?? DEPARTMENT_COLORS[count % DEPARTMENT_COLORS.length]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = useOrgStore.getState();
    if (!name.trim()) return;
    if (existing) await s.updateDepartment(existing.id, { name: name.trim(), subtitle: subtitle.trim(), color });
    else await s.addDepartment({ name: name.trim(), subtitle: subtitle.trim(), color });
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Sales" />
      </Field>
      <Field label="Subtitle" hint="A few words under the name on the map.">
        <input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} placeholder="e.g. leads & deals" />
      </Field>
      <Field label="Colour">
        <div className="flex flex-wrap gap-2">
          {DEPARTMENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-[#110c0c]" : ""}`}
              style={{ background: c, boxShadow: `0 0 10px ${c}88` }}
            />
          ))}
        </div>
      </Field>
      <div className="flex items-center justify-between gap-2 pt-2">
        {existing ? (
          confirmDelete ? (
            <Button
              tone="danger"
              onClick={async () => {
                await useOrgStore.getState().deleteDepartment(existing.id);
                onDone();
              }}
            >
              Delete {agentCount ? `+ ${agentCount} agents` : ""}
            </Button>
          ) : (
            <Button tone="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete department">
              <Trash2 size={13} /> Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <Button tone="primary" type="submit" disabled={!name.trim()}>
          {existing ? "Save" : "Add department"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------- agent -------------------------------- */

function AgentForm({ modal, onDone }: { modal: Extract<ModalState, { type: "agent" }>; onDone: () => void }) {
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const [departmentId, setDepartmentId] = useState(modal.departmentId ?? departments[0]?.id ?? "");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [kind, setKind] = useState<AgentKind>("ai_agent");
  const [reportsTo, setReportsTo] = useState<string>(modal.reportsTo ?? "");
  const colleagues = agents.filter((a) => a.departmentId === departmentId);

  if (!departments.length) {
    return <p className="text-[13px] text-white/60">Add a department first. Every agent belongs to one.</p>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !departmentId) return;
    const s = useOrgStore.getState();
    const id = await s.addAgent({
      departmentId,
      name: name.trim(),
      role: role.trim(),
      kind,
      reportsTo: reportsTo && colleagues.some((c) => c.id === reportsTo) ? reportsTo : null,
    });
    onDone();
    if (id) s.selectAgent(id);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Invoice bot" />
      </Field>
      <Field label="Role" hint="What it does, in a few words.">
        <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="e.g. Sends and chases invoices" />
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
          <select className={inputCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
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
          {colleagues.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[12px] text-white/40">You&apos;ll add its process steps and tools next, in the agent panel.</p>
      <div className="flex justify-end pt-1">
        <Button tone="primary" type="submit" disabled={!name.trim()}>
          Add agent
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------- task -------------------------------- */

function TaskForm({ modal, onDone }: { modal: Extract<ModalState, { type: "task" }>; onDone: () => void }) {
  const existing = useOrgStore((s) => s.tasks.find((t) => t.id === modal.id));
  const departments = useOrgStore((s) => s.departments);
  const agents = useOrgStore((s) => s.agents);
  const [title, setTitle] = useState(existing?.title ?? modal.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [column, setColumn] = useState<TaskColumn>(existing?.column ?? modal.column ?? "backlog");
  const [agentId, setAgentId] = useState(existing?.agentId ?? modal.agentId ?? "");
  const [departmentId, setDepartmentId] = useState(
    existing?.departmentId ?? modal.departmentId ?? agents.find((a) => a.id === (modal.agentId ?? ""))?.departmentId ?? "",
  );
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");

  const pickAgent = (id: string) => {
    setAgentId(id);
    const a = agents.find((x) => x.id === id);
    if (a) setDepartmentId(a.departmentId);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const s = useOrgStore.getState();
    const data = {
      title: title.trim(),
      notes,
      agentId: agentId || null,
      departmentId: departmentId || null,
      dueDate: dueDate || null,
    };
    if (existing) {
      const moved = column !== existing.column;
      const position = moved ? Math.max(0, ...s.tasks.filter((t) => t.column === column).map((t) => t.position)) + 1000 : undefined;
      await s.updateTask(existing.id, { ...data, column, ...(position !== undefined ? { position } : {}) });
    } else await s.addTask({ ...data, column });
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Title">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="What needs doing?" />
      </Field>
      <Field label="Notes">
        <textarea className={`${inputCls} min-h-[90px] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignee">
          <select className={inputCls} value={agentId} onChange={(e) => pickAgent(e.target.value)}>
            <option value="">— Unassigned</option>
            {departments.map((d) => (
              <optgroup key={d.id} label={d.name}>
                {agents
                  .filter((a) => a.departmentId === d.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select className={inputCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Column">
          <select className={inputCls} value={column} onChange={(e) => setColumn(e.target.value as TaskColumn)}>
            {TASK_COLUMNS.map((c) => (
              <option key={c} value={c}>
                {COLUMN_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        {existing ? (
          <Button
            tone="danger"
            onClick={async () => {
              await useOrgStore.getState().deleteTask(existing.id);
              onDone();
            }}
          >
            <Trash2 size={13} /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button tone="primary" type="submit" disabled={!title.trim()}>
          {existing ? "Save" : "Add task"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------- project ------------------------------ */

function ProjectForm({ modal, onDone }: { modal: Extract<ModalState, { type: "project" }>; onDone: () => void }) {
  const existing = useOrgStore((s) => s.projects.find((p) => p.id === modal.id));
  const [name, setName] = useState(existing?.name ?? "");
  const [status, setStatus] = useState<ProjectStatus>(existing?.status ?? "upcoming");
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? "medium");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [currentWork, setCurrentWork] = useState(existing?.currentWork ?? "");
  const [nextSteps, setNextSteps] = useState((existing?.nextSteps ?? []).join("\n"));
  const [location, setLocation] = useState(existing?.location ?? "");
  const [links, setLinks] = useState((existing?.links ?? []).join("\n"));
  const [target, setTarget] = useState(existing?.target ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lines = (v: string) =>
    v
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 30);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await useOrgStore.getState().saveProject(existing?.id ?? null, {
      name: name.trim().slice(0, 120),
      status,
      priority,
      summary,
      currentWork,
      nextSteps: lines(nextSteps),
      location,
      links: lines(links),
      target: target.trim(),
      notes,
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Target">
          <input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} maxLength={120} placeholder="e.g. Dec 2026" />
        </Field>
      </div>
      <Field label="Summary">
        <textarea className={`${inputCls} min-h-[60px] resize-y`} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={2000} />
      </Field>
      <Field label="Being worked on">
        <textarea className={`${inputCls} min-h-[50px] resize-y`} value={currentWork} onChange={(e) => setCurrentWork(e.target.value)} maxLength={2000} />
      </Field>
      <Field label="Next steps" hint="One per line.">
        <textarea className={`${inputCls} min-h-[80px] resize-y`} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Where it lives">
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} placeholder="e.g. black USB / GitHub repo" />
        </Field>
        <Field label="Links" hint="One per line.">
          <textarea className={`${inputCls} min-h-[38px] resize-y font-mono text-[12px]`} value={links} onChange={(e) => setLinks(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className={`${inputCls} min-h-[50px] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
      </Field>
      <div className="flex items-center justify-between gap-2 pt-1">
        {existing ? (
          confirmDelete ? (
            <Button
              tone="danger"
              onClick={async () => {
                await useOrgStore.getState().deleteProject(existing.id);
                onDone();
              }}
            >
              Delete for good
            </Button>
          ) : (
            <Button onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <Button tone="primary" type="submit" disabled={!name.trim()}>
          {existing ? "Save" : "Add project"}
        </Button>
      </div>
    </form>
  );
}
