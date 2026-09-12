"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  Clock,
  AlertTriangle,
  TrendingUp,
  Gauge,
  type LucideIcon,
} from "lucide-react";

type Metric = {
  label: string;
  value: string;
  icon: LucideIcon;
  fg: string;
};

const metrics: Metric[] = [
  { label: "Projects", value: "128", icon: FolderKanban, fg: "#378ADD" },
  { label: "On time", value: "87%", icon: Clock, fg: "#16A34A" },
  { label: "At risk", value: "12", icon: AlertTriangle, fg: "#DC2626" },
  { label: "Progress", value: "76%", icon: TrendingUp, fg: "#6D5DF2" },
  { label: "Utilization", value: "82%", icon: Gauge, fg: "#0D9488" },
];

function MetricItem({ label, value, icon: Icon, fg }: Metric) {
  return (
    <div className="flex flex-1 items-center gap-3 px-6 py-5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${fg}1A` }}
      >
        <Icon className="h-4 w-4" style={{ color: fg }} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
      </div>
    </div>
  );
}

export default function ProjectAnalyticsHeader() {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base font-semibold">
          Project management analytics
        </CardTitle>
      </CardHeader>
      <div className="flex flex-col divide-y divide-border/60 sm:flex-row sm:divide-x sm:divide-y-0">
        {metrics.map((m) => (
          <MetricItem key={m.label} {...m} />
        ))}
      </div>
    </Card>
  );
}
