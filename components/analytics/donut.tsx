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
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type PipelineStageStat = {
  label: string;
  count: number;
};

// Map stages to their UI representation
const STAGE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  "In progress": { icon: Loader2, color: "#2563EB" },
  "Ready for dry run": { icon: ClipboardCheck, color: "#6D5DF2" },
  "Dry run in progress": { icon: FlaskConical, color: "#DB2777" },
  "Ready for TC": { icon: ListChecks, color: "#16A34A" },
  "TC Done": { icon: CheckCircle2, color: "#0D9488" },
  "TC Correction": { icon: Pencil, color: "#EA580C" },
  "Ready for QC": { icon: ClipboardCheck, color: "#CA8A04" },
  "Ready for Delivery": { icon: Truck, color: "#0284C7" },
  Delivered: { icon: PackageCheck, color: "#22A559" },
  "Out of scope": { icon: Ban, color: "#9333EA" },
  Blocked: { icon: Lock, color: "#DC2626" },
};

const DEFAULT_CONFIG = { icon: HelpCircle, color: "#94A3B8" };

export default function PipelineDonut({
  data,
  total,
}: {
  data: PipelineStageStat[];
  total: number;
}) {
  // Merge the raw data with styling configuration
  const stages = React.useMemo(() => {
    return data.map((stat) => ({
      ...stat,
      ...(STAGE_CONFIG[stat.label] || DEFAULT_CONFIG),
    }));
  }, [data]);

  // Generate chart config dynamically for shadcn/ui tooltips
  const chartConfig = React.useMemo(() => {
    return stages.reduce((acc, s) => {
      acc[s.label] = { label: s.label, color: s.color };
      return acc;
    }, {} as ChartConfig);
  }, [stages]);

  if (total === 0) {
    return (
      <Card className="h-full rounded-2xl border-border/60 shadow-sm flex items-center justify-center min-h-[350px]">
        <p className="text-muted-foreground text-sm">
          No pipeline data available
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            Pipeline overview
          </CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total.toLocaleString()} items across {stages.length} stages
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
                <Cell key={entry.label} fill={entry.color} />
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
          {stages.map((s) => {
            const percentage = Math.round((s.count / total) * 100);
            return (
              <span key={s.label} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate text-muted-foreground">
                  {s.label}
                  <span className="ml-1 text-foreground/70">{percentage}%</span>
                </span>
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
