import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
  getMiddleCenterBias,
} from "@glideapps/glide-data-grid";

// Strict select for the IQA sheet's level(LLR,LLT,HLT,Architecture,code
// review) column — same pattern as priority-cell.tsx / its-status-cell.tsx.
// Deliberately its own component rather than reusing the User.artifact_type
// enum's labels directly: this is a per-row classification on the IQA
// sheet, not a claim about which user has which artifact_type.
export const LEVEL_COL_ID = "iqaLevel";
export const LEVEL_OPTIONS = [
  "LLR",
  "LLT",
  "HLT",
  "Architecture",
  "Code review",
] as const;
export type LevelValue = "" | (typeof LEVEL_OPTIONS)[number];

export const LEVEL_COLORS: Record<string, { bg: string; fg: string }> = {
  LLR: { bg: "#e0e7ff", fg: "#4338ca" },
  LLT: { bg: "#dbeafe", fg: "#1d4ed8" },
  HLT: { bg: "#ccfbf1", fg: "#0f766e" },
  Architecture: { bg: "#f3e8ff", fg: "#7e22ce" },
  "Code review": { bg: "#fef9c3", fg: "#a16207" },
};

export interface LevelCellProps {
  readonly kind: "level-cell";
  readonly value: LevelValue;
}
export type LevelCell = CustomCell<LevelCellProps>;

const isLevelValue = (val: string): val is LevelValue =>
  (LEVEL_OPTIONS as readonly string[]).includes(val);

export const levelCellRenderer: CustomRenderer<LevelCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is LevelCell =>
    (cell.data as any)?.kind === "level-cell",
  draw: (args: DrawArgs<LevelCell>) => {
    const { ctx, theme, rect, cell } = args;
    const { value } = cell.data;
    const colors = value ? LEVEL_COLORS[value] : undefined;

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
      // Clip long labels ("Code review", "Architecture") rather than
      // overflow into the next cell.
      const maxTextWidth = pillWidth - 12;
      let label = value;
      if (textWidth > maxTextWidth) {
        while (
          label.length > 1 &&
          ctx.measureText(label + "…").width > maxTextWidth
        ) {
          label = label.slice(0, -1);
        }
        label += "…";
      }
      ctx.fillText(label, pillX + pillWidth / 2, textY);

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

      const choose = (next: LevelValue) => {
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
            minWidth: 180,
            overflow: "hidden",
          }}
        >
          {LEVEL_OPTIONS.map((opt) => {
            const colors = LEVEL_COLORS[opt];
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
    value: isLevelValue(val.trim()) ? (val.trim() as LevelValue) : "",
  }),
};
