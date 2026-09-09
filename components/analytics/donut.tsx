"use client";

import * as React from "react";
import { Label, Pie, PieChart, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  FlaskConical,
  Loader2,
  ClipboardCheck,
  CheckCircle2,
  Pencil,
  ListChecks,
  Truck,
  PackageCheck,
  Ban,
  Lock,
  type LucideIcon,
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type Stage = {
  label: string;
  count: number;
  icon: LucideIcon;
  fg: string;
};

const stages: Stage[] = [
  { label: "In progress", count: 42, icon: Loader2, fg: "#2563EB" },
  {
    label: "Ready for dry run",
    count: 15,
    icon: ClipboardCheck,
    fg: "#6D5DF2",
  },
  { label: "Dry run in progress", count: 9, icon: FlaskConical, fg: "#DB2777" },
  { label: "Ready for TC", count: 21, icon: ListChecks, fg: "#16A34A" },
  { label: "TC Done", count: 63, icon: CheckCircle2, fg: "#0D9488" },
  { label: "TC Correction", count: 6, icon: Pencil, fg: "#EA580C" },
  { label: "Ready for QC", count: 18, icon: ClipboardCheck, fg: "#CA8A04" },
  { label: "Ready for Delivery", count: 11, icon: Truck, fg: "#0284C7" },
  { label: "Delivered", count: 87, icon: PackageCheck, fg: "#22A559" },
  { label: "Out of scope", count: 4, icon: Ban, fg: "#9333EA" },
  { label: "Blocked", count: 3, icon: Lock, fg: "#DC2626" },
];

const chartConfig = stages.reduce((acc, s) => {
  acc[s.label] = { label: s.label, color: s.fg };
  return acc;
}, {} as ChartConfig);

export default function PipelineDonut() {
  const total = React.useMemo(
    () => stages.reduce((acc, curr) => acc + curr.count, 0),
    [],
  );

  return (
    <Card className="h-full rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            Pipeline overview
          </CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total.toLocaleString()} items across 11 stages
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
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
              data={stages}
              dataKey="count"
              nameKey="label"
              innerRadius={70}
              outerRadius={100}
              strokeWidth={4}
              paddingAngle={1.5}
            >
              {stages.map((entry) => (
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
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-sm"
                        >
                          Items
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          {stages.map((s) => (
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
