// app/actions/sheet.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectSheetName } from "@/lib/sheet-naming";

export type SavedColumn = { id: string; title: string; width?: number };
export type SavedRow = Record<string, string>;

const SHEETS_PATH = "/sheets";

export async function loadSheet(
  sheetId: string,
): Promise<{ columns: SavedColumn[]; rows: SavedRow[] } | null> {
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
  await db.sheet.upsert({
    where: { id: sheetId },
    update: { columns, rows },
    create: { id: sheetId, columns, rows },
  });
}

// ---- Tab management ----

// projectId is null for manually-created sheets, set for the one sheet
// that belongs to a project. The client uses this to lock rename/delete.
export async function listSheets() {
  return db.sheet.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });
}

// Idempotent: guarantees at least one sheet exists without ever creating
// two, even if called concurrently (e.g. dev-mode double-render, or a
// race between a client redirect and a server re-render). Use this
// instead of "if (tabs.length === 0) createSheet(...)" anywhere.
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
