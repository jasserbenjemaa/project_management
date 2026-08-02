import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
} from "@glideapps/glide-data-grid";
import { useState, useRef, useEffect, useMemo } from "react";

export const AUTHOR_COL_ARTIFACT_TYPE: Record<string, string> = {
  authorLLR: "LLR",
  authorLLT: "LLT",
};

export interface AuthorSuggestCellProps {
  readonly kind: "author-suggest-cell";
  readonly text: string;
  readonly suggestions: readonly string[];
}
export type AuthorSuggestCell = CustomCell<AuthorSuggestCellProps>;

export const authorSuggestCellRenderer: CustomRenderer<AuthorSuggestCell> = {
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
