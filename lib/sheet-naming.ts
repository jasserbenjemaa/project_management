// lib/sheet-naming.ts
// Plain helper, NOT a server action file — needed because a "use server"
// file can only export async functions, and this is a sync string helper
// used by both app/actions/sheet.ts and app/actions/project.ts.

const SHEET_NAME_PREFIX = "FiAv-";

export function projectSheetName(projectName: string): string {
  return `${SHEET_NAME_PREFIX}${projectName}`;
}
