"use client";

import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  EditableGridCell,
  GridSelection,
  CompactSelection,
  CustomCell,
  CustomRenderer,
  getMiddleCenterBias,
  DrawArgs,
  Rectangle,
  DataEditorRef,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

// Adjust these import paths to wherever you put the action files.
import { loadSheet, saveSheet } from "@/app/actions/sheet";
import { getUserSuggestions, type UserSuggestion } from "@/app/actions/users";
import {
  STATUS_LLT_COL_ID,
  statusLLTCellRenderer,
  type StatusLLTCell,
  type StatusLLTCellProps,
} from "./status-llt-cell";
import {
  FORMAT_CHECKED_COL_IDS,
  formatCheckedCellRenderer,
  type FormatCheckedCell,
  type FormatCheckedCellProps,
} from "./format-checked-cell";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
// ---- Types ----
type RowData = Record<string, string>;

const TEST_STATUS_COL_ID = "testStatus";
const TEST_STATUS_OPTIONS = ["OK", "KO"] as const;
type TestStatusValue = "" | (typeof TEST_STATUS_OPTIONS)[number];

interface TestStatusCellProps {
  readonly kind: "test-status-cell";
  readonly value: TestStatusValue;
}
type TestStatusCell = CustomCell<TestStatusCellProps>;

const testStatusCellRenderer: CustomRenderer<TestStatusCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is TestStatusCell =>
    (cell.data as any)?.kind === "test-status-cell",
  draw: (args: DrawArgs<TestStatusCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { value } = cell.data;

    ctx.save();

    const pillHeight = 22;
    const pillY = rect.y + (rect.height - pillHeight) / 2;
    const pillX = rect.x + 8;
    const pillWidth = Math.min(rect.width - 16, 70);

    let bg = theme.bgCell;
    let fg = theme.textDark;
    let label = "Select…";

    if (value === "OK") {
      bg = "#dcfce7";
      fg = "#15803d";
      label = "OK";
    } else if (value === "KO") {
      bg = "#fee2e2";
      fg = "#b91c1c";
      label = "KO";
    }

    // pill background
    ctx.beginPath();
    const radius = pillHeight / 2;
    ctx.moveTo(pillX + radius, pillY);
    ctx.arcTo(
      pillX + pillWidth,
      pillY,
      pillX + pillWidth,
      pillY + pillHeight,
      radius,
    );
    ctx.arcTo(
      pillX + pillWidth,
      pillY + pillHeight,
      pillX,
      pillY + pillHeight,
      radius,
    );
    ctx.arcTo(pillX, pillY + pillHeight, pillX, pillY, radius);
    ctx.arcTo(pillX, pillY, pillX + pillWidth, pillY, radius);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();

    // pill label
    ctx.fillStyle = fg;
    ctx.font = `600 12px ${theme.fontFamily}`;
    ctx.textAlign = "center";
    const textY =
      pillY +
      pillHeight / 2 +
      getMiddleCenterBias(ctx, `600 12px ${theme.fontFamily}`);
    ctx.fillText(label, pillX + pillWidth / 2, textY);

    // little chevron to hint it's a dropdown
    const chevronX = pillX + pillWidth + 10;
    const chevronY = rect.y + rect.height / 2;
    ctx.strokeStyle = theme.textLight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chevronX - 4, chevronY - 2);
    ctx.lineTo(chevronX, chevronY + 2);
    ctx.lineTo(chevronX + 4, chevronY - 2);
    ctx.stroke();

    ctx.restore();
    return true;
  },
  provideEditor: () => ({
    editor: (p) => {
      const { value, onChange, onFinishedEditing } = p;
      const current = value.data.value;

      const choose = (next: TestStatusValue) => {
        const updated = { ...value, data: { ...value.data, value: next } };
        onChange(updated);
        onFinishedEditing(updated);
      };

      return (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 8,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {TEST_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(opt);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border:
                  current === opt ? "2px solid #111827" : "1px solid #e5e7eb",
                background: opt === "OK" ? "#dcfce7" : "#fee2e2",
                color: opt === "OK" ? "#15803d" : "#b91c1c",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              choose("");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "transparent",
              color: "#6b7280",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      );
    },
    disablePadding: true,
  }),
  onPaste: (val, cellData) => ({
    ...cellData,
    value: (val === "OK" || val === "KO" ? val : "") as TestStatusValue,
  }),
};

const AUTHOR_COL_ARTIFACT_TYPE: Record<string, string> = {
  authorLLR: "LLR",
  authorLLT: "LLT",
};

interface AuthorSuggestCellProps {
  readonly kind: "author-suggest-cell";
  readonly text: string;
  readonly suggestions: readonly string[];
}
type AuthorSuggestCell = CustomCell<AuthorSuggestCellProps>;

const authorSuggestCellRenderer: CustomRenderer<AuthorSuggestCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is AuthorSuggestCell =>
    (cell.data as any)?.kind === "author-suggest-cell",
  draw: (args: DrawArgs<AuthorSuggestCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { text } = cell.data;

    ctx.save();
    ctx.fillStyle = text ? theme.textDark : theme.textLight;
    ctx.font = `13px ${theme.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      text || "",
      rect.x + 8,
      rect.y + rect.height / 2,
      rect.width - 16,
    );
    ctx.restore();
    return true;
  },
  provideEditor: () => ({
    editor: (p) => {
      const { value, onChange, onFinishedEditing } = p;
      const { text: initialText, suggestions } = value.data;
      const [inputValue, setInputValue] = useState(initialText);
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, []);

      const filtered = useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        const pool = q
          ? suggestions.filter((name) => name.toLowerCase().includes(q))
          : suggestions;
        return pool.slice(0, 8);
      }, [inputValue, suggestions]);

      const commit = (finalText: string) => {
        const next = { ...value, data: { ...value.data, text: finalText } };
        onChange(next);
        onFinishedEditing(next);
      };

      return (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 220,
            overflow: "hidden",
          }}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange({
                ...value,
                data: { ...value.data, text: e.target.value },
              });
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              border: "none",
              outline: "none",
              fontSize: 13,
            }}
          />
          {filtered.length > 0 && (
            <div style={{ maxHeight: 176, overflowY: "auto" }}>
              {filtered.map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => commit(name)}
                  type="button"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    border: "none",
                    color: "#111827",
                    fontSize: 13,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    },
    disablePadding: true,
  }),
  onPaste: (val, cellData) => ({ ...cellData, text: val }),
};

// ---- Row-number column (Excel-style hidden-row indicator) ----
// The built-in glide-data-grid row marker only ever numbers rows 1..N in
// display order, so hiding rows 3-4 out of 1-5 would still show 1,2,3 for
// what's left — no sign anything is missing. Instead we render our own
// pinned "#" column showing each row's *real* index (so hiding 3-4 shows
// 1, 2, 5), plus a small double-line marker — the same affordance Excel
// and Google Sheets use — whenever rows are hidden directly above.
const ROW_NUMBER_COL_ID = "__rowNumber";
const ROW_NUMBER_COL_WIDTH = 52;

interface RowNumberCellProps {
  readonly kind: "row-number-cell";
  readonly rowNumber: number; // 1-based, real index into `data`
  readonly hiddenAboveCount: number; // hidden rows directly above this one
}
type RowNumberCell = CustomCell<RowNumberCellProps>;

const rowNumberCellRenderer: CustomRenderer<RowNumberCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is RowNumberCell =>
    (cell.data as any)?.kind === "row-number-cell",
  draw: (args: DrawArgs<RowNumberCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { rowNumber, hiddenAboveCount } = cell.data;

    ctx.save();

    if (hiddenAboveCount > 0) {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rect.x + 4, rect.y + 2);
      ctx.lineTo(rect.x + rect.width - 4, rect.y + 2);
      ctx.moveTo(rect.x + 4, rect.y + 5);
      ctx.lineTo(rect.x + rect.width - 4, rect.y + 5);
      ctx.stroke();
    }

    ctx.fillStyle = hiddenAboveCount > 0 ? "#4f46e5" : theme.textLight;
    ctx.font = `${hiddenAboveCount > 0 ? "600 " : ""}12px ${theme.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(rowNumber),
      rect.x + rect.width / 2,
      rect.y + rect.height / 2 + (hiddenAboveCount > 0 ? 3 : 0),
    );

    ctx.restore();
    return true;
  },
  onPaste: (_val, cellData) => cellData,
};

const KO_HIGHLIGHT_COL_IDS = new Set(["iqa", "commentLLT"]);

// ---- Adding / removing columns (header menu + trailing "+" button) -----
const NEW_COLUMN_WIDTH = 140;

let columnIdCounter = 0;
const genColumnId = () => {
  columnIdCounter += 1;
  return `col_${Date.now().toString(36)}_${columnIdCounter}`;
};

interface HeaderMenuState {
  colIndex: number;
  colId: string;
  bounds: Rectangle;
}

interface RowMenuState {
  rowIndex: number; // actual index into `data`
  visRow: number; // position among currently-visible rows
  bounds: Rectangle;
}

const headerMenuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  color: "#111827",
  fontSize: 13,
  cursor: "pointer",
};

const initialColumns: GridColumn[] = [
  { title: "Priority", id: "priority", width: 90 },
  { title: "LLR ID", id: "llrId", width: 110 },
  { title: "Function Name", id: "functionName", width: 160 },
  { title: "File .c", id: "fileC", width: 150 },
  { title: "Code Version", id: "codeVersion", width: 110 },
  { title: "Author LLR", id: "authorLLR", width: 130 },
  { title: "Author LLT", id: "authorLLT", width: 130 },
  { title: "Test Status", id: TEST_STATUS_COL_ID, width: 130 },
  { title: "ITS", id: "its", width: 100 },
  { title: "IQA", id: "iqa", width: 150 },
  { title: "Comment LLT", id: "commentLLT", width: 200 },
  { title: "Status LLT (JJ/MM/AAAA)", id: "statusLLTDate", width: 180 },
];

const seedData: RowData[] = [
  {
    priority: "1",
    llrId: "LLR-0001",
    functionName: "compute_checksum",
    fileC: "checksum.c",
    codeVersion: "v1.2.0",
    authorLLR: "J. Martin",
    authorLLT: "S. Bernard",
    [TEST_STATUS_COL_ID]: "OK",
    its: "",
    iqa: "",
    commentLLT: "",
    statusLLTDate: "26/07/2026",
  },
  {
    priority: "2",
    llrId: "LLR-0002",
    functionName: "init_sensor",
    fileC: "sensor_init.c",
    codeVersion: "v1.0.4",
    authorLLR: "A. Petit",
    authorLLT: "S. Bernard",
    [TEST_STATUS_COL_ID]: "KO",
    its: "ITS-4471",
    iqa: "Open",
    commentLLT: "Boundary case not covered, re-test after fix.",
    statusLLTDate: "25/07/2026",
  },
];

const emptySelection: GridSelection = {
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
  current: undefined,
};

// --- Starter blank rows ---
// A fixed pad of blank rows is added once on first load so there's room
// to type into right away. Unlike before, nothing is auto-appended while
// scrolling — new rows only come from the "+" button or the row menu's
// insert above/below.
const STARTER_BLANK_ROWS = 20;

const createEmptyRow = (cols: GridColumn[]): RowData => {
  const row: RowData = {};
  cols.forEach((c) => {
    if (c.id) row[c.id] = "";
  });
  return row;
};

const buildInitialData = (): RowData[] => [
  ...Array.from({ length: STARTER_BLANK_ROWS }, () =>
    createEmptyRow(initialColumns),
  ),
];

const MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 1420; // beyond this, text wraps + the row grows taller instead
const CELL_TEXT_PADDING = 32; // left+right cell padding + a little slack
const MEASURE_FONT = "13px system-ui, -apple-system, sans-serif";
const MEASURE_FONT_BOLD = "600 13px system-ui, -apple-system, sans-serif";

const LINE_HEIGHT = 18; // px per wrapped line at 13px font
const ROW_VERTICAL_PADDING = 16; // top+bottom cell padding
const MIN_ROW_HEIGHT = 34; // default single-line row height
const MAX_ROW_HEIGHT = 220; // cap so one giant paragraph can't take over the sheet

// Counts how many lines `text` would wrap onto inside `maxWidth`.
const countWrappedLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): number => {
  if (!text) return 1;
  const availableWidth = Math.max(10, maxWidth - CELL_TEXT_PADDING);
  let totalLines = 0;

  text.split("\n").forEach((paragraph) => {
    if (paragraph === "") {
      totalLines += 1;
      return;
    }
    const words = paragraph.split(" ");
    let line = "";
    let linesInParagraph = 0;

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > availableWidth) {
        linesInParagraph += 1;
        line = word;
      } else {
        line = candidate;
      }
    });
    linesInParagraph += 1; // final line in this paragraph
    totalLines += linesInParagraph;
  });

  return Math.max(1, totalLines);
};

// How long to wait after the last edit before writing to the DB.
const AUTOSAVE_DEBOUNCE_MS = 800;

interface SheetTableProps {
  sheetId: string;
  initialRows: RowData[];
}
export type { RowData };

const SheetTable = ({ sheetId, initialRows }: SheetTableProps) => {
  const [columns, setColumns] = useState<GridColumn[]>(initialColumns);
  const [data, setData] = useState<RowData[]>(() => [
    ...initialRows,
    ...Array.from({ length: STARTER_BLANK_ROWS }, () =>
      createEmptyRow(initialColumns),
    ),
  ]);
  const [selection, setSelection] = useState<GridSelection>(emptySelection);

  // --- Hidden rows (Excel-style hide/unhide) ---
  // Stores actual `data` indices, not grid-visible positions. Not
  // persisted to the DB — purely a view-state toggle, same as scroll
  // position. Ask if you'd like this saved per-sheet instead.
  const [hiddenRows, setHiddenRows] = useState<Set<number>>(new Set());

  // --- Column filters (Excel-style "check the values you want to keep") ---
  // Keyed by column id. A column with no entry here has no filter applied.
  // The value inside is the SET OF VALUES TO KEEP for that column — a row
  // passes a column's filter if its value for that column is in the set.
  // Not persisted, same as hiddenRows — purely a view-state toggle.
  const [columnFilters, setColumnFilters] = useState<
    Record<string, Set<string>>
  >({});
  const activeFilterCount = Object.keys(columnFilters).length;

  // The list of actual `data` indices that are currently visible, in
  // order. This is the translation layer between "grid row" (what glide-
  // data-grid renders, 0..visibleRowIndices.length-1) and "data row"
  // (the real index into `data`, which is what everything else in this
  // file — insertRowAt, persistNow, etc. — already works in terms of).
  const activeFilterEntries = useMemo(
    () => Object.entries(columnFilters),
    [columnFilters],
  );
  const visibleRowIndices = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (hiddenRows.has(i)) continue;
      if (activeFilterEntries.length > 0) {
        const row = data[i];
        const passesAllFilters = activeFilterEntries.every(
          ([colId, allowedValues]) => allowedValues.has(row?.[colId] ?? ""),
        );
        if (!passesAllFilters) continue;
      }
      arr.push(i);
    }
    return arr;
  }, [data, hiddenRows, activeFilterEntries]);

  // Gate autosave until the initial load has resolved, so we don't
  // immediately overwrite saved data with the default seed/buffer.
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Users for the Author LLR / Author LLT autocomplete dropdowns. Fetched
  // once — a project's user list doesn't change often enough to warrant
  // refetching per keystroke or per cell.
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    getUserSuggestions()
      .then((users) => {
        if (!cancelled) setUserSuggestions(users);
      })
      .catch((err) => console.error("Failed to load user suggestions", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Suggestions per author column: users tagged with the matching
  // artifact_type, falling back to everyone if none are tagged yet.
  const authorSuggestionsByCol = useMemo(() => {
    const result: Record<string, string[]> = {};
    const allNames = userSuggestions.map((u) => u.name);

    Object.entries(AUTHOR_COL_ARTIFACT_TYPE).forEach(
      ([colId, artifactType]) => {
        const matched = userSuggestions
          .filter((u) => u.artifactType === artifactType)
          .map((u) => u.name);
        result[colId] = matched.length > 0 ? matched : allNames;
      },
    );

    return result;
  }, [userSuggestions]);

  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const getMeasureCtx = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement("canvas");
    }
    return measureCanvasRef.current.getContext("2d");
  }, []);

  // --- Load saved data on mount ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await loadSheet(sheetId);
        if (cancelled) return;

        if (saved && saved.rows.length > 0) {
          const loadedColumns: GridColumn[] =
            saved.columns.length > 0
              ? saved.columns.map((c) => ({
                  title: c.title,
                  id: c.id,
                  width: c.width ?? 120,
                }))
              : initialColumns;

          setColumns(loadedColumns);
          // Saved rows now already include whatever blank rows were on the
          // sheet at last save (we save data as-is, not just filled rows),
          // so no extra padding is added here — doing so would make the
          // sheet grow a little more every time it's loaded and saved.
          setData(saved.rows);
        }
        // If nothing saved yet, keep the default seed/buffer that's
        // already in state — this becomes the first autosave.
      } catch (err) {
        console.error("Failed to load sheet", err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetId]);

  // --- Read a cell ---
  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, visRow] = cell;
      const row = visibleRowIndices[visRow] ?? visRow;

      if (col === 0) {
        const prevRow = visRow > 0 ? visibleRowIndices[visRow - 1] : -1;
        const rowNumberCell: RowNumberCell = {
          kind: GridCellKind.Custom,
          allowOverlay: false,
          copyData: String(row + 1),
          data: {
            kind: "row-number-cell",
            rowNumber: row + 1,
            hiddenAboveCount: Math.max(0, row - prevRow - 1),
          },
        };
        return rowNumberCell;
      }

      const dataCol = col - 1;
      const colId = columns[dataCol]?.id ?? "";
      const dataRow = data[row];
      const value = dataRow?.[colId] ?? "";

      if (colId === TEST_STATUS_COL_ID) {
        const testStatusCell: TestStatusCell = {
          kind: GridCellKind.Custom,
          allowOverlay: true,
          copyData: value,
          data: {
            kind: "test-status-cell",
            value: (value === "OK" || value === "KO"
              ? value
              : "") as TestStatusValue,
          },
        };
        return testStatusCell;
      }

      if (colId in AUTHOR_COL_ARTIFACT_TYPE) {
        const authorCell: AuthorSuggestCell = {
          kind: GridCellKind.Custom,
          allowOverlay: true,
          copyData: value,
          data: {
            kind: "author-suggest-cell",
            text: value,
            suggestions: authorSuggestionsByCol[colId] ?? [],
          },
        };
        return authorCell;
      }

      if (colId === STATUS_LLT_COL_ID) {
        const statusCell: StatusLLTCell = {
          kind: GridCellKind.Custom,
          allowOverlay: true,
          copyData: value,
          data: {
            kind: "status-llt-cell",
            text: value,
          },
        };
        return statusCell;
      }

      // Highlight IQA / Comment LLT cells red-tinted when this row's
      // Test Status is KO, so it's obvious they need attention.
      const isKORow = dataRow?.[TEST_STATUS_COL_ID] === "KO";

      if (FORMAT_CHECKED_COL_IDS.has(colId)) {
        const formatCell: FormatCheckedCell = {
          kind: GridCellKind.Custom,
          allowOverlay: true,
          copyData: value,
          data: {
            kind: "format-checked-cell",
            text: value,
            colId,
          },
          themeOverride:
            isKORow && KO_HIGHLIGHT_COL_IDS.has(colId)
              ? { bgCell: "#fef2f2" }
              : undefined,
        };
        return formatCell;
      }
      const shouldHighlight = isKORow && KO_HIGHLIGHT_COL_IDS.has(colId);

      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        readonly: false,
        displayData: value,
        data: value,
        // Lets long values wrap onto multiple lines instead of getting
        // clipped once the column has hit its max width.
        allowWrapping: true,
        themeOverride: shouldHighlight ? { bgCell: "#fef2f2" } : undefined,
      } as GridCell;
    },
    [columns, data, authorSuggestionsByCol, visibleRowIndices],
  );

  // --- Edit a cell ---
  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [col, visRow] = cell;
      if (col === 0) return; // row-number column is display-only
      const row = visibleRowIndices[visRow] ?? visRow;
      const colId = columns[col - 1]?.id;
      if (!colId) return;

      if (
        colId === TEST_STATUS_COL_ID &&
        newValue.kind === GridCellKind.Custom
      ) {
        const newStatus = (newValue.data as TestStatusCellProps).value;
        setData((prev) => {
          const next = [...prev];
          next[row] = { ...next[row], [TEST_STATUS_COL_ID]: newStatus };
          return next;
        });
        return;
      }

      if (
        colId in AUTHOR_COL_ARTIFACT_TYPE &&
        newValue.kind === GridCellKind.Custom
      ) {
        const newText = (newValue.data as AuthorSuggestCellProps).text;
        setData((prev) => {
          const next = [...prev];
          next[row] = { ...next[row], [colId]: newText };
          return next;
        });
        return;
      }

      if (
        colId === STATUS_LLT_COL_ID &&
        newValue.kind === GridCellKind.Custom
      ) {
        const newText = (newValue.data as StatusLLTCellProps).text;
        setData((prev) => {
          const next = [...prev];
          next[row] = { ...next[row], [colId]: newText };
          return next;
        });
        return;
      }

      if (
        FORMAT_CHECKED_COL_IDS.has(colId) &&
        newValue.kind === GridCellKind.Custom
      ) {
        const newText = (newValue.data as FormatCheckedCellProps).text;
        setData((prev) => {
          const next = [...prev];
          next[row] = { ...next[row], [colId]: newText };
          return next;
        });
        return;
      }

      if (newValue.kind !== GridCellKind.Text) return;

      setData((prev) => {
        const next = [...prev];
        next[row] = { ...next[row], [colId]: newValue.data };
        return next;
      });
    },
    [columns, visibleRowIndices],
  );

  // --- Autosave machinery ---
  // `saveTimeoutRef` backs the debounced effect below (for typing), but
  // `persistNow` bypasses that debounce entirely for structural edits —
  // inserting/deleting a row or column. Those should never be lost just
  // because the user refreshed within the debounce window.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistNow = useCallback(
    (nextData: RowData[], nextColumns: GridColumn[] = columns) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveStatus("saving");
      saveSheet(
        sheetId,
        nextColumns
          .filter((c) => c.id)
          .map((c) => ({
            id: c.id as string,
            title: String(c.title ?? ""),
            width: c.width,
          })),
        nextData,
      )
        .then(() => setSaveStatus("saved"))
        .catch((err) => {
          console.error("Failed to save sheet", err);
          setSaveStatus("error");
        });
    },
    [columns, sheetId],
  );

  // --- Column resize (manual drag) ---
  const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
    if (column.id === ROW_NUMBER_COL_ID) return;
    setColumns((prev) =>
      prev.map((c) => (c.id === column.id ? { ...c, width: newSize } : c)),
    );
  }, []);

  // --- Insert a brand new (blank, free-text) column at a given index ---
  const insertColumnAt = useCallback(
    (index: number, title = "New column") => {
      const newId = genColumnId();
      const nextColumns = [...columns];
      const clampedIndex = Math.max(0, Math.min(index, nextColumns.length));
      nextColumns.splice(clampedIndex, 0, {
        title,
        id: newId,
        width: NEW_COLUMN_WIDTH,
      });
      setColumns(nextColumns);
      // Structural edit — save right away, don't wait for the typing debounce.
      // (Called after setState, not inside its updater — updaters can run
      // during React's render phase, where side effects aren't allowed.)
      persistNow(data, nextColumns);
      return newId;
    },
    [columns, data, persistNow],
  );

  // --- Insert a brand new (blank) row at a given index ---
  const insertRowAt = useCallback(
    (index: number) => {
      const next = [...data];
      const clampedIndex = Math.max(0, Math.min(index, next.length));
      next.splice(clampedIndex, 0, createEmptyRow(columns));
      setData(next);
      // Hidden-row indices at/after the insertion point need to shift up
      // by one so they keep pointing at the same rows.
      setHiddenRows((prev) => {
        if (prev.size === 0) return prev;
        const shifted = new Set<number>();
        prev.forEach((i) => shifted.add(i >= clampedIndex ? i + 1 : i));
        return shifted;
      });
      // Structural edit — save right away, don't wait for the typing debounce.
      persistNow(next);
    },
    [data, columns, persistNow],
  );

  // Ref to the grid so we can scroll the newly appended column into view.
  const gridRef = useRef<DataEditorRef>(null);

  // Appends a new column at the very end — used by the trailing "+" button.
  const appendColumn = useCallback(() => {
    const newIndex = columns.length;
    insertColumnAt(newIndex);
    // Wait a tick for the column to actually land in state before scrolling.
    requestAnimationFrame(() => {
      gridRef.current?.scrollTo(newIndex, 0, "horizontal");
    });
  }, [columns.length, insertColumnAt]);

  // Appends a new row at the very end — used by the "+ Add row" footer
  // button now that rows no longer auto-append while scrolling.
  const appendRow = useCallback(() => {
    const newDataIndex = data.length;
    // The appended row always lands at the very end and is never hidden,
    // so its visible-grid position is simply the current visible count.
    const newVisRow = visibleRowIndices.length;
    insertRowAt(newDataIndex);
    requestAnimationFrame(() => {
      gridRef.current?.scrollTo(0, newVisRow, "vertical");
    });
  }, [data.length, visibleRowIndices.length, insertRowAt]);

  // --- Column header menu: insert left/right, rename, delete ---
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

  const onHeaderMenuClick = useCallback(
    (colIndex: number, bounds: Rectangle) => {
      if (colIndex === 0) return; // pinned row-number column has no menu
      const dataColIndex = colIndex - 1;
      const col = columns[dataColIndex];
      if (!col?.id) return;
      setRenameValue(String(col.title ?? ""));
      setHeaderMenu({ colIndex: dataColIndex, colId: col.id, bounds });
    },
    [columns],
  );

  // Right-click on a column header opens the exact same menu (filter,
  // insert column left/right, rename, delete) as clicking the header's
  // little menu icon — no need to hunt for the icon anymore.
  const onHeaderContextMenu = useCallback(
    (
      colIndex: number,
      event: { bounds: Rectangle; preventDefault: () => void },
    ) => {
      event.preventDefault();
      onHeaderMenuClick(colIndex, event.bounds);
    },
    [onHeaderMenuClick],
  );

  // Close the header menu on outside click or Escape.
  useEffect(() => {
    if (!headerMenu) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        headerMenuRef.current &&
        !headerMenuRef.current.contains(e.target as Node)
      ) {
        setHeaderMenu(null);
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHeaderMenu(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [headerMenu]);

  // --- Column filter (Excel-style checkbox list, lives in the same menu) ---
  // Every distinct value ever seen in this column, so the checkbox list
  // still shows an option even if the current filter has hidden all its
  // rows. Deliberately ignores other columns' active filters, so opening
  // one column's filter never shows a narrower list because of another —
  // simpler and more predictable than Excel's contextual narrowing.
  const filterColumnValues = useMemo(() => {
    if (!headerMenu) return [];
    const colId = headerMenu.colId;
    const seen = new Set<string>();
    data.forEach((row) => {
      const v = row?.[colId] ?? "";
      if (v) seen.add(v);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [headerMenu, data]);

  const [filterSearch, setFilterSearch] = useState("");
  // The checkboxes being edited right now, before "Apply" commits them to
  // columnFilters. Re-seeded from the column's current filter (or "every
  // value checked" if it has none) whenever a different column's menu opens.
  const [pendingFilterValues, setPendingFilterValues] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    if (!headerMenu) {
      setPendingFilterValues(null);
      setFilterSearch("");
      return;
    }
    const existing = columnFilters[headerMenu.colId];
    const seen = new Set<string>();
    data.forEach((row) => seen.add(row?.[headerMenu.colId] ?? ""));
    setPendingFilterValues(existing ? new Set(existing) : seen);
    setFilterSearch("");
    // Only re-seed when a *different column's* menu opens, not on every
    // keystroke elsewhere — deliberately excludes columnFilters/data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerMenu?.colId]);

  const visibleFilterValues = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return filterColumnValues;
    return filterColumnValues.filter((v) => v.toLowerCase().includes(q));
  }, [filterColumnValues, filterSearch]);

  const toggleFilterValue = useCallback((value: string) => {
    setPendingFilterValues((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const allFilterValuesChecked =
    !!pendingFilterValues &&
    filterColumnValues.every((v) => pendingFilterValues.has(v));

  const toggleSelectAllFilterValues = useCallback(() => {
    setPendingFilterValues((prev) => {
      const allChecked = !!prev && filterColumnValues.every((v) => prev.has(v));
      return allChecked ? new Set() : new Set(filterColumnValues);
    });
  }, [filterColumnValues]);

  const applyColumnFilter = useCallback(() => {
    if (!headerMenu || !pendingFilterValues) return;
    const colId = headerMenu.colId;
    setColumnFilters((prev) => {
      const next = { ...prev };
      // Every known value checked is the same as "no filter" — and keeping
      // it that way means a value typed into a *new* row later shows up
      // automatically instead of being silently excluded.
      if (pendingFilterValues.size >= filterColumnValues.length) {
        delete next[colId];
      } else {
        next[colId] = new Set(pendingFilterValues);
      }
      return next;
    });
    setHeaderMenu(null);
  }, [headerMenu, pendingFilterValues, filterColumnValues]);

  const clearColumnFilter = useCallback(() => {
    if (!headerMenu) return;
    const colId = headerMenu.colId;
    setColumnFilters((prev) => {
      if (!(colId in prev)) return prev;
      const next = { ...prev };
      delete next[colId];
      return next;
    });
    setHeaderMenu(null);
  }, [headerMenu]);

  const clearAllFilters = useCallback(() => setColumnFilters({}), []);

  const insertColumnLeft = useCallback(() => {
    if (!headerMenu) return;
    insertColumnAt(headerMenu.colIndex);
    setHeaderMenu(null);
  }, [headerMenu, insertColumnAt]);

  const insertColumnRight = useCallback(() => {
    if (!headerMenu) return;
    insertColumnAt(headerMenu.colIndex + 1);
    setHeaderMenu(null);
  }, [headerMenu, insertColumnAt]);

  const renameHeaderMenuColumn = useCallback(() => {
    if (!headerMenu) return;
    const colId = headerMenu.colId;
    const nextColumns = columns.map((c) =>
      c.id === colId ? { ...c, title: renameValue.trim() || c.title } : c,
    );
    setColumns(nextColumns);
    // Renaming only changes `title`, which the debounced autosave's
    // columnsSignature (id:width) doesn't track — so it would never
    // trigger a save on its own. Persist explicitly, right away.
    persistNow(data, nextColumns);
    setHeaderMenu(null);
  }, [headerMenu, renameValue, columns, data, persistNow]);

  const deleteHeaderMenuColumn = useCallback(() => {
    if (!headerMenu) return;
    const colId = headerMenu.colId;
    const nextColumns = columns.filter((c) => c.id !== colId);
    const nextData = data.map((row) => {
      if (!(colId in row)) return row;
      const next = { ...row };
      delete next[colId];
      return next;
    });
    setColumns(nextColumns);
    setData(nextData);
    persistNow(nextData, nextColumns);
    setHeaderMenu(null);
  }, [headerMenu, columns, data, persistNow]);

  // --- Row context menu: right-click a row to insert above/below or delete ---
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  const onCellContextMenu = useCallback(
    (cell: Item, event: { preventDefault: () => void; bounds: Rectangle }) => {
      const [, visRow] = cell;
      if (visRow < 0) return;
      const row = visibleRowIndices[visRow];
      if (row === undefined) return;
      event.preventDefault();
      // Give the user visual feedback that this is now the row they're
      // acting on, same as if they'd clicked the row marker. Keep an
      // existing multi-row selection intact if the right-clicked row is
      // already part of it (so "Hide rows" can act on all of them).
      setSelection((prev) =>
        prev.rows.hasIndex(visRow)
          ? prev
          : {
              columns: CompactSelection.empty(),
              rows: CompactSelection.fromSingleSelection(visRow),
              current: undefined,
            },
      );
      setRowMenu({ rowIndex: row, visRow, bounds: event.bounds });
    },
    [visibleRowIndices],
  );

  // Close the row menu on outside click or Escape.
  useEffect(() => {
    if (!rowMenu) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        rowMenuRef.current &&
        !rowMenuRef.current.contains(e.target as Node)
      ) {
        setRowMenu(null);
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRowMenu(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [rowMenu]);

  const insertRowAbove = useCallback(() => {
    if (!rowMenu) return;
    insertRowAt(rowMenu.rowIndex);
    setRowMenu(null);
  }, [rowMenu, insertRowAt]);

  const insertRowBelow = useCallback(() => {
    if (!rowMenu) return;
    insertRowAt(rowMenu.rowIndex + 1);
    setRowMenu(null);
  }, [rowMenu, insertRowAt]);

  const deleteRowMenuRow = useCallback(() => {
    if (!rowMenu) return;
    const idx = rowMenu.rowIndex;
    const next = data.filter((_, i) => i !== idx);
    setData(next);
    setHiddenRows((prev) => {
      if (prev.size === 0) return prev;
      const shifted = new Set<number>();
      prev.forEach((i) => {
        if (i === idx) return;
        shifted.add(i > idx ? i - 1 : i);
      });
      return shifted;
    });
    persistNow(next);
    setRowMenu(null);
    setSelection(emptySelection);
  }, [rowMenu, data, persistNow]);

  // Hides the whole current selection if it includes the right-clicked
  // row (multi-row hide), otherwise just the single clicked row.
  const hideRowMenuRow = useCallback(() => {
    if (!rowMenu) return;
    const selectedVisRows = Array.from(selection.rows);
    const actualRowsToHide =
      selectedVisRows.length > 1 && selection.rows.hasIndex(rowMenu.visRow)
        ? selectedVisRows
            .map((vr) => visibleRowIndices[vr])
            .filter((i): i is number => i !== undefined)
        : [rowMenu.rowIndex];

    setHiddenRows((prev) => {
      const next = new Set(prev);
      actualRowsToHide.forEach((i) => next.add(i));
      return next;
    });
    setRowMenu(null);
    setSelection(emptySelection);
  }, [rowMenu, selection, visibleRowIndices]);

  const unhideAllRows = useCallback(() => {
    setHiddenRows(new Set());
    setRowMenu(null);
  }, []);

  // Unhides whatever hidden rows sit directly above the clicked (visible)
  // row — i.e. between the previous visible row and this one.
  const unhideAboveRowMenu = useCallback(() => {
    if (!rowMenu) return;
    const prevVisibleActual =
      rowMenu.visRow > 0 ? visibleRowIndices[rowMenu.visRow - 1] : -1;
    setHiddenRows((prev) => {
      const next = new Set(prev);
      for (let i = prevVisibleActual + 1; i < rowMenu.rowIndex; i++) {
        next.delete(i);
      }
      return next;
    });
    setRowMenu(null);
  }, [rowMenu, visibleRowIndices]);

  // Unhides whatever hidden rows sit directly below the clicked (visible)
  // row — i.e. between this one and the next visible row.
  const unhideBelowRowMenu = useCallback(() => {
    if (!rowMenu) return;
    const nextVisibleActual =
      rowMenu.visRow < visibleRowIndices.length - 1
        ? visibleRowIndices[rowMenu.visRow + 1]
        : data.length;
    setHiddenRows((prev) => {
      const next = new Set(prev);
      for (let i = rowMenu.rowIndex + 1; i < nextVisibleActual; i++) {
        next.delete(i);
      }
      return next;
    });
    setRowMenu(null);
  }, [rowMenu, visibleRowIndices, data.length]);

  // Whether there are manually-hidden rows immediately above/below the
  // clicked row, used to decide which "Unhide" menu items to show. A gap
  // in visibleRowIndices can now also come from a column filter, so this
  // checks hiddenRows membership directly rather than just index math —
  // otherwise "Unhide rows above" could appear (and do nothing) when a
  // filter, not a manual hide, is what's actually closing the gap.
  const hasHiddenAbove =
    !!rowMenu &&
    (() => {
      const start =
        rowMenu.visRow > 0 ? visibleRowIndices[rowMenu.visRow - 1] + 1 : 0;
      for (let i = start; i < rowMenu.rowIndex; i++) {
        if (hiddenRows.has(i)) return true;
      }
      return false;
    })();
  const hasHiddenBelow =
    !!rowMenu &&
    (() => {
      const end =
        rowMenu.visRow < visibleRowIndices.length - 1
          ? visibleRowIndices[rowMenu.visRow + 1]
          : data.length;
      for (let i = rowMenu.rowIndex + 1; i < end; i++) {
        if (hiddenRows.has(i)) return true;
      }
      return false;
    })();

  const rowMenuSelectionCount =
    rowMenu &&
    selection.rows.length > 1 &&
    selection.rows.hasIndex(rowMenu.visRow)
      ? selection.rows.length
      : 1;

  // Only rows that actually have content matter for sizing (and saving) —
  // the infinite blank buffer below them shouldn't be measured on every
  // scroll-append, nor written to the database.
  // Original row index is kept so heights can be looked up by row number.
  const filledRowEntries = useMemo(
    () =>
      data
        .map((row, idx) => ({ idx, row }))
        .filter(({ row }) => Object.values(row).some((v) => v)),
    [data],
  );
  const filledRows = useMemo(
    () => filledRowEntries.map((e) => e.row),
    [filledRowEntries],
  );

  const columnIds = useMemo(
    () => columns.map((c) => c.id).join("|"),
    [columns],
  );

  // Width and title changes don't change columnIds, so we need a separate
  // signature to trigger autosave on those (title is also saved eagerly by
  // persistNow in renameHeaderMenuColumn, but this covers it defensively too).
  const columnsSignature = useMemo(
    () =>
      columns.map((c) => `${c.id}:${c.width ?? ""}:${c.title ?? ""}`).join("|"),
    [columns],
  );

  // --- Autosave: debounced write to Postgres whenever content settles ---
  // (Structural edits like row/column insert or delete skip this debounce
  // entirely via persistNow — this effect only handles typing.)
  useEffect(() => {
    if (!isLoaded) return; // don't save while the initial buffer is still in place

    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveSheet(
          sheetId,
          columns
            .filter((c) => c.id)
            .map((c) => ({
              id: c.id as string,
              title: String(c.title ?? ""),
              width: c.width,
            })),
          data,
        );
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save sheet", err);
        setSaveStatus("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columnsSignature, columnIds, isLoaded, sheetId]);

  // --- Auto-grow every column so its content (and header) is never clipped ---
  useEffect(() => {
    const ctx = getMeasureCtx();
    if (!ctx) return;

    const desiredWidths: Record<string, number> = {};

    columns.forEach((col) => {
      if (!col.id) return;

      // The Test Status column is a fixed-shape pill, not free text.
      if (col.id === TEST_STATUS_COL_ID) return;

      ctx.font = MEASURE_FONT_BOLD;
      let widest = ctx.measureText(col.title).width;

      ctx.font = MEASURE_FONT;
      filledRows.forEach((row) => {
        const value = row[col.id as string];
        if (!value) return;
        const w = ctx.measureText(value).width;
        if (w > widest) widest = w;
      });

      desiredWidths[col.id] = Math.min(
        MAX_COL_WIDTH,
        Math.max(MIN_COL_WIDTH, Math.ceil(widest) + CELL_TEXT_PADDING),
      );
    });

    setColumns((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (!c.id) return c;
        const desired = desiredWidths[c.id];
        if (desired !== undefined && desired > (c.width ?? 0)) {
          changed = true;
          return { ...c, width: desired };
        }
        return c;
      });
      return changed ? next : prev;
    });
    // Re-run only when the actual content or the set of columns changes —
    // not on every manual resize or every blank row appended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledRows, columnIds, getMeasureCtx]);

  // --- Auto-grow each row so wrapped text is never clipped vertically ---
  const rowHeightMap = useMemo(() => {
    const ctx = getMeasureCtx();
    const map = new Map<number, number>();
    if (!ctx) return map;

    filledRowEntries.forEach(({ idx, row }) => {
      let maxLines = 1;
      ctx.font = MEASURE_FONT;

      columns.forEach((col) => {
        if (!col.id || col.id === TEST_STATUS_COL_ID) return;
        const value = row[col.id];
        if (!value) return;
        const lines = countWrappedLines(ctx, value, col.width ?? MIN_COL_WIDTH);
        if (lines > maxLines) maxLines = lines;
      });

      if (maxLines > 1) {
        map.set(
          idx,
          Math.min(
            MAX_ROW_HEIGHT,
            maxLines * LINE_HEIGHT + ROW_VERTICAL_PADDING,
          ),
        );
      }
    });

    return map;
  }, [filledRowEntries, columns, getMeasureCtx]);

  const getRowHeight = useCallback(
    (visRow: number) => {
      const row = visibleRowIndices[visRow] ?? visRow;
      return rowHeightMap.get(row) ?? MIN_ROW_HEIGHT;
    },
    [rowHeightMap, visibleRowIndices],
  );

  // --- Delete whatever rows/columns are currently selected ---
  // Only rows are deletable via the keyboard shortcut now — columns can
  // only be removed via the header menu's "Delete column" button, so a
  // stray Backspace/Delete while a column is selected can't wipe it out.
  const deleteSelected = useCallback(() => {
    const selectedVisRows = selection.rows;
    if (selectedVisRows.length === 0) return;

    const actualRowsToDelete = new Set(
      Array.from(selectedVisRows)
        .map((vr) => visibleRowIndices[vr])
        .filter((i): i is number => i !== undefined),
    );
    const nextData = data.filter((_, idx) => !actualRowsToDelete.has(idx));

    setData(nextData);
    setHiddenRows((prev) => {
      if (prev.size === 0) return prev;
      const deletedSorted = Array.from(actualRowsToDelete).sort(
        (a, b) => a - b,
      );
      const shifted = new Set<number>();
      prev.forEach((i) => {
        if (actualRowsToDelete.has(i)) return;
        const shift = deletedSorted.filter((d) => d < i).length;
        shifted.add(i - shift);
      });
      return shifted;
    });
    // Structural edit — save right away, don't wait for the typing debounce.
    persistNow(nextData);
    setSelection(emptySelection);
  }, [selection, data, visibleRowIndices, persistNow]);

  // --- Keyboard shortcut: Delete/Backspace removes selected rows only ---
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.rows.length > 0) {
          event.preventDefault();
          deleteSelected();
        }
      }
    },
    [selection, deleteSelected],
  );

  // Every column needs `hasMenu: true` so the grid draws the little
  // dropdown-menu affordance in its header, which opens the insert/rename/
  // delete popover below.
  const columnsWithMenu = useMemo(
    () => [
      {
        title: "#",
        id: ROW_NUMBER_COL_ID,
        width: ROW_NUMBER_COL_WIDTH,
        hasMenu: false,
      } as GridColumn,
      ...columns.map((c) => ({
        ...c,
        hasMenu: true,
        // Funnel icon instead of the default triangle, so it's obvious the
        // dropdown offers filtering — filled/colored once a filter is set.
        menuIcon: (c.id && columnFilters[c.id] ? "filterActive" : "filter") as
          | string
          | undefined,
      })),
    ],
    [columns, columnFilters],
  );

  // SVG sprites for the header menu icon — plain funnel normally, filled
  // and accent-colored once that column has an active filter.
  const headerIcons = useMemo(
    () =>
      ({
        filter: () =>
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" stroke="#9ca3af" stroke-width="1.6" stroke-linejoin="round" fill="none"/></svg>`,
        filterActive: () =>
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" fill="#4f46e5" stroke="#4f46e5" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
      }) as Record<
        string,
        (props: { fgColor: string; bgColor: string }) => string
      >,
    [],
  );

  // Slim "+" button pinned to the right edge of the grid, for appending a
  // brand new column — the "New Column Button" pattern.
  const addColumnButton = useMemo(
    () => (
      <button
        type="button"
        onClick={appendColumn}
        title="Add column"
        style={{
          width: 36,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          borderLeft: "1px solid #e5e7eb",
          background: "#f9fafb",
          color: "#6b7280",
          fontSize: 18,
          fontWeight: 600,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#f9fafb";
        }}
      >
        +
      </button>
    ),
    [appendColumn],
  );

  return (
    <div className="flex flex-col h-full" onKeyDown={onKeyDown}>
      {hiddenRows.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            marginBottom: 6,
            borderRadius: 6,
            background: "#fef9c3",
            color: "#a16207",
            fontSize: 12,
          }}
        >
          <span>
            {hiddenRows.size} row{hiddenRows.size > 1 ? "s" : ""} hidden
          </span>
          <button
            type="button"
            onClick={unhideAllRows}
            style={{
              border: "none",
              background: "transparent",
              color: "#a16207",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Unhide all
          </button>
        </div>
      )}
      {activeFilterCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            marginBottom: 6,
            borderRadius: 6,
            background: "#eef2ff",
            color: "#4338ca",
            fontSize: 12,
          }}
        >
          <span>
            {activeFilterCount} column{activeFilterCount > 1 ? "s" : ""}{" "}
            filtered — showing {visibleRowIndices.length} of {data.length} rows
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              border: "none",
              background: "transparent",
              color: "#4338ca",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 flex flex-col">
        <div className="flex-1 min-h-0">
          <DataEditor
            ref={gridRef}
            getCellContent={getCellContent}
            columns={columnsWithMenu}
            rows={visibleRowIndices.length}
            rowHeight={getRowHeight}
            onCellEdited={onCellEdited}
            onColumnResize={onColumnResize}
            onHeaderMenuClick={onHeaderMenuClick}
            onHeaderContextMenu={onHeaderContextMenu}
            onCellContextMenu={onCellContextMenu}
            rowMarkers="checkbox"
            freezeColumns={1}
            headerIcons={headerIcons}
            gridSelection={selection}
            onGridSelectionChange={setSelection}
            rangeSelect="multi-rect"
            columnSelect="multi"
            rowSelect="multi"
            getCellsForSelection={true}
            width="100%"
            rightElement={addColumnButton}
            rightElementProps={{ sticky: true }}
            customRenderers={[
              rowNumberCellRenderer,
              testStatusCellRenderer,
              authorSuggestCellRenderer,
              statusLLTCellRenderer,
              formatCheckedCellRenderer,
            ]}
            theme={{
              bgHeader: "#f9fafb",
              borderColor: "#e5e7eb",
              horizontalBorderColor: "#e5e7eb",
            }}
          />
        </div>

        <button
          type="button"
          onClick={appendRow}
          title="Add row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "8px 12px",
            border: "none",
            borderTop: "1px solid #e5e7eb",
            background: "#f9fafb",
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>+</span> Add row
        </button>
      </div>

      {headerMenu && (
        <div
          ref={headerMenuRef}
          style={{
            position: "fixed",
            left: Math.min(
              headerMenu.bounds.x,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 240,
            ),
            top: headerMenu.bounds.y + headerMenu.bounds.height + 2,
            zIndex: 50,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 240,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  renameHeaderMenuColumn();
                } else if (e.key === "Escape") {
                  setHeaderMenu(null);
                }
              }}
              placeholder="Column name"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ padding: "8px 10px 4px" }}>
              <input
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search values…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={allFilterValuesChecked}
                onChange={toggleSelectAllFilterValues}
              />
              Select all
            </label>
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {visibleFilterValues.length === 0 && (
                <div
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No matching values
                </div>
              )}
              {visibleFilterValues.map((value) => (
                <label
                  key={value || "\u0000blank"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "#111827",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!pendingFilterValues?.has(value)}
                    onChange={() => toggleFilterValue(value)}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: value ? "#111827" : "#9ca3af",
                      fontStyle: value ? "normal" : "italic",
                    }}
                  >
                    {value}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, padding: 8 }}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearColumnFilter();
                }}
                disabled={!headerMenu || !(headerMenu.colId in columnFilters)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#6b7280",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyColumnFilter();
                }}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "none",
                  borderRadius: 6,
                  background: "#4f46e5",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply filter
              </button>
            </div>
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertColumnLeft();
            }}
            style={headerMenuItemStyle}
          >
            <span style={{ marginRight: 8 }}>←</span> Insert column left
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertColumnRight();
            }}
            style={headerMenuItemStyle}
          >
            <span style={{ marginRight: 8 }}>→</span> Insert column right
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              renameHeaderMenuColumn();
            }}
            style={{ ...headerMenuItemStyle, borderTop: "1px solid #f3f4f6" }}
          >
            Rename column
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteHeaderMenuColumn();
            }}
            style={{
              ...headerMenuItemStyle,
              borderTop: "1px solid #f3f4f6",
              color: "#b91c1c",
            }}
          >
            Delete column
          </button>
        </div>
      )}

      {rowMenu && (
        <div
          ref={rowMenuRef}
          style={{
            position: "fixed",
            left: Math.min(
              rowMenu.bounds.x,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 200,
            ),
            top: rowMenu.bounds.y + rowMenu.bounds.height + 2,
            zIndex: 50,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 200,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertRowAbove();
            }}
            style={headerMenuItemStyle}
          >
            <span style={{ marginRight: 8 }}>↑</span> Insert row above
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertRowBelow();
            }}
            style={{ ...headerMenuItemStyle, borderTop: "1px solid #f3f4f6" }}
          >
            <span style={{ marginRight: 8 }}>↓</span> Insert row below
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteRowMenuRow();
            }}
            style={{
              ...headerMenuItemStyle,
              borderTop: "1px solid #f3f4f6",
              color: "#b91c1c",
            }}
          >
            Delete row
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              hideRowMenuRow();
            }}
            style={{ ...headerMenuItemStyle, borderTop: "1px solid #f3f4f6" }}
          >
            {rowMenuSelectionCount > 1
              ? `Hide ${rowMenuSelectionCount} rows`
              : "Hide row"}
          </button>
          {hasHiddenAbove && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                unhideAboveRowMenu();
              }}
              style={headerMenuItemStyle}
            >
              Unhide rows above
            </button>
          )}
          {hasHiddenBelow && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                unhideBelowRowMenu();
              }}
              style={headerMenuItemStyle}
            >
              Unhide rows below
            </button>
          )}
          {hiddenRows.size > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                unhideAllRows();
              }}
              style={{ ...headerMenuItemStyle, borderTop: "1px solid #f3f4f6" }}
            >
              Unhide all rows ({hiddenRows.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SheetTable;
