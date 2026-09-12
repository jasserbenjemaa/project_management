"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarClock,
  Loader2,
  PauseCircle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { getProjectStatusOverview } from "@/app/actions/projects";
import type { ProjectStatus } from "@/app/generated/prisma/enums";

type Stage = {
  label: string;
  count: number;
  icon: LucideIcon;
  fg: string;
};

// Display metadata per status — order here controls display order.
const STATUS_META: Record<
  ProjectStatus,
  { label: string; icon: LucideIcon; fg: string }
> = {
  PLANNED: { label: "Planned", icon: CalendarClock, fg: "#378ADD" },
  ACTIVE: { label: "In progress", icon: Loader2, fg: "#6D5DF2" },
  ON_HOLD: { label: "On hold", icon: PauseCircle, fg: "#D85A30" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, fg: "#0D9488" },
};

const STATUS_ORDER: ProjectStatus[] = [
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
];

function StatusItem({ label, count, icon: Icon, fg }: Stage) {
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
        <span className="text-2xl font-semibold tracking-tight">{count}</span>
      </div>
    </div>
  );
}

function StatusItemSkeleton() {
  return (
    <div className="flex flex-1 items-center gap-4 px-6 py-5">
      <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-col gap-1.5">
        <span className="h-3.5 w-16 animate-pulse rounded bg-muted" />
        <span className="h-6 w-10 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function StatusOverview() {
  const [stages, setStages] = React.useState<Stage[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getProjectStatusOverview()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          const byStatus = new Map(result.stats.map((s) => [s.status, s]));
          setStages(
            STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              const stat = byStatus.get(status);
              return {
                label: meta.label,
                icon: meta.icon,
                fg: meta.fg,
                count: stat?.count ?? 0,
              };
            }),
          );
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Failed to load project management analytics.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base font-semibold">
          Project management analytics
        </CardTitle>
      </CardHeader>
      {error ? (
        <p className="px-6 py-5 text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60 sm:flex-row sm:divide-x sm:divide-y-0">
          {stages
            ? stages.map((s) => <StatusItem key={s.label} {...s} />)
            : STATUS_ORDER.map((status) => <StatusItemSkeleton key={status} />)}
        </div>
      )}
    </Card>
  );
}
