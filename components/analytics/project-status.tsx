"use client";

import * as React from "react";
import { Label, Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type Status = {
  label: string;
  count: number;
  fg: string;
};

const statuses: Status[] = [
  { label: "On track", count: 78, fg: "#16A34A" },
  { label: "At risk", count: 12, fg: "#D97706" },
  { label: "Delayed", count: 9, fg: "#DC2626" },
  { label: "Completed", count: 29, fg: "#2563EB" },
];

const chartConfig = statuses.reduce((acc, s) => {
  acc[s.label] = { label: s.label, color: s.fg };
  return acc;
}, {} as ChartConfig);

export default function ProjectStatus() {
  const total = React.useMemo(
    () => statuses.reduce((acc, curr) => acc + curr.count, 0),
    [],
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
              data={statuses}
              dataKey="count"
              nameKey="label"
              innerRadius={70}
              outerRadius={100}
              strokeWidth={4}
              paddingAngle={2}
            >
              {statuses.map((entry) => (
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
          {statuses.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: s.fg }}
              />
              <span className="truncate text-muted-foreground">
                {s.label}
                <span className="ml-1 text-foreground/70">
                  {Math.round((s.count / total) * 100)}%
                </span>
              </span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
