import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
} from "@glideapps/glide-data-grid";
import { useState, useRef, useEffect } from "react";

// ---- Format rules per column -------------------------------------------
// Empty cells are never flagged — only cells that have content but don't
// match the expected shape. Adjust these regexes/examples if the real
// convention differs from what's below (these are best-effort guesses
// based on the description given):
//
//   llrId:        REQ-S001-FUNCT-NAME1
//   functionName: Funct-Name1 Funct-Name2   (one or more, space separated)
//   fileC:        funct-name.c funct-name2.c (one or more, space separated)
//   its:          ITS#1234
//   iqa:          IQA#1234
export const FORMAT_RULES: Record<
  string,
  { pattern: RegExp; example: string }
> = {
  llrId: {
    pattern: /^REQ-[A-Za-z0-9]{4}-FUNCT-[A-Za-z0-9]+$/,
    example: "REQ-SDDD-FUNCT-NAME1",
  },
  functionName: {
    pattern: /^Funct-[A-Za-z0-9]+(\s+Funct-[A-Za-z0-9]+)*$/,
    example: "Funct-Name1 Funct-Name2",
  },
  fileC: {
    pattern: /^[A-Za-z0-9_-]+\.c(\s+[A-Za-z0-9_-]+\.c)*$/,
    example: "funct-name.c funct-name2.c",
  },
  its: {
    pattern: /^ITS#\d+$/,
    example: "ITS#1234",
  },
  iqa: {
    pattern: /^IQA#\d+$/,
    example: "IQA#1234",
  },
};

export const FORMAT_CHECKED_COL_IDS = new Set(Object.keys(FORMAT_RULES));

export const isValidFormat = (colId: string, value: string): boolean => {
  const rule = FORMAT_RULES[colId];
  if (!rule || !value) return true;
  return rule.pattern.test(value.trim());
};

export interface FormatCheckedCellProps {
  readonly kind: "format-checked-cell";
  readonly text: string;
  readonly colId: string;
}
export type FormatCheckedCell = CustomCell<FormatCheckedCellProps>;

// Red spellcheck-style squiggle under the text.
function drawWavyUnderline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) {
  const amplitude = 1.5;
  const step = 4;
  ctx.save();
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  let up = true;
  for (let dx = 0; dx <= width; dx += step) {
    const yy = y + (up ? -amplitude : amplitude);
    ctx.lineTo(x + dx, yy);
    up = !up;
  }
  ctx.stroke();
  ctx.restore();
}

export const formatCheckedCellRenderer: CustomRenderer<FormatCheckedCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is FormatCheckedCell =>
    (cell.data as any)?.kind === "format-checked-cell",
  draw: (args: DrawArgs<FormatCheckedCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { text, colId } = cell.data;
    const valid = isValidFormat(colId, text);

    ctx.save();
    ctx.fillStyle = text ? theme.textDark : theme.textLight;
    ctx.font = `13px ${theme.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const textX = rect.x + 8;
    const textY = rect.y + rect.height / 2;
    const maxWidth = rect.width - 16;
    ctx.fillText(text || "", textX, textY, maxWidth);

    if (text && !valid) {
      const textWidth = Math.min(ctx.measureText(text).width, maxWidth);
      drawWavyUnderline(ctx, textX, textY + 8, textWidth);
    }

    ctx.restore();
    return true;
  },
  provideEditor: () => ({
    editor: (p) => {
      const { value, onChange, onFinishedEditing } = p;
      const { text: initialText, colId } = value.data;
      const [inputValue, setInputValue] = useState(initialText);
      const inputRef = useRef<HTMLInputElement>(null);
      const rule = FORMAT_RULES[colId];
      const valid = isValidFormat(colId, inputValue);

      useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, []);

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
            minWidth: 240,
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
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              border: "none",
              outline: "none",
              fontSize: 13,
            }}
          />
          {rule && inputValue && !valid && (
            <div
              style={{
                padding: "6px 10px",
                fontSize: 11,
                color: "#b91c1c",
                borderTop: "1px solid #fee2e2",
                background: "#fef2f2",
              }}
            >
              Expected format: {rule.example}
            </div>
          )}
        </div>
      );
    },
    disablePadding: true,
  }),
  onPaste: (val, cellData) => ({ ...cellData, text: val }),
};
