"use server";

// Thin, kind-scoped wrappers around app/actions/sheet.ts — see
// its-sheet.ts for the same pattern applied to ITS. All the actual
// access-control and DB logic stays in sheet.ts.
import {
  listSheetsForCurrentUser,
  ensureDefaultSheet,
  createSheet,
  type SheetTab,
} from "./sheet";

const IQA_KIND = "IQA" as const;

export async function listIqaSheetsForCurrentUser(): Promise<SheetTab[]> {
  return listSheetsForCurrentUser(IQA_KIND);
}

export async function ensureDefaultIqaSheet() {
  return ensureDefaultSheet(IQA_KIND);
}

export async function createIqaSheet(name?: string) {
  return createSheet(name, IQA_KIND);
}
