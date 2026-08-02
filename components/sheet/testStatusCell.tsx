import {
  CustomCell,
  CustomRenderer,
  GridCellKind,
  DrawArgs,
  getMiddleCenterBias,
} from "@glideapps/glide-data-grid";

export const TEST_STATUS_COL_ID = "testStatus";
export const TEST_STATUS_OPTIONS = ["OK", "KO"] as const;
export type TestStatusValue = "" | (typeof TEST_STATUS_OPTIONS)[number];

export interface TestStatusCellProps {
  readonly kind: "test-status-cell";
  readonly value: TestStatusValue;
}
export type TestStatusCell = CustomCell<TestStatusCellProps>;

export const testStatusCellRenderer: CustomRenderer<TestStatusCell> = {
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
