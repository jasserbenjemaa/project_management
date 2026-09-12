"use client";

import * as React from "react";
import { Label, Pie, PieChart, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getProjectStatusHealth } from "@/app/actions/projects";
import type { ProjectHealth } from "@/app/actions/projects";

type StatusSlice = {
  label: string;
  count: number;
  fg: string;
};

// Same health categories and colors the calendar widget uses for its
// dot colors — kept in sync via deriveProjectHealth in projects.ts, so
// "On track" always means the same thing across the dashboard.
const HEALTH_META: Record<ProjectHealth, { label: string; fg: string }> = {
  ON_TRACK: { label: "On track", fg: "#16A34A" },
  AT_RISK: { label: "At risk", fg: "#D97706" },
  DELAYED: { label: "Delayed", fg: "#DC2626" },
  COMPLETED: { label: "Completed", fg: "#2563EB" },
};

const HEALTH_ORDER: ProjectHealth[] = [
  "ON_TRACK",
  "AT_RISK",
  "DELAYED",
  "COMPLETED",
];

export default function ProjectStatus() {
  const [slices, setSlices] = React.useState<StatusSlice[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getProjectStatusHealth()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setTotal(result.total);
          const byHealth = new Map(
            result.counts.map((c) => [c.health, c.count]),
          );
          setSlices(
            HEALTH_ORDER.filter(
              (health) => (byHealth.get(health) ?? 0) > 0,
            ).map((health) => ({
              label: HEALTH_META[health].label,
              fg: HEALTH_META[health].fg,
              count: byHealth.get(health) ?? 0,
            })),
          );
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load project status.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const chartConfig = React.useMemo(
    () =>
      (slices ?? []).reduce((acc, s) => {
        acc[s.label] = { label: s.label, color: s.fg };
        return acc;
      }, {} as ChartConfig),
    [slices],
  );

  return (
    <Card className="h-full rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Project status
        </CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {total} projects by current status
        </p>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!error && !slices && (
          <div className="mx-auto flex aspect-square max-h-[220px] items-center justify-center">
            <div className="h-40 w-40 animate-pulse rounded-full bg-muted" />
          </div>
        )}

        {!error && slices && slices.length === 0 && (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        )}

        {!error && slices && slices.length > 0 && (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[220px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={100}
                  strokeWidth={4}
                  paddingAngle={2}
                >
                  {slices.map((entry) => (
                    <Cell key={entry.label} fill={entry.fg} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold"
                            >
                              {total}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 22}
                              className="fill-muted-foreground text-sm"
                            >
                              Projects
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {slices.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: s.fg }}
                  />
                  <span className="truncate text-muted-foreground">
                    {s.label}
                    <span className="ml-1 text-foreground/70">
                      {total > 0 ? Math.round((s.count / total) * 100) : 0}%
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
