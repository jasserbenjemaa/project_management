import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
  getMiddleCenterBias,
} from "@glideapps/glide-data-grid";

// Strict select for the ITS sheet's status(open,postponed,rejected,closed)
// column — same pattern as priority-cell.tsx. No free text: the value is
// always one of ITS_STATUS_OPTIONS or empty.
export const ITS_STATUS_COL_ID = "itsStatus";
export const ITS_STATUS_OPTIONS = [
  "Open",
  "Postponed",
  "Rejected",
  "Closed",
] as const;
export type ItsStatusValue = "" | (typeof ITS_STATUS_OPTIONS)[number];

export const ITS_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Open: { bg: "#fef9c3", fg: "#a16207" },
  Postponed: { bg: "#dbeafe", fg: "#1d4ed8" },
  Rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  Closed: { bg: "#dcfce7", fg: "#15803d" },
};

export interface ItsStatusCellProps {
  readonly kind: "its-status-cell";
  readonly value: ItsStatusValue;
}
export type ItsStatusCell = CustomCell<ItsStatusCellProps>;

const isItsStatusValue = (val: string): val is ItsStatusValue =>
  (ITS_STATUS_OPTIONS as readonly string[]).includes(val);

export const itsStatusCellRenderer: CustomRenderer<ItsStatusCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is ItsStatusCell =>
    (cell.data as any)?.kind === "its-status-cell",
  draw: (args: DrawArgs<ItsStatusCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { value } = cell.data;
    const colors = value ? ITS_STATUS_COLORS[value] : undefined;

    ctx.save();

    if (colors) {
      const pillHeight = 22;
      const pillY = rect.y + (rect.height - pillHeight) / 2;
      const pillX = rect.x + 8;

      ctx.font = `600 12px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(value).width;
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
      ctx.textAlign = "center";
      const textY =
        pillY +
        pillHeight / 2 +
        getMiddleCenterBias(ctx, `600 12px ${theme.fontFamily}`);
      ctx.fillText(value, pillX + pillWidth / 2, textY);

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

      const choose = (next: ItsStatusValue) => {
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
            minWidth: 170,
            overflow: "hidden",
          }}
        >
          {ITS_STATUS_OPTIONS.map((opt) => {
            const colors = ITS_STATUS_COLORS[opt];
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
    value: isItsStatusValue(val.trim()) ? (val.trim() as ItsStatusValue) : "",
  }),
};
