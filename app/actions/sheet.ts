"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectSheetName } from "@/lib/sheet-naming";
import { getSession } from "@/lib/auth";

export type SavedColumn = { id: string; title: string; width?: number };
export type SavedRow = Record<string, string>;
export type SheetTab = { id: string; name: string; projectId: string | null };

const SHEETS_PATH = "/sheets";

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

export async function saveSheet(
  sheetId: string,
  columns: SavedColumn[],
  rows: SavedRow[],
): Promise<void> {
  await assertSheetAccess(sheetId);

  await db.sheet.upsert({
    where: { id: sheetId },
    update: { columns, rows },
    create: { id: sheetId, columns, rows },
  });
}

// ---- Tab management ----

// Unrestricted — kept for internal callers (e.g. project.ts's
// createSheetForProject/renameSheetForProject) that need the full list
// regardless of who's asking. Do NOT use this to render tabs to a user;
// use listSheetsForCurrentUser for that.
export async function listSheets(): Promise<SheetTab[]> {
  return db.sheet.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });
}

// UNIT_MANAGER sees every tab. ENGAGEMENT_MANAGER and CONSULTANT only see
// tabs for projects they're assigned to, plus any tab that isn't tied to
// a project at all (manually-created sheets have projectId: null and
// aren't gated behind a project assignment).
export async function listSheetsForCurrentUser(): Promise<SheetTab[]> {
  const session = await getSession();
  const userId = session?.userId as string | undefined;
  if (!userId) return [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return [];

  if (user.role === "UNIT_MANAGER") {
    return listSheets();
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
      OR: [{ projectId: null }, { projectId: { in: assignedProjectIds } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });
}

// Idempotent: guarantees at least one sheet exists without ever creating
// two, even if called concurrently (e.g. dev-mode double-render, or a
// race between a client redirect and a server re-render). Use this
// instead of "if (tabs.length === 0) createSheet(...)" anywhere.
//
// NOTE: this looks at ALL sheets system-wide, not just ones visible to
// the current user. If it returns an existing sheet, check its
// projectId before redirecting into it for a non-UNIT_MANAGER — see
// app/(protected)/sheets/page.tsx for the pattern.
export async function ensureDefaultSheet() {
  return db.$transaction(async (tx) => {
    const first = await tx.sheet.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, projectId: true },
    });
    if (first) return first;

    return tx.sheet.create({
      data: { name: "Sheet 1", columns: [], rows: [] },
      select: { id: true, name: true, projectId: true },
    });
  });
}

export async function createSheet(name?: string) {
  const sheet = await db.sheet.create({
    data: {
      name: name?.trim() || "Untitled Sheet",
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
}

// ---- Project-linked sheet lifecycle (called from actions/project.ts) ----

// One sheet per project, named "FiAv-{project name}". If one already
// exists for this project (shouldn't normally happen), return it as-is
// rather than creating a duplicate.
export async function createSheetForProject(
  projectId: string,
  projectName: string,
) {
  const existing = await db.sheet.findUnique({ where: { projectId } });
  if (existing) return existing;

  const sheet = await db.sheet.create({
    data: {
      name: projectSheetName(projectName),
      columns: [],
      rows: [],
      projectId,
    },
  });
  revalidatePath(SHEETS_PATH);
  return sheet;
}

export async function renameSheetForProject(
  projectId: string,
  newProjectName: string,
) {
  await db.sheet.updateMany({
    where: { projectId },
    data: { name: projectSheetName(newProjectName) },
  });
  revalidatePath(SHEETS_PATH);
}
