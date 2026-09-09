"use client";

import { Card } from "@/components/ui/card";
import {
  ArrowUp,
  ArrowDown,
  CalendarClock,
  Loader2,
  PauseCircle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

type Stage = {
  label: string;
  count: number;
  trend: number;
  icon: LucideIcon;
  fg: string;
};

const stages: Stage[] = [
  {
    label: "Planned",
    count: 18,
    trend: 8.5,
    icon: CalendarClock,
    fg: "#378ADD",
  },
  {
    label: "In progress",
    count: 42,
    trend: 15.2,
    icon: Loader2,
    fg: "#6D5DF2",
  },
  { label: "On hold", count: 7, trend: -4.1, icon: PauseCircle, fg: "#D85A30" },
  {
    label: "Completed",
    count: 63,
    trend: 22.5,
    icon: CheckCircle2,
    fg: "#0D9488",
  },
];

function StatusItem({ label, count, trend, icon: Icon, fg }: Stage) {
  const isUp = trend >= 0;
  const TrendIcon = isUp ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-1 items-center gap-4 px-6 py-5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${fg}1A` }}
      >
        <Icon className="h-4 w-4" style={{ color: fg }} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">{count}</span>
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isUp ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StatusOverview() {
  return (
    <Card className="rounded-2xl border-border/60 p-0 shadow-sm">
      <div className="flex flex-col divide-y divide-border/60 sm:flex-row sm:divide-x sm:divide-y-0">
        {stages.map((s) => (
          <StatusItem key={s.label} {...s} />
        ))}
      </div>
    </Card>
  );
}
