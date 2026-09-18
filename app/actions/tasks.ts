"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { syncTaskStatusToSheetRow } from "./sheet";
import type { Task, TaskStatus } from "@/features/components/data-kanban";

async function requireCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("You must be signed in to do this.");
  }
  return session.userId as string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Task has no dueDate column — the calendar date is computed as
// createdAt + estimatedDays. Tasks with no estimate yet just land on
// their createdAt date rather than being pushed out arbitrarily.
function computeDueDate(createdAt: Date, estimatedDays: number | null): string {
  if (!estimatedDays) return toIsoDate(createdAt);
  const due = new Date(createdAt);
  due.setDate(due.getDate() + Math.round(estimatedDays));
  return toIsoDate(due);
}

const taskSelect = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  estimatedDays: true,
  project: { select: { name: true } },
  assigneeLLR: { select: { name: true } },
  assigneeLLT: { select: { name: true } },
} as const;

type RawTask = {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: Date;
  estimatedDays: number | null;
  project: { name: string } | null;
  assigneeLLR: { name: string } | null;
  assigneeLLT: { name: string } | null;
};

function toTask(t: RawTask): Task {
  return {
    id: t.id,
    title: t.title,
    project: t.project?.name ?? "Unassigned",
    // LLT is the later pass in the pipeline, so prefer it as the
    // display assignee when both are set; fall back to the LLR author.
    assignee: t.assigneeLLT?.name ?? t.assigneeLLR?.name ?? "Unassigned",
    status: t.status,
    dueDate: computeDueDate(t.createdAt, t.estimatedDays),
  };
}

// Scopes visible tasks the same way sheet access is scoped (see
// assertSheetAccess in actions/sheet.ts):
//   - UNIT_MANAGER        -> every task, system-wide.
//   - ENGAGEMENT_MANAGER  -> every task on any project they're assigned
//     to (any assignee) — they own project delivery as a whole, not a
//     personal task queue (same reasoning as getEngagementManagersOverview
//     in actions/stats.ts).
//   - everyone else (CONSULTANT) -> only tasks assigned to them
//     personally, as either the LLR or LLT assignee.
export async function getTasksForCurrentUser(): Promise<Task[]> {
  const userId = await requireCurrentUserId();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) throw new Error("User not found.");

  let rows: RawTask[];

  if (user.role === "UNIT_MANAGER") {
    rows = await db.task.findMany({ select: taskSelect });
  } else if (user.role === "ENGAGEMENT_MANAGER") {
    const assignments = await db.assignment.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = [
      ...new Set(
        assignments.map((a) => a.projectId).filter((id): id is string => !!id),
      ),
    ];
    rows = projectIds.length
      ? await db.task.findMany({
          where: { projectId: { in: projectIds } },
          select: taskSelect,
        })
      : [];
  } else {
    rows = await db.task.findMany({
      where: { OR: [{ assigneeLLRId: userId }, { assigneeLLTId: userId }] },
      select: taskSelect,
    });
  }

  return rows.map(toTask);
}

// Same access rule as reads, just phrased as a permission check on one
// task: UNIT_MANAGER can move any task; ENGAGEMENT_MANAGER can move any
// task on a project they're assigned to; anyone else can only move a
// task they're personally assigned to (as LLR or LLT).
async function assertTaskAccess(
  userId: string,
  role: string,
  task: {
    projectId: string;
    assigneeLLRId: string | null;
    assigneeLLTId: string | null;
  },
): Promise<void> {
  if (role === "UNIT_MANAGER") return;

  if (role === "ENGAGEMENT_MANAGER") {
    const assignment = await db.assignment.findUnique({
      where: { userId_projectId: { userId, projectId: task.projectId } },
    });
    if (!assignment) throw new Error("You don't have access to this task.");
    return;
  }

  if (task.assigneeLLRId !== userId && task.assigneeLLTId !== userId) {
    throw new Error("You don't have access to this task.");
  }
}

// Persists a Kanban drag: moving a card to a new column updates
// Task.status. Called from the client right after the optimistic local
// state update in features/components/task-board.tsx, so on failure the
// caller reverts that one task's status back to `previousStatus` — this
// action doesn't need to return the reverted value itself.
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userId = await requireCurrentUserId();

    const [user, task] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { role: true } }),
      db.task.findUnique({
        where: { id: taskId },
        select: {
          projectId: true,
          sheetRowId: true,
          assigneeLLRId: true,
          assigneeLLTId: true,
        },
      }),
    ]);
    if (!user) return { success: false, error: "User not found." };
    if (!task) return { success: false, error: "Task not found." };

    await assertTaskAccess(userId, user.role, task);
    await db.task.update({ where: { id: taskId }, data: { status } });

    // Keep the sheet's own status cell in sync so a later saveSheet()
    // doesn't read the stale cell and flip this right back — see
    // syncTaskStatusToSheetRow in sheet.ts.
    await syncTaskStatusToSheetRow(task.projectId, task.sheetRowId, status);

    // Adjust to match wherever your task board route actually lives
    // (the error trace you shared showed app/(dashboard)/personal-sheet).
    revalidatePath("/personal-sheet");
    return { success: true };
  } catch (error) {
    console.error("Failed to update task status", error);
    const message =
      error instanceof Error ? error.message : "Failed to update task status.";
    return { success: false, error: message };
  }
}
