// components/circular-progress.tsx
interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
}
export function CircularProgress({
  value,
  size = 36,
  strokeWidth = 4,
}: CircularProgressProps) {
  const clamped = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 100
      ? "stroke-green-500"
      : clamped >= 50
        ? "stroke-primary"
        : "stroke-amber-500";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`fill-none transition-all duration-300 ${color}`}
        />
      </svg>
      <span className="absolute text-[10px] font-medium">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
