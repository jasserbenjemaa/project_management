import type { GridColumn } from "@glideapps/glide-data-grid";
import { PRIORITY_COL_ID } from "./priority-cell";
import { ITS_STATUS_COL_ID } from "./its-status-cell";

// Default columns for a brand-new ITS (issue tracking) sheet — pass this
// as SheetTable's `defaultColumns` prop from the ITS page, the same way
// the Progress Sheet page relies on SheetTable's built-in default.
// Column ids are what gets persisted in Sheet.columns and what
// getCellContent/onCellEdited key off of, so keep them stable once rows
// exist — renaming an id here later would orphan any already-saved data
// under the old id.
//
// "itsAuthorLLT"/"itsAuthorLLR" (not just "llt"/"llr") is deliberate —
// those ids are registered in sheet-table.tsx's AUTHOR_COL_ARTIFACT_TYPE
// map, which is what gives these two columns the same searchable
// author-suggest dropdown the Progress sheet's Author LLR/LLT columns
// have, scoped to consultants assigned to this sheet's project.
export const ITS_DEFAULT_COLUMNS: GridColumn[] = [
  { title: "N°ITS", id: "itsNumber", width: 100 },
  { title: "Opening date", id: "openingDate", width: 130 },
  { title: "Priority", id: PRIORITY_COL_ID, width: 100 },
  { title: "Batch", id: "batch", width: 100 },
  { title: "Component", id: "component", width: 140 },
  { title: "Requirement", id: "requirement", width: 140 },
  { title: "ITS description", id: "itsDescription", width: 240 },
  { title: "LLR/LLT answer - discussion", id: "answerDiscussion", width: 240 },
  { title: "LLT", id: "itsAuthorLLT", width: 120 },
  { title: "LLR", id: "itsAuthorLLR", width: 120 },
  { title: "Status", id: ITS_STATUS_COL_ID, width: 120 },
];
