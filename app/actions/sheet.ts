"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectSheetName } from "@/lib/sheet-naming";
import { getSession } from "@/lib/auth";
import type { TaskStatus, SheetKind } from "@/app/generated/prisma/enums";

export type SavedColumn = { id: string; title: string; width?: number };
export type SavedRow = Record<string, string>;
export type SheetTab = { id: string; name: string; projectId: string | null };

const SHEETS_PATH = "/sheets";
const ITS_PATH = "/its";
const IQA_PATH = "/iqa";
const TASKS_PATH = "/tasks";

async function requireCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("You must be signed in to do this.");
  }
  return session.userId as string;
}

// Throws if the current user isn't allowed to read/write this sheet:
// UNIT_MANAGER can access any sheet. ENGAGEMENT_MANAGER/CONSULTANT can
// only access sheets that aren't tied to a project (projectId: null) or
// that belong to a project they're assigned to.
async function assertSheetAccess(sheetId: string): Promise<void> {
  const userId = await requireCurrentUserId();

  const [user, sheet] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    db.sheet.findUnique({
      where: { id: sheetId },
      select: { projectId: true },
    }),
  ]);

  if (!sheet) return; // let the caller's own not-found handling apply
  if (!user) throw new Error("User not found.");
  if (user.role === "UNIT_MANAGER") return;
  if (sheet.projectId === null) return;

  const assignment = await db.assignment.findUnique({
    where: { userId_projectId: { userId, projectId: sheet.projectId } },
  });
  if (!assignment) {
    throw new Error("You don't have access to this sheet.");
  }
}

export async function loadSheet(
  sheetId: string,
): Promise<{ columns: SavedColumn[]; rows: SavedRow[] } | null> {
  await assertSheetAccess(sheetId);

  const sheet = await db.sheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return null;
  return {
    columns: (sheet.columns as SavedColumn[]) ?? [],
    rows: (sheet.rows as SavedRow[]) ?? [],
  };
}

// ---- Sheet -> Task sync -------------------------------------------------
//
// A sheet row is matched to a Task by row.__rowId (a stable id generated
// client-side in sheet-table.tsx, see ROW_ID_KEY there) rather than
// functionName — functionName is free-text and can repeat within a
// single project, which broke upserting by name. Task.sheetRowId is
// unique per project (see @@unique([projectId, sheetRowId]) in
// schema.prisma) so this upsert is safe even with duplicate function
// names. Rows without an id yet (only possible from an older/unsynced
// client) are skipped rather than guessed at.
const ROW_ID_KEY = "__rowId";

// Sheet status values (STATUS_LLT_OPTIONS in status-llt-cell.tsx) mapped
// to the TaskStatus enum. "Out of scop" is a known typo already present
// in seeded/legacy data — mapped the same as the corrected spelling.
const SHEET_STATUS_TO_TASK_STATUS: Record<string, TaskStatus> = {
  "In progress": "IN_PROGRESS",
  "Ready for dry run": "READY_FOR_DRY_RUN",
  "Dry run in progress": "DRY_RUN_IN_PROGRESS",
  "Ready for TC": "READY_FOR_TC",
  "TC Done": "TC_DONE",
  "TC Correction": "TC_CORRECTION",
  "Ready for QC": "READY_FOR_QC",
  "Ready for Delivery": "READY_FOR_DELIVERY",
  Delivered: "DELIVERED",
  "Out of scop": "OUT_OF_SCOPE",
  "Out of scope": "OUT_OF_SCOPE",
  Blocked: "BLOCKED",
};

function parseComplexity(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

// estimationDays (sheet-table.tsx) -> Task.estimatedDays. Float, unlike
// complexity, since estimates are commonly fractional (e.g. "1.5" days).
function parseEstimatedDays(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

async function syncSheetRowsToTasks(
  projectId: string,
  rows: SavedRow[],
): Promise<void> {
  const rowsWithId = rows
    .map((row) => ({ row, rowId: row[ROW_ID_KEY]?.trim() }))
    .filter((r): r is { row: SavedRow; rowId: string } => !!r.rowId);

  if (rowsWithId.length === 0) return;

  // Batch-resolve every distinct author name in this sheet in one query,
  // instead of querying per row per column.
  const authorNames = new Set<string>();
  for (const { row } of rowsWithId) {
    if (row.authorLLR?.trim()) authorNames.add(row.authorLLR.trim());
    if (row.authorLLT?.trim()) authorNames.add(row.authorLLT.trim());
  }

  const users = authorNames.size
    ? await db.user.findMany({
        where: { name: { in: [...authorNames] } },
        select: { id: true, name: true },
      })
    : [];
  const userIdByName = new Map<string, string>();
  for (const u of users) {
    userIdByName.set(u.name, u.id);
    userIdByName.set(u.name.toLowerCase(), u.id);
  }
  const resolveUserId = (name: string | undefined): string | null => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    return (
      userIdByName.get(trimmed) ??
      userIdByName.get(trimmed.toLowerCase()) ??
      null
    );
  };

  await db.$transaction(
    rowsWithId.map(({ row, rowId }) => {
      const functionName = row.functionName?.trim() || null;
      const status = row.statusLLTDate
        ? SHEET_STATUS_TO_TASK_STATUS[row.statusLLTDate.trim()]
        : undefined;

      return db.task.upsert({
        where: {
          projectId_sheetRowId: { projectId, sheetRowId: rowId },
        },
        update: {
          functionName,
          llrId: row.llrId || null,
          fileC: row.fileC || null,
          codeVersion: row.codeVersion || null,
          complexity: parseComplexity(row.complexity),
          estimatedDays: parseEstimatedDays(row.estimationDays),
          its: row.its || null,
          iqa: row.iqa || null,
          assigneeLLRId: resolveUserId(row.authorLLR),
          assigneeLLTId: resolveUserId(row.authorLLT),
          // Only overwrite status if the sheet's value maps to a known
          // enum member — an unrecognized/free-typed status string
          // leaves the Task's existing status untouched.
          ...(status ? { status } : {}),
        },
        create: {
          title: functionName || `Row ${rowId.slice(0, 8)}`,
          projectId,
          sheetRowId: rowId,
          functionName,
          llrId: row.llrId || null,
          fileC: row.fileC || null,
          codeVersion: row.codeVersion || null,
          complexity: parseComplexity(row.complexity),
          estimatedDays: parseEstimatedDays(row.estimationDays),
          its: row.its || null,
          iqa: row.iqa || null,
          assigneeLLRId: resolveUserId(row.authorLLR),
          assigneeLLTId: resolveUserId(row.authorLLT),
          ...(status ? { status } : {}),
        },
      });
    }),
  );

  revalidatePath(TASKS_PATH);
}

export async function saveSheet(
  sheetId: string,
  columns: SavedColumn[],
  rows: SavedRow[],
): Promise<void> {
  await assertSheetAccess(sheetId);

  const sheet = await db.sheet.upsert({
    where: { id: sheetId },
    update: { columns, rows },
    create: { id: sheetId, columns, rows },
    select: { projectId: true },
  });

  // Only project-linked sheets drive Task rows — a standalone sheet
  // (projectId: null) has no Project to attach Tasks to.
  if (sheet.projectId) {
    await syncSheetRowsToTasks(sheet.projectId, rows);
  }
}

// ---- Task -> Sheet status sync ------------------------------------------
//
// The reverse of SHEET_STATUS_TO_TASK_STATUS. Task.status can now also
// change outside the sheet (Kanban drag-and-drop — see
// actions/tasks.ts's updateTaskStatus). Without writing that change back
// into the row's statusLLTDate cell, the next saveSheet() call would read
// the still-stale cell and silently flip Task.status back via
// syncSheetRowsToTasks above. "Out of scope" is written with the
// corrected spelling even though the legacy typo is still accepted on
// the way in.
const TASK_STATUS_TO_SHEET_STATUS: Record<TaskStatus, string> = {
  IN_PROGRESS: "In progress",
  READY_FOR_DRY_RUN: "Ready for dry run",
  DRY_RUN_IN_PROGRESS: "Dry run in progress",
  READY_FOR_TC: "Ready for TC",
  TC_DONE: "TC Done",
  TC_CORRECTION: "TC Correction",
  READY_FOR_QC: "Ready for QC",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  OUT_OF_SCOPE: "Out of scope",
  BLOCKED: "Blocked",
};

// Called right after a Task's status changes from outside the sheet.
// A no-op when the task has no sheetRowId (created straight from the
// Kanban's "Add task", never tied to a sheet row) or its project has no
// Progress sheet — nothing to keep in sync in either case.
export async function syncTaskStatusToSheetRow(
  projectId: string,
  sheetRowId: string | null,
  status: TaskStatus,
): Promise<void> {
  if (!sheetRowId) return;

  const sheet = await db.sheet.findUnique({
    where: { projectId_kind: { projectId, kind: "PROGRESS" } },
    select: { id: true, rows: true },
  });
  if (!sheet) return;

  const sheetStatus = TASK_STATUS_TO_SHEET_STATUS[status];
  const rows = (sheet.rows as SavedRow[]) ?? [];

  let changed = false;
  const nextRows = rows.map((row) => {
    if (row[ROW_ID_KEY] !== sheetRowId || row.statusLLTDate === sheetStatus) {
      return row;
    }
    changed = true;
    return { ...row, statusLLTDate: sheetStatus };
  });

  if (!changed) return;

  await db.sheet.update({ where: { id: sheet.id }, data: { rows: nextRows } });
  revalidatePath(SHEETS_PATH);
}

// ---- Tab management ----

// Unrestricted — kept for internal callers (e.g. project.ts's
// createSheetForProject/renameSheetForProject) that need the full list
// regardless of who's asking. Do NOT use this to render tabs to a user;
// use listSheetsForCurrentUser for that.
//
// `kind` keeps the Progress Sheet's tabs, the ITS sheet's tabs
// (app/actions/its-sheet.ts), and the IQA sheet's tabs
// (app/actions/iqa-sheet.ts) from ever appearing in the same tab bar,
// even though all three live in this one table. Defaults to PROGRESS so
// every existing caller keeps working unchanged.
export async function listSheets(
  kind: SheetKind = "PROGRESS",
): Promise<SheetTab[]> {
  return db.sheet.findMany({
    where: { kind },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });
}

// UNIT_MANAGER sees every tab. ENGAGEMENT_MANAGER and CONSULTANT only see
// tabs for projects they're assigned to, plus any tab that isn't tied to
// a project at all (manually-created sheets have projectId: null and
// aren't gated behind a project assignment).
export async function listSheetsForCurrentUser(
  kind: SheetKind = "PROGRESS",
): Promise<SheetTab[]> {
  const session = await getSession();
  const userId = session?.userId as string | undefined;
  if (!userId) return [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return [];

  if (user.role === "UNIT_MANAGER") {
    return listSheets(kind);
  }

  const assignments = await db.assignment.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const assignedProjectIds = assignments
    .map((a) => a.projectId)
    .filter((id): id is string => !!id);

  return db.sheet.findMany({
    where: {
      kind,
      OR: [{ projectId: null }, { projectId: { in: assignedProjectIds } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });
}

// Default names for a brand-new, never-renamed sheet, per kind. Centralized
// here instead of inline ternaries so adding a future kind means adding
// one line, not hunting down every branch.
const DEFAULT_FIRST_SHEET_NAME: Record<SheetKind, string> = {
  PROGRESS: "Sheet 1",
  ITS: "ITS 1",
  IQA: "IQA 1",
};
const DEFAULT_UNTITLED_SHEET_NAME: Record<SheetKind, string> = {
  PROGRESS: "Untitled Sheet",
  ITS: "Untitled ITS Sheet",
  IQA: "Untitled IQA Sheet",
};

// Idempotent: guarantees at least one sheet of the given kind exists
// without ever creating two, even if called concurrently (e.g. dev-mode
// double-render, or a race between a client redirect and a server
// re-render). Use this instead of "if (tabs.length === 0)
// createSheet(...)" anywhere.
//
// NOTE: this looks at ALL sheets of this kind system-wide, not just ones
// visible to the current user. If it returns an existing sheet, check
// its projectId before redirecting into it for a non-UNIT_MANAGER — see
// app/(protected)/sheets/page.tsx (or its ITS/IQA equivalents) for the
// pattern.
export async function ensureDefaultSheet(kind: SheetKind = "PROGRESS") {
  return db.$transaction(async (tx) => {
    const first = await tx.sheet.findFirst({
      where: { kind },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, projectId: true },
    });
    if (first) return first;

    return tx.sheet.create({
      data: {
        name: DEFAULT_FIRST_SHEET_NAME[kind],
        kind,
        columns: [],
        rows: [],
      },
      select: { id: true, name: true, projectId: true },
    });
  });
}

export async function createSheet(name?: string, kind: SheetKind = "PROGRESS") {
  const sheet = await db.sheet.create({
    data: {
      name: name?.trim() || DEFAULT_UNTITLED_SHEET_NAME[kind],
      kind,
      columns: [],
      rows: [],
    },
  });
  return { id: sheet.id, name: sheet.name, projectId: sheet.projectId };
}

export async function renameSheet(sheetId: string, name: string) {
  await assertSheetAccess(sheetId);

  const sheet = await db.sheet.findUnique({
    where: { id: sheetId },
    select: { projectId: true },
  });
  if (sheet?.projectId) {
    throw new Error(
      "This sheet's name is derived from its project. Rename the project instead.",
    );
  }
  await db.sheet.update({
    where: { id: sheetId },
    data: { name: name.trim() || "Untitled Sheet" },
  });
  revalidatePath(SHEETS_PATH);
  revalidatePath(ITS_PATH);
  revalidatePath(IQA_PATH);
}

// A project's sheet can only be deleted once it's no longer linked to a
// project (projectId null — either never linked, or the project was
// deleted and the FK was SetNull'd). Enforced here so it can't be
// bypassed by calling the action directly, not just via a disabled button.
export async function deleteSheet(sheetId: string) {
  await assertSheetAccess(sheetId);

  const sheet = await db.sheet.findUnique({
    where: { id: sheetId },
    select: { projectId: true },
  });
  if (!sheet) return;

  if (sheet.projectId !== null) {
    throw new Error(
      "This sheet is linked to an active project and can't be deleted. " +
        "Delete the project first.",
    );
  }

  await db.sheet.delete({ where: { id: sheetId } });
  revalidatePath(SHEETS_PATH);
  revalidatePath(ITS_PATH);
  revalidatePath(IQA_PATH);
}

// ---- Project-linked sheet lifecycle (called from actions/project.ts) ----

// lib/sheet-naming.ts only has a Progress-sheet convention today
// ("FiAv-{project name}"). Deriving the ITS/IQA names from it keeps all
// three obviously paired without needing separate naming conventions
// there. Centralized here (not inline ternaries) so a future kind is one
// line, not a hunt through every call site.
const PROJECT_SHEET_NAME_BY_KIND: Record<
  SheetKind,
  (projectName: string) => string
> = {
  PROGRESS: (name) => projectSheetName(name),
  ITS: (name) => `${projectSheetName(name)} — ITS`,
  IQA: (name) => `${projectSheetName(name)} — IQA`,
};

const REVALIDATE_PATH_BY_KIND: Record<SheetKind, string> = {
  PROGRESS: SHEETS_PATH,
  ITS: ITS_PATH,
  IQA: IQA_PATH,
};

async function createProjectSheetOfKind(
  projectId: string,
  projectName: string,
  kind: SheetKind,
) {
  const existing = await db.sheet.findUnique({
    where: { projectId_kind: { projectId, kind } },
  });
  if (existing) return existing;

  return db.sheet.create({
    data: {
      name: PROJECT_SHEET_NAME_BY_KIND[kind](projectName),
      kind,
      columns: [],
      rows: [],
      projectId,
    },
  });
}

// The project's Progress sheet. If one already exists for this project
// (shouldn't normally happen), returns it as-is rather than creating a
// duplicate.
export async function createSheetForProject(
  projectId: string,
  projectName: string,
) {
  const sheet = await createProjectSheetOfKind(
    projectId,
    projectName,
    "PROGRESS",
  );
  revalidatePath(SHEETS_PATH);
  return sheet;
}

// The project's ITS sheet — same idempotency guarantee as
// createSheetForProject, just for the other kind.
export async function createItsSheetForProject(
  projectId: string,
  projectName: string,
) {
  const sheet = await createProjectSheetOfKind(projectId, projectName, "ITS");
  revalidatePath(ITS_PATH);
  return sheet;
}

// The project's IQA sheet — same idempotency guarantee, third kind.
export async function createIqaSheetForProject(
  projectId: string,
  projectName: string,
) {
  const sheet = await createProjectSheetOfKind(projectId, projectName, "IQA");
  revalidatePath(IQA_PATH);
  return sheet;
}

// Called from actions/project.ts's createProject: every new project gets
// a Progress sheet, an ITS sheet, and an IQA sheet, the same way it
// always got a Progress sheet before ITS/IQA existed.
export async function createSheetsForProject(
  projectId: string,
  projectName: string,
) {
  const [progress, its, iqa] = await Promise.all([
    createSheetForProject(projectId, projectName),
    createItsSheetForProject(projectId, projectName),
    createIqaSheetForProject(projectId, projectName),
  ]);
  return { progress, its, iqa };
}

export async function renameSheetForProject(
  projectId: string,
  newProjectName: string,
) {
  const kinds: SheetKind[] = ["PROGRESS", "ITS", "IQA"];
  await Promise.all(
    kinds.map((kind) =>
      db.sheet.updateMany({
        where: { projectId, kind },
        data: { name: PROJECT_SHEET_NAME_BY_KIND[kind](newProjectName) },
      }),
    ),
  );
  kinds.forEach((kind) => revalidatePath(REVALIDATE_PATH_BY_KIND[kind]));
}
