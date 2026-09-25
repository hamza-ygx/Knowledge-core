"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CalendarDays, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { COLUMN_LABELS, TASK_COLUMNS, type Agent, type Department, type Task, type TaskColumn } from "@/data/types";
import { between } from "@/lib/metrics";
import { useOrgStore } from "@/store/useOrgStore";
import { StatusDot } from "@/components/ui/badges";
import DeptChips from "@/components/ui/DeptChips";

/** Move a task into a column, optionally before another card. */
function moveTask(task: Task, to: TaskColumn, beforeId?: string) {
  const s = useOrgStore.getState();
  const column = s.tasks.filter((t) => t.column === to && t.id !== task.id);
  const idx = beforeId ? column.findIndex((t) => t.id === beforeId) : -1;
  const position =
    idx === -1 ? between(column[column.length - 1]?.position, undefined) : between(column[idx - 1]?.position, column[idx].position);
  if (task.column === to && task.position === position) return;
  s.updateTask(task.id, { column: to, position });
}

export default function TasksView() {
  const tasks = useOrgStore((s) => s.tasks);
  const agents = useOrgStore((s) => s.agents);
  const departments = useOrgStore((s) => s.departments);
  const focusDeptId = useOrgStore((s) => s.focusDeptId);
  const setDragging = useOrgStore((s) => s.setDragging);
  const openModal = useOrgStore((s) => s.openModal);
  const [filter, setFilter] = useState<string[]>(focusDeptId ? [focusDeptId] : []);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setFilter(focusDeptId ? [focusDeptId] : []);
  }, [focusDeptId]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const visible = filter.length ? tasks.filter((t) => t.departmentId && filter.includes(t.departmentId)) : tasks;
  const active = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setDragging(String(e.active.id));
  };
  const onDragEnd = (e: DragEndEvent) => {
    const task = tasks.find((t) => t.id === e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (task && overId) {
      if ((TASK_COLUMNS as string[]).includes(overId)) moveTask(task, overId as TaskColumn);
      else {
        const target = tasks.find((t) => t.id === overId);
        if (target && target.id !== task.id) moveTask(task, target.column, target.id);
      }
    }
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
          <div className="label text-[10px] text-white/40">Tasks</div>
          <h1 className="mt-1 font-mono text-[22px] font-semibold uppercase tracking-[0.18em] text-white">Work board</h1>
          <p className="mt-0.5 text-[12px] text-white/45">Drag cards, or focus one and use ← →. Enter opens it.</p>
        </div>
        {departments.length > 0 && <DeptChips label="Filter by department" selected={filter} onToggle={toggle} />}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => (setActiveId(null), setDragging(null))}>
        <LayoutGroup>
          <div className="scroll-thin min-h-0 flex-1 overflow-x-auto px-6 pb-5">
            <div className="grid h-full min-w-[940px] grid-cols-5 gap-3">
              {TASK_COLUMNS.map((col) => (
                <Column
                  key={col}
                  column={col}
                  tasks={visible.filter((t) => t.column === col)}
                  agentById={agentById}
                  deptById={deptById}
                  activeId={activeId}
                  onAdd={() => openModal({ type: "task", column: col, departmentId: filter.length === 1 ? filter[0] : null })}
                />
              ))}
            </div>
          </div>
        </LayoutGroup>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? <CardBody task={active} agent={active.agentId ? agentById.get(active.agentId) : undefined} dept={active.departmentId ? deptById.get(active.departmentId) : undefined} lifted /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  column,
  tasks,
  agentById,
  deptById,
  activeId,
  onAdd,
}: {
  column: TaskColumn;
  tasks: Task[];
  agentById: Map<string, Agent>;
  deptById: Map<string, Department>;
  activeId: string | null;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const idx = TASK_COLUMNS.indexOf(column);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${COLUMN_LABELS[column]}, ${tasks.length} tasks`}
      className={`glass flex min-h-0 flex-col rounded-2xl transition-colors ${isOver ? "!border-[#ff5a1f]/70 bg-[#ff5a1f]/[0.06]" : ""}`}
    >
      <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <h2 className="label text-[10.5px] text-white/75">{COLUMN_LABELS[column]}</h2>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/55">{tasks.length}</span>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add task to ${COLUMN_LABELS[column]}`}
            className="grid h-6 w-6 place-items-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
          >
            <Plus size={13} />
          </button>
        </div>
      </header>
      <div className="mx-3.5 mb-2 h-px" style={{ background: `linear-gradient(90deg, rgba(255,90,31,${0.25 + idx * 0.15}), transparent)` }} />
      <ul className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((t) => (
            <Card
              key={t.id}
              task={t}
              agent={t.agentId ? agentById.get(t.agentId) : undefined}
              dept={t.departmentId ? deptById.get(t.departmentId) : undefined}
              dimmed={activeId === t.id}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <li>
            <button
              type="button"
              onClick={onAdd}
              className="w-full rounded-xl border border-dashed border-white/10 px-3 py-4 text-[12px] text-white/35 hover:border-white/25 hover:text-white/60"
            >
              + Add a task
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

function Card({ task, agent, dept, dimmed }: { task: Task; agent?: Agent; dept?: Department; dimmed: boolean }) {
  const { attributes, listeners, setNodeRef: dragRef } = useDraggable({ id: task.id });
  const { setNodeRef: dropRef } = useDroppable({ id: task.id });
  const openModal = useOrgStore((s) => s.openModal);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TASK_COLUMNS.indexOf(task.column);
    if (e.key === "ArrowRight" && i < TASK_COLUMNS.length - 1) moveTask(task, TASK_COLUMNS[i + 1]);
    else if (e.key === "ArrowLeft" && i > 0) moveTask(task, TASK_COLUMNS[i - 1]);
    else if (e.key === "Enter" || e.key === " ") openModal({ type: "task", id: task.id });
    else return;
    e.preventDefault();
  };

  return (
    <motion.li
      ref={(el) => {
        dragRef(el);
        dropRef(el);
      }}
      layout
      layoutId={task.id}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-roledescription="task card"
      aria-label={`${task.title}. ${agent?.name ?? "Unassigned"}. ${COLUMN_LABELS[task.column]}.`}
      onKeyDown={onKeyDown}
      onClick={() => openModal({ type: "task", id: task.id })}
      className="cursor-grab touch-none rounded-xl outline-none active:cursor-grabbing"
    >
      <CardBody task={task} agent={agent} dept={dept} />
    </motion.li>
  );
}

function CardBody({ task, agent, dept, lifted }: { task: Task; agent?: Agent; dept?: Department; lifted?: boolean }) {
  const color = dept?.color ?? "#6b5a52";
  const overdue = task.dueDate && task.column !== "done" && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#110c0c]/95 py-2.5 pl-3.5 pr-3 transition-shadow ${
        lifted ? "rotate-[1.5deg] border-[#ffb020]/70 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_rgba(255,120,40,0.35)]" : "border-white/[0.07] hover:border-white/20"
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <div className="text-[12.5px] leading-snug text-white/90">{task.title}</div>
      {task.notes && <div className="mt-1 line-clamp-2 text-[11px] text-white/40">{task.notes}</div>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/55">
          {agent ? (
            <>
              <StatusDot status={agent.status} />
              <span className="truncate">{agent.name}</span>
            </>
          ) : (
            <span className="text-white/30">Unassigned</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {task.dueDate && (
            <span className={`flex items-center gap-1 font-mono text-[9.5px] ${overdue ? "text-red-300" : "text-white/40"}`}>
              <CalendarDays size={10} />
              {task.dueDate.slice(5)}
            </span>
          )}
          {dept && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color }}>
              {dept.name}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
