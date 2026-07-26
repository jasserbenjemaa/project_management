"use client";

import React from "react";
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
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

// ---- Types ----
type RowData = Record<string, string>;

const TEST_STATUS_COL_ID = "testStatus";
const TEST_STATUS_OPTIONS = ["OK", "KO"] as const;
type TestStatusValue = "" | (typeof TEST_STATUS_OPTIONS)[number];

// ---- Custom "Test Status" dropdown cell ----
// Renders as a colored pill (green = OK, red = KO) and opens a small
// dropdown overlay on click to change the value.
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

    const paddingX = 8;
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

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            padding: 4,
            minWidth: 100,
          }}
        >
          {TEST_STATUS_OPTIONS.map((opt) => {
            const isOk = opt === "OK";
            const isSelected = current === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange({
                    ...value,
                    data: { ...value.data, value: opt },
                  });
                  onFinishedEditing({
                    ...value,
                    data: { ...value.data, value: opt },
                  });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: isSelected ? "#f3f4f6" : "transparent",
                  color: isOk ? "#15803d" : "#b91c1c",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: isOk ? "#22c55e" : "#ef4444",
                  }}
                />
                {opt}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onChange({ ...value, data: { ...value.data, value: "" } });
              onFinishedEditing({
                ...value,
                data: { ...value.data, value: "" },
              });
            }}
            style={{
              marginTop: 2,
              padding: "6px 10px",
              border: "none",
              borderRadius: 6,
              background: "transparent",
              color: "#6b7280",
              fontSize: 12,
              cursor: "pointer",
              textAlign: "left",
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

// ---- Column config ----
// Columns that, when Test Status is "KO", should visually flag as
// needing attention (IQA + Comment LLT). We don't force values into them,
// we just make sure they're easy to spot / fill in.
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

const initialData: RowData[] = [
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

const SheetTable = () => {
  const [columns, setColumns] = React.useState<GridColumn[]>(initialColumns);
  const [data, setData] = React.useState<RowData[]>(initialData);
  const [selection, setSelection] =
    React.useState<GridSelection>(emptySelection);

  // --- Read a cell ---
  const getCellContent = React.useCallback(
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
        themeOverride: shouldHighlight ? { bgCell: "#fef2f2" } : undefined,
      };
    },
    [columns, data],
  );

  // --- Edit a cell ---
  const onCellEdited = React.useCallback(
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

      if (newValue.kind !== GridCellKind.Text) return;

      setData((prev) => {
        const next = [...prev];
        next[row] = { ...next[row], [colId]: newValue.data };
        return next;
      });
    },
    [columns],
  );

  // --- Add a new empty row ---
  const addRow = React.useCallback(() => {
    setData((prev) => {
      const emptyRow: RowData = {};
      columns.forEach((c) => {
        if (c.id) emptyRow[c.id] = "";
      });
      return [...prev, emptyRow];
    });
  }, [columns]);

  // --- Column resize ---
  const onColumnResize = React.useCallback(
    (column: GridColumn, newSize: number) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === column.id ? { ...c, width: newSize } : c)),
      );
    },
    [],
  );

  // --- Delete whatever rows/columns are currently selected ---
  const deleteSelected = React.useCallback(() => {
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
  const onKeyDown = React.useCallback(
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

  const hasSelection =
    selection.rows.length > 0 || selection.columns.length > 0;

  return (
    <div className="flex flex-col p-2 max-h-svh" onKeyDown={onKeyDown}>
      <div className="h-full rounded-xl overflow-hidden border border-gray-200">
        <DataEditor
          getCellContent={getCellContent}
          columns={columns}
          rows={data.length}
          onCellEdited={onCellEdited}
          onColumnResize={onColumnResize}
          rowMarkers="both"
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          rangeSelect="multi-rect"
          columnSelect="multi"
          rowSelect="multi"
          getCellsForSelection={true}
          width="100%"
          customRenderers={[testStatusCellRenderer]}
          theme={{
            bgHeader: "#f9fafb",
            borderColor: "#e5e7eb",
            horizontalBorderColor: "#e5e7eb",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          marginLeft: 4,
        }}
      >
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!hasSelection}
          title="Delete selected rows/columns"
          aria-label="Delete selected rows/columns"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: hasSelection ? "#fff" : "#f9fafb",
            cursor: hasSelection ? "pointer" : "not-allowed",
            color: hasSelection ? "#b91c1c" : "#9ca3af",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (hasSelection) e.currentTarget.style.background = "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = hasSelection
              ? "#fff"
              : "#f9fafb";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={addRow}
          title="Add a new row"
          aria-label="Add a new row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 32,
            padding: "0 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
            color: "#374151",
            fontSize: 13,
            fontWeight: 500,
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New row
        </button>
      </div>
    </div>
  );
};

export default SheetTable;
