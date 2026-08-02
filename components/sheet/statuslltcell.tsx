import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
  getMiddleCenterBias,
} from "@glideapps/glide-data-grid";
import { useState, useRef, useEffect, useMemo } from "react";

// Same UX pattern as the Author suggest cell (searchable text input +
// dropdown list), but backed by a fixed set of workflow statuses instead
// of a fetched user list. Free text is still allowed on top of the
// suggestions, in case a status outside this list is ever needed.
export const STATUS_LLT_COL_ID = "statusLLTDate";
export const STATUS_LLT_OPTIONS = [
  "In progress",
  "Ready for dry run",
  "Dry run in progress",
  "Ready for TC",
  "TC Done",
  "TC Correction",
  "Ready for QC",
  "Ready for Delivery",
  "Delivered",
  "Out of scop",
  "Blocked",
] as const;

// Small color coding so the sheet is scannable at a glance, similar in
// spirit to the Test Status pill. Anything not in this map (including
// free-typed text) just renders as plain dark text.
export const STATUS_LLT_COLORS: Record<string, { bg: string; fg: string }> = {
  "In progress": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Ready for dry run": { bg: "#e0e7ff", fg: "#4338ca" },
  "Dry run in progress": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Ready for TC": { bg: "#e0e7ff", fg: "#4338ca" },
  "TC Done": { bg: "#dcfce7", fg: "#15803d" },
  "TC Correction": { bg: "#fee2e2", fg: "#b91c1c" },
  "Ready for QC": { bg: "#e0e7ff", fg: "#4338ca" },
  "Ready for Delivery": { bg: "#fef9c3", fg: "#a16207" },
  Delivered: { bg: "#dcfce7", fg: "#15803d" },
  "Out of scop": { bg: "#f3f4f6", fg: "#6b7280" },
  Blocked: { bg: "#fee2e2", fg: "#b91c1c" },
};

export interface StatusLLTCellProps {
  readonly kind: "status-llt-cell";
  readonly text: string;
}
export type StatusLLTCell = CustomCell<StatusLLTCellProps>;

export const statusLLTCellRenderer: CustomRenderer<StatusLLTCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is StatusLLTCell =>
    (cell.data as any)?.kind === "status-llt-cell",
  draw: (args: DrawArgs<StatusLLTCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { text } = cell.data;
    const colors = text ? STATUS_LLT_COLORS[text] : undefined;

    ctx.save();

    if (colors) {
      // Render known statuses as a pill, same visual language as Test Status.
      const pillHeight = 22;
      const pillY = rect.y + (rect.height - pillHeight) / 2;
      const pillX = rect.x + 8;

      ctx.font = `600 12px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(text).width;
      const pillWidth = Math.min(rect.width - 16, Math.max(60, textWidth + 24));

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
      ctx.fillStyle = colors.bg;
      ctx.fill();

      ctx.fillStyle = colors.fg;
      ctx.textAlign = "left";
      const textY =
        pillY +
        pillHeight / 2 +
        getMiddleCenterBias(ctx, `600 12px ${theme.fontFamily}`);
      // Clip long labels rather than overflow into the next cell.
      const maxTextWidth = pillWidth - 24;
      let label = text;
      if (textWidth > maxTextWidth) {
        while (
          label.length > 1 &&
          ctx.measureText(label + "…").width > maxTextWidth
        ) {
          label = label.slice(0, -1);
        }
        label += "…";
      }
      ctx.fillText(label, pillX + 12, textY);
    } else {
      // Free-typed / unrecognized text, or empty: plain text like a normal cell.
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
    }

    ctx.restore();
    return true;
  },
  provideEditor: () => ({
    editor: (p) => {
      const { value, onChange, onFinishedEditing } = p;
      const { text: initialText } = value.data;
      const [inputValue, setInputValue] = useState(initialText);
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, []);

      const filtered = useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        const pool = q
          ? STATUS_LLT_OPTIONS.filter((opt) => opt.toLowerCase().includes(q))
          : STATUS_LLT_OPTIONS;
        return pool.slice(0, 11);
      }, [inputValue]);

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(inputValue);
              }
            }}
            placeholder="Type or pick a status…"
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
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.map((opt, idx) => {
                const colors = STATUS_LLT_COLORS[opt];
                return (
                  <button
                    key={idx}
                    onClick={() => commit(opt)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        background: colors?.bg ?? "#f3f4f6",
                        color: colors?.fg ?? "#111827",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              commit("");
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 10px",
              border: "none",
              borderTop: "1px solid #f3f4f6",
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
  onPaste: (val, cellData) => ({ ...cellData, text: val }),
};
