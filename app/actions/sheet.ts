// app/actions/sheet.ts
"use server";
import { db } from "@/lib/db";

export type SavedColumn = { id: string; title: string; width?: number };
export type SavedRow = Record<string, string>;

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

// ---- New: tab management ----

export async function listSheets() {
  return db.sheet.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
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
  return { id: sheet.id, name: sheet.name };
}

export async function renameSheet(sheetId: string, name: string) {
  await db.sheet.update({
    where: { id: sheetId },
    data: { name: name.trim() || "Untitled Sheet" },
  });
}

export async function deleteSheet(sheetId: string) {
  await db.sheet.delete({ where: { id: sheetId } });
}
