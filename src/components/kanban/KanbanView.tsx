"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { departments } from "@/data/org";
import { TASK_COLUMNS, type Agent, type Task, type TaskColumn } from "@/data/types";
import { translate, useT } from "@/i18n";
import { l } from "@/i18n/core";
import { useOrgStore } from "@/store/useOrgStore";
import { StatusDot } from "@/components/ui/badges";
import DeptChips from "@/components/ui/DeptChips";

const deptById = new Map(departments.map((d) => [d.id, d]));

function moveByUser(task: Task, to: TaskColumn) {
  const s = useOrgStore.getState();
  if (task.column === to) return;
  s.moveTask(task.id, to);
  const col = l(translate("en", `col.${to}`), translate("sv", `col.${to}`));
  s.log(
    task.agentId,
    {
      en: `${translate("en", "movedByYou")} → ${col.en} · ${task.title.en}`,
      sv: `${translate("sv", "movedByYou")} → ${col.sv} · ${task.title.sv}`,
    },
    "task",
  );
  if (to === "in_progress") s.setAgentStatus(task.agentId, "working");
}

export default function KanbanView() {
  const tasks = useOrgStore((s) => s.tasks);
  const agents = useOrgStore((s) => s.agents);
  const focusDeptId = useOrgStore((s) => s.focusDeptId);
  const setDragging = useOrgStore((s) => s.setDragging);
  const [filter, setFilter] = useState<string[]>(focusDeptId ? [focusDeptId] : []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { t } = useT();

  // Drilling into a department from the side panel scopes the board to it.
  useEffect(() => {
    setFilter(focusDeptId ? [focusDeptId] : []);
  }, [focusDeptId]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const visible = filter.length ? tasks.filter((t) => filter.includes(t.departmentId)) : tasks;
  const active = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setDragging(String(e.active.id));
  };
  const onDragEnd = (e: DragEndEvent) => {
    const task = tasks.find((t) => t.id === e.active.id);
    const to = e.over?.id as TaskColumn | undefined;
    if (task && to) moveByUser(task, to);
    setActiveId(null);
    setDragging(null);
  };
  const onDragCancel = () => {
    setActiveId(null);
    setDragging(null);
  };

  const toggle = (id: string | null) => {
    if (id === null) return setFilter([]);
    setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="label text-[10px] text-white/40">{t("kanbanKicker")}</div>
          <h1 className="mt-1 flex items-center gap-3 font-mono text-[22px] font-semibold uppercase tracking-[0.18em] text-white">
            {t("kanbanTitle")}
            <span className="flex items-center gap-1.5 rounded-full border border-[#ff5a1f]/30 bg-[#ff5a1f]/10 px-2 py-0.5 text-[9.5px] tracking-[0.16em] text-[#ff9a5c]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5a1f]" /> {t("live")}
            </span>
          </h1>
          <p className="mt-0.5 text-[12px] text-white/45">{t("kanbanHelp")}</p>
        </div>
        <DeptChips label={t("filterDept")} selected={filter} onToggle={toggle} />
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <LayoutGroup>
          <div className="scroll-thin min-h-0 flex-1 overflow-x-auto px-6 pb-5">
            <div className="grid h-full min-w-[940px] grid-cols-5 gap-3">
              {TASK_COLUMNS.map((col) => (
                <Column
                  key={col}
                  column={col}
                  tasks={visible.filter((t) => t.column === col)}
                  agentById={agentById}
                  activeId={activeId}
                />
              ))}
            </div>
          </div>
        </LayoutGroup>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? <CardBody task={active} agent={agentById.get(active.agentId)} lifted /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  column,
  tasks,
  agentById,
  activeId,
}: {
  column: TaskColumn;
  tasks: Task[];
  agentById: Map<string, Agent>;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const { t } = useT();
  const idx = TASK_COLUMNS.indexOf(column);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${t(`col.${column}`)}, ${tasks.length} ${t("tasksWord")}`}
      className={`glass flex min-h-0 flex-col rounded-2xl transition-colors ${isOver ? "!border-[#ff5a1f]/70 bg-[#ff5a1f]/[0.06]" : ""}`}
    >
      <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <h2 className="label text-[10.5px] text-white/75">{t(`col.${column}`)}</h2>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/55">{tasks.length}</span>
      </header>
      <div
        className="mx-3.5 mb-2 h-px"
        style={{ background: `linear-gradient(90deg, rgba(255,90,31,${0.25 + idx * 0.15}), transparent)` }}
      />
      <ul className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((t) => (
            <Card key={t.id} task={t} agent={agentById.get(t.agentId)} dimmed={activeId === t.id} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function Card({ task, agent, dimmed }: { task: Task; agent?: Agent; dimmed: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });
  const flash = useOrgStore((s) => s.lastMovedTaskId === task.id);
  const selectAgent = useOrgStore((s) => s.selectAgent);
  const { t, tx } = useT();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TASK_COLUMNS.indexOf(task.column);
    if (e.key === "ArrowRight" && i < TASK_COLUMNS.length - 1) moveByUser(task, TASK_COLUMNS[i + 1]);
    else if (e.key === "ArrowLeft" && i > 0) moveByUser(task, TASK_COLUMNS[i - 1]);
    else if (e.key === "Enter" || e.key === " ") selectAgent(task.agentId);
    else return;
    e.preventDefault();
  };

  return (
    <motion.li
      ref={setNodeRef}
      layout
      layoutId={task.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-roledescription="task card"
      aria-label={`${tx(task.title)}. ${agent?.name ?? ""}, ${tx(deptById.get(task.departmentId)?.name ?? l("", ""))}. ${t(`col.${task.column}`)}.`}
      onKeyDown={onKeyDown}
      onClick={() => selectAgent(task.agentId)}
      className="cursor-grab touch-none rounded-xl outline-none active:cursor-grabbing"
    >
      <CardBody task={task} agent={agent} flash={flash} />
    </motion.li>
  );
}

function CardBody({ task, agent, lifted, flash }: { task: Task; agent?: Agent; lifted?: boolean; flash?: boolean }) {
  const dept = deptById.get(task.departmentId);
  const color = dept?.color ?? "#ff5a1f";
  const { tx } = useT();
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#110c0c]/95 py-2.5 pl-3.5 pr-3 transition-shadow ${
        lifted ? "rotate-[1.5deg] border-[#ffb020]/70 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_rgba(255,120,40,0.35)]" : "border-white/[0.07] hover:border-white/20"
      }`}
      style={flash ? ({ "--flash": color, animation: "card-flash 1.8s ease-out" } as React.CSSProperties) : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <div className="text-[12.5px] leading-snug text-white/90">{tx(task.title)}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/55">
          {agent && <StatusDot status={agent.status} />}
          <span className="truncate">{agent?.name}</span>
        </span>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color }}>
          {dept && tx(dept.name)}
        </span>
      </div>
    </div>
  );
}
