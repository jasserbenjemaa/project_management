import type { GridColumn } from "@glideapps/glide-data-grid";
import { PRIORITY_COL_ID } from "./priority-cell";
import { LEVEL_COL_ID } from "./level-cell";
import { ORIGIN_COL_ID } from "./origin-cell";
import { IQA_STATUS_COL_ID } from "./iqa-status-cell";

// Default columns for a brand-new IQA sheet — pass this as SheetTable's
// `defaultColumns` prop from the IQA page, the same way the ITS page
// uses ITS_DEFAULT_COLUMNS. See its-columns.ts for the general pattern
// and the note on why column ids matter once rows exist.
//
// Priority reuses the same High/Medium/Low select as the ITS sheet
// (PRIORITY_COL_ID) — the spec you gave didn't list explicit values for
// this column, so this assumes it's the same three-level scale already
// established for ITS rather than introducing a fourth, differently-named
// priority scale. Easy to change if that's wrong: swap PRIORITY_COL_ID
// for a plain string id here and it becomes a plain text column instead.
export const IQA_DEFAULT_COLUMNS: GridColumn[] = [
  { title: "N°IQA", id: "iqaNumber", width: 100 },
  { title: "Opening date", id: "openingDate", width: 130 },
  { title: "Priority", id: PRIORITY_COL_ID, width: 100 },
  { title: "Level", id: LEVEL_COL_ID, width: 130 },
  { title: "Origin", id: ORIGIN_COL_ID, width: 110 },
  { title: "Component", id: "component", width: 140 },
  { title: "Requirement", id: "requirement", width: 140 },
  { title: "Discussion", id: "discussion", width: 220 },
  {
    title: "Customer answer - discussion",
    id: "customerAnswerDiscussion",
    width: 240,
  },
  { title: "Customer", id: "customer", width: 140 },
  { title: "CAP", id: "cap", width: 120 },
  { title: "Status", id: IQA_STATUS_COL_ID, width: 150 },
  { title: "CR NBR", id: "crNumber", width: 110 },
];
