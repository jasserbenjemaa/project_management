import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
  getMiddleCenterBias,
} from "@glideapps/glide-data-grid";

// Strict select, same spirit as Test Status: the "Priority" column only
// ever holds one of PRIORITY_OPTIONS (or empty). Unlike Author/Status LLT,
// there is no free-text fallback — the ITS sheet's priority(high,medium,low)
// spec calls for a real dropdown, not a suggestion box, so callers that key
// off this value (sorting, filtering, highlighting) never see an
// unrecognized string.
// NOTE: deliberately not "priority" — the Progress Sheet already has a
// numeric-rank column with that id (see initialColumns/seedData in
// sheet-table.tsx). Reusing it here would silently reinterpret that
// column's numbers as this High/Medium/Low select.
export const PRIORITY_COL_ID = "itsPriority";
export const PRIORITY_OPTIONS = ["High", "Medium", "Low"] as const;
export type PriorityValue = "" | (typeof PRIORITY_OPTIONS)[number];

export const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  High: { bg: "#fee2e2", fg: "#b91c1c" },
  Medium: { bg: "#fef9c3", fg: "#a16207" },
  Low: { bg: "#dcfce7", fg: "#15803d" },
};

export interface PriorityCellProps {
  readonly kind: "priority-cell";
  readonly value: PriorityValue;
}
export type PriorityCell = CustomCell<PriorityCellProps>;

const isPriorityValue = (val: string): val is PriorityValue =>
  (PRIORITY_OPTIONS as readonly string[]).includes(val);

export const priorityCellRenderer: CustomRenderer<PriorityCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is PriorityCell =>
    (cell.data as any)?.kind === "priority-cell",
  draw: (args: DrawArgs<PriorityCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { value } = cell.data;
    const colors = value ? PRIORITY_COLORS[value] : undefined;

    ctx.save();

    if (colors) {
      const pillHeight = 22;
      const pillY = rect.y + (rect.height - pillHeight) / 2;
      const pillX = rect.x + 8;

      ctx.font = `600 12px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(value).width;
      const pillWidth = Math.min(rect.width - 16, Math.max(56, textWidth + 24));

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
      ctx.textAlign = "center";
      const textY =
        pillY +
        pillHeight / 2 +
        getMiddleCenterBias(ctx, `600 12px ${theme.fontFamily}`);
      ctx.fillText(value, pillX + pillWidth / 2, textY);

      // little chevron, same hint used on Test Status
      const chevronX = pillX + pillWidth + 10;
      const chevronY = rect.y + rect.height / 2;
      ctx.strokeStyle = theme.textLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chevronX - 4, chevronY - 2);
      ctx.lineTo(chevronX, chevronY + 2);
      ctx.lineTo(chevronX + 4, chevronY - 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = theme.textLight;
      ctx.font = `13px ${theme.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "Select…",
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
      const current = value.data.value;

      const choose = (next: PriorityValue) => {
        const updated = { ...value, data: { ...value.data, value: next } };
        onChange(updated);
        onFinishedEditing(updated);
      };

      return (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          {PRIORITY_OPTIONS.map((opt) => {
            const colors = PRIORITY_COLORS[opt];
            return (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(opt);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  border: "none",
                  background: current === opt ? "#f3f4f6" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: colors.bg,
                    color: colors.fg,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {opt}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              choose("");
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
  onPaste: (val, cellData) => ({
    ...cellData,
    value: isPriorityValue(val.trim()) ? (val.trim() as PriorityValue) : "",
  }),
};
