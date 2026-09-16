"use server";

// Thin, kind-scoped wrappers around app/actions/sheet.ts so the ITS page
// never has to pass a `kind` argument around itself (and can't
// accidentally forget to). All the actual access-control and DB logic
// stays in sheet.ts — this file only fixes `kind` to "ITS".
//
// renameSheet/deleteSheet/loadSheet/saveSheet are kind-agnostic (they
// operate on a specific sheetId that's already tied to a fixed kind at
// creation time), so the ITS page can import and use those directly from
// "@/app/actions/sheet" — no wrapper needed for them.
import {
  listSheetsForCurrentUser,
  ensureDefaultSheet,
  createSheet,
  type SheetTab,
} from "./sheet";

const ITS_KIND = "ITS" as const;

export async function listItsSheetsForCurrentUser(): Promise<SheetTab[]> {
  return listSheetsForCurrentUser(ITS_KIND);
}

export async function ensureDefaultItsSheet() {
  return ensureDefaultSheet(ITS_KIND);
}

export async function createItsSheet(name?: string) {
  return createSheet(name, ITS_KIND);
}
