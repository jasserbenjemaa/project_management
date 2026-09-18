"use client";

import { useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  CirclePlay,
  FlaskConical,
  TestTube2,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  Search,
  Package,
  PackageCheck,
  CircleSlash,
  Lock,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types — shared with any other view (e.g. a calendar) that reads the same
// tasks. Replace `sampleTasks` with real data and wire `onTasksChange` up to
// a server action to persist status/order/new-task changes.
// ---------------------------------------------------------------------------

export type TaskStatus =
  | "IN_PROGRESS"
  | "READY_FOR_DRY_RUN"
  | "DRY_RUN_IN_PROGRESS"
  | "READY_FOR_TC"
  | "TC_DONE"
  | "TC_CORRECTION"
  | "READY_FOR_QC"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "OUT_OF_SCOPE"
  | "BLOCKED";

export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  status: TaskStatus;
  dueDate: string; // "YYYY-MM-DD"
}

export const STATUS_COLUMNS: {
  id: TaskStatus;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "IN_PROGRESS", label: "In progress", icon: CirclePlay },
  { id: "READY_FOR_DRY_RUN", label: "Ready for dry run", icon: FlaskConical },
  { id: "DRY_RUN_IN_PROGRESS", label: "Dry run in progress", icon: TestTube2 },
  { id: "READY_FOR_TC", label: "Ready for TC", icon: ClipboardList },
  { id: "TC_DONE", label: "TC Done", icon: ClipboardCheck },
  { id: "TC_CORRECTION", label: "TC Correction", icon: Wrench },
  { id: "READY_FOR_QC", label: "Ready for QC", icon: Search },
  { id: "READY_FOR_DELIVERY", label: "Ready for Delivery", icon: Package },
  { id: "DELIVERED", label: "Delivered", icon: PackageCheck },
  { id: "OUT_OF_SCOPE", label: "Out of scope", icon: CircleSlash },
  { id: "BLOCKED", label: "Blocked", icon: Lock },
];

export const statusStyles: Record<TaskStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  READY_FOR_DRY_RUN: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  DRY_RUN_IN_PROGRESS: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  READY_FOR_TC: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  TC_DONE: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  TC_CORRECTION: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  READY_FOR_QC: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
  READY_FOR_DELIVERY: "bg-lime-100 text-lime-700 hover:bg-lime-100",
  DELIVERED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  OUT_OF_SCOPE: "bg-slate-100 text-slate-500 hover:bg-slate-100",
  BLOCKED: "bg-red-100 text-red-700 hover:bg-red-100",
};

// Keyed by status id (not label text) so it stays in sync with
// STATUS_COLUMNS even if a label's wording changes later.
export const STATUS_LLT_COLORS: Record<TaskStatus, { bg: string; fg: string }> =
  {
    IN_PROGRESS: { bg: "#dbeafe", fg: "#1d4ed8" },
    READY_FOR_DRY_RUN: { bg: "#e0e7ff", fg: "#4338ca" },
    DRY_RUN_IN_PROGRESS: { bg: "#dbeafe", fg: "#1d4ed8" },
    READY_FOR_TC: { bg: "#e0e7ff", fg: "#4338ca" },
    TC_DONE: { bg: "#dcfce7", fg: "#15803d" },
    TC_CORRECTION: { bg: "#fee2e2", fg: "#b91c1c" },
    READY_FOR_QC: { bg: "#e0e7ff", fg: "#4338ca" },
    READY_FOR_DELIVERY: { bg: "#fef9c3", fg: "#a16207" },
    DELIVERED: { bg: "#dcfce7", fg: "#15803d" },
    OUT_OF_SCOPE: { bg: "#f3f4f6", fg: "#6b7280" },
    BLOCKED: { bg: "#fee2e2", fg: "#b91c1c" },
  };

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export const sampleTasks: Task[] = [
  {
    id: "1",
    title: "Draft HLT narrative",
    project: "Acme Phase II",
    assignee: "Sara Lee",
    status: "IN_PROGRESS",
    dueDate: "2026-09-19",
  },
  {
    id: "2",
    title: "LLR safety review",
    project: "Nova Trial",
    assignee: "Omar Faye",
    status: "READY_FOR_DRY_RUN",
    dueDate: "2026-09-22",
  },
  {
    id: "3",
    title: "Architecture spec v2",
    project: "Helix Platform",
    assignee: "Mina Cho",
    status: "DRY_RUN_IN_PROGRESS",
    dueDate: "2026-09-18",
  },
  {
    id: "4",
    title: "Code review: ingestion",
    project: "Helix Platform",
    assignee: "Sara Lee",
    status: "READY_FOR_TC",
    dueDate: "2026-09-10",
  },
  {
    id: "5",
    title: "LLT coding pass",
    project: "Acme Phase II",
    assignee: "Omar Faye",
    status: "TC_DONE",
    dueDate: "2026-09-25",
  },
  {
    id: "6",
    title: "Client kickoff deck",
    project: "Nova Trial",
    assignee: "Mina Cho",
    status: "TC_CORRECTION",
    dueDate: "2026-09-30",
  },
  {
    id: "7",
    title: "Final QC pass",
    project: "Helix Platform",
    assignee: "Sara Lee",
    status: "READY_FOR_QC",
    dueDate: "2026-09-18",
  },
  {
    id: "8",
    title: "Submission package",
    project: "Acme Phase II",
    assignee: "Mina Cho",
    status: "READY_FOR_DELIVERY",
    dueDate: "2026-09-03",
  },
  {
    id: "9",
    title: "Signed protocol v1",
    project: "Nova Trial",
    assignee: "Omar Faye",
    status: "DELIVERED",
    dueDate: "2026-08-29",
  },
  {
    id: "10",
    title: "Legacy dataset cleanup",
    project: "Helix Platform",
    assignee: "Mina Cho",
    status: "OUT_OF_SCOPE",
    dueDate: "2026-09-05",
  },
  {
    id: "11",
    title: "Vendor data feed fix",
    project: "Acme Phase II",
    assignee: "Sara Lee",
    status: "BLOCKED",
    dueDate: "2026-09-20",
  },
];

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const map = {} as Record<TaskStatus, Task[]>;
  for (const col of STATUS_COLUMNS) map[col.id] = [];
  for (const t of tasks) map[t.status].push(t);
  return map;
}

// ---------------------------------------------------------------------------
// KanbanBoard — standalone. Works uncontrolled out of the box (drop it
// anywhere and it manages its own state from `sampleTasks`), or controlled
// by passing `tasks` + `onTasksChange` from a parent that owns the data.
// ---------------------------------------------------------------------------

export default function KanbanBoard({
  tasks: tasksProp,
  onTasksChange,
  onTaskStatusChange,
}: {
  tasks?: Task[];
  onTasksChange?: (tasks: Task[]) => void;
  // Fired only when a drag moves a task into a different status column
  // (not on same-column reordering or on new-task creation), so the
  // parent can persist just that one change — e.g. a server action call
  // — without having to diff the full tasks array itself.
  onTaskStatusChange?: (
    taskId: string,
    status: TaskStatus,
    previousStatus: TaskStatus,
  ) => void;
}) {
  const [internalTasks, setInternalTasks] = useState<Task[]>(
    tasksProp ?? sampleTasks,
  );
  const tasks = tasksProp ?? internalTasks;
  const grouped = useMemo(() => groupByStatus(tasks), [tasks]);

  const [addingToStatus, setAddingToStatus] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState("");

  function commit(next: Task[]) {
    if (onTasksChange) onTasksChange(next);
    else setInternalTasks(next);
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const next = groupByStatus(tasks);
    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    const sourceList = Array.from(next[sourceStatus]);
    const [moved] = sourceList.splice(source.index, 1);
    next[sourceStatus] = sourceList;

    const destList =
      sourceStatus === destStatus ? sourceList : Array.from(next[destStatus]);
    destList.splice(destination.index, 0, { ...moved, status: destStatus });
    next[destStatus] = destList;

    commit(STATUS_COLUMNS.flatMap((c) => next[c.id]));

    if (sourceStatus !== destStatus) {
      onTaskStatusChange?.(moved.id, destStatus, sourceStatus);
    }
  }

  function startAdding(status: TaskStatus) {
    setAddingToStatus(status);
    setNewTitle("");
  }

  function cancelAdding() {
    setAddingToStatus(null);
    setNewTitle("");
  }

  function submitNewTask(status: TaskStatus) {
    const title = newTitle.trim();
    if (!title) {
      cancelAdding();
      return;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      project: "Unassigned",
      assignee: "Unassigned",
      status,
      dueDate: isoToday(),
    };
    commit([...tasks, task]);
    cancelAdding();
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex w-full min-w-0 max-w-full gap-4 overflow-x-auto p-2 pb-4">
        {STATUS_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex min-w-[260px] flex-1 flex-col rounded-xl border border-border/60 bg-muted/30 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: STATUS_LLT_COLORS[col.id].bg }}
                >
                  <col.icon
                    className="h-3.5 w-3.5"
                    style={{ color: STATUS_LLT_COLORS[col.id].fg }}
                  />
                </div>
                <span className="truncate text-sm font-semibold">
                  {col.label}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 text-xs font-normal"
              >
                {grouped[col.id].length}
              </Badge>
            </div>

            {/* The Droppable element itself is the scroll container so
                @hello-pangea/dnd can auto-scroll it while dragging. */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex max-h-[55vh] min-h-[80px] flex-col gap-2 overflow-y-auto rounded-lg p-1.5 pr-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-primary/5" : ""
                  }`}
                >
                  {grouped[col.id].map((task, index) => (
                    <Draggable
                      draggableId={task.id}
                      index={index}
                      key={task.id}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`rounded-lg border border-border/60 bg-background p-3 shadow-sm ${
                            dragSnapshot.isDragging
                              ? "shadow-md ring-1 ring-primary/40"
                              : ""
                          }`}
                        >
                          <p className="mb-2 text-sm font-medium leading-snug">
                            {task.title}
                          </p>
                          <div className="mb-2">
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {task.project}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {initials(task.assignee)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {task.assignee}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatShortDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {grouped[col.id].length === 0 &&
                    addingToStatus !== col.id && (
                      <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        No tasks
                      </p>
                    )}
                </div>
              )}
            </Droppable>

            {/* Add-task controls sit outside the scroll area so they stay visible */}
            <div className="mt-2 px-1.5">
              {addingToStatus === col.id ? (
                <div className="flex flex-col gap-1.5">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitNewTask(col.id);
                      if (e.key === "Escape") cancelAdding();
                    }}
                    placeholder="Task title"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={() => submitNewTask(col.id)}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={cancelAdding}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startAdding(col.id)}
                  className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
