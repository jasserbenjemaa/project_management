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
