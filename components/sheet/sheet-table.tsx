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
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

// Adjust these import paths to wherever you put the action files.
import { loadSheet, saveSheet } from "@/app/actions/sheet";
import { getUserSuggestions, type UserSuggestion } from "@/app/actions/users";
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

const KO_HIGHLIGHT_COL_IDS = new Set(["iqa", "commentLLT"]);

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

// --- Infinite scroll helpers ---
// We keep a buffer of blank rows past the last visible row so the sheet
// never visibly "runs out" — as the user scrolls further down, more rows
// are appended on the fly, similar to Excel/Google Sheets.
const ROW_BUFFER = 60; // rows kept ready below what's currently visible
const INITIAL_BUFFER = 80; // rows to pad with on first load

const createEmptyRow = (cols: GridColumn[]): RowData => {
  const row: RowData = {};
  cols.forEach((c) => {
    if (c.id) row[c.id] = "";
  });
  return row;
};

const buildInitialData = (): RowData[] => [
  ...Array.from({ length: INITIAL_BUFFER }, () =>
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
    ...Array.from({ length: INITIAL_BUFFER }, () =>
      createEmptyRow(initialColumns),
    ),
  ]);
  const [selection, setSelection] = useState<GridSelection>(emptySelection);

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
          setData([
            ...saved.rows,
            ...Array.from({ length: INITIAL_BUFFER }, () =>
              createEmptyRow(loadedColumns),
            ),
          ]);
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
      const [col, row] = cell;
      const colId = columns[col]?.id ?? "";
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

      // Highlight IQA / Comment LLT cells red-tinted when this row's
      // Test Status is KO, so it's obvious they need attention.
      const isKORow = dataRow?.[TEST_STATUS_COL_ID] === "KO";
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
    [columns, data, authorSuggestionsByCol],
  );

  // --- Edit a cell ---
  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [col, row] = cell;
      const colId = columns[col]?.id;
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

      if (newValue.kind !== GridCellKind.Text) return;

      setData((prev) => {
        const next = [...prev];
        next[row] = { ...next[row], [colId]: newValue.data };
        return next;
      });
    },
    [columns],
  );

  // --- Keep topping up blank rows as the user scrolls down (infinite feel) ---
  const onVisibleRegionChanged = useCallback(
    (range: Rectangle) => {
      const lastVisibleRow = range.y + range.height;
      setData((prev) => {
        if (lastVisibleRow + ROW_BUFFER / 2 < prev.length) return prev;
        const rowsToAdd = lastVisibleRow + ROW_BUFFER - prev.length;
        if (rowsToAdd <= 0) return prev;
        return [
          ...prev,
          ...Array.from({ length: rowsToAdd }, () => createEmptyRow(columns)),
        ];
      });
    },
    [columns],
  );

  // --- Column resize (manual drag) ---
  const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === column.id ? { ...c, width: newSize } : c)),
    );
  }, []);

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

  // Widths change on manual resize/auto-grow without changing columnIds,
  // so we need a separate signature to trigger autosave on width changes.
  const columnsSignature = useMemo(
    () => columns.map((c) => `${c.id}:${c.width ?? ""}`).join("|"),
    [columns],
  );

  // --- Autosave: debounced write to Postgres whenever content settles ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          filledRows,
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
  }, [filledRows, columnsSignature, columnIds, isLoaded, sheetId]);

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
    (row: number) => rowHeightMap.get(row) ?? MIN_ROW_HEIGHT,
    [rowHeightMap],
  );

  // --- Delete whatever rows/columns are currently selected ---
  const deleteSelected = useCallback(() => {
    const selectedRows = selection.rows;
    const selectedCols = selection.columns;

    const hasRows = selectedRows.length > 0;
    const hasCols = selectedCols.length > 0;
    if (!hasRows && !hasCols) return;

    if (hasRows) {
      setData((prev) => prev.filter((_, idx) => !selectedRows.hasIndex(idx)));
    }

    if (hasCols) {
      const colIdsToRemove = new Set(
        Array.from(selectedCols)
          .map((idx) => columns[idx]?.id)
          .filter(Boolean),
      );
      setColumns((prev) =>
        prev.filter((c) => !c.id || !colIdsToRemove.has(c.id)),
      );
      setData((prev) =>
        prev.map((row) => {
          const next = { ...row };
          colIdsToRemove.forEach((id) => {
            if (id) delete next[id];
          });
          return next;
        }),
      );
    }

    setSelection(emptySelection);
  }, [selection, columns]);

  // --- Keyboard shortcut: Delete/Backspace removes selected rows/cols ---
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const hasFullRowOrColSelection =
          selection.rows.length > 0 || selection.columns.length > 0;
        if (hasFullRowOrColSelection) {
          event.preventDefault();
          deleteSelected();
        }
      }
    },
    [selection, deleteSelected],
  );

  return (
    <div className="flex flex-col h-full" onKeyDown={onKeyDown}>
      <div className="h-full rounded-xl overflow-hidden border border-gray-200">
        <DataEditor
          getCellContent={getCellContent}
          columns={columns}
          rows={data.length}
          rowHeight={getRowHeight}
          onCellEdited={onCellEdited}
          onColumnResize={onColumnResize}
          onVisibleRegionChanged={onVisibleRegionChanged}
          rowMarkers="both"
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          rangeSelect="multi-rect"
          columnSelect="multi"
          rowSelect="multi"
          getCellsForSelection={true}
          width="100%"
          customRenderers={[testStatusCellRenderer, authorSuggestCellRenderer]}
          theme={{
            bgHeader: "#f9fafb",
            borderColor: "#e5e7eb",
            horizontalBorderColor: "#e5e7eb",
          }}
        />
      </div>
    </div>
  );
};

export default SheetTable;
