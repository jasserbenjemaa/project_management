"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DeliveryTrendPoint } from "@/app/actions/stats";

const chartConfig = {
  delivered: {
    label: "Tasks delivered",
    color: "#2563EB",
  },
} satisfies ChartConfig;

export default function TaskDeliveryTrend({
  data = [],
}: {
  // Fetch with getTaskDeliveryTrend() in an async server component (see
  // components/analytics/task-delivery-trend-section.tsx) and pass the
  // result down — this component stays client-side purely because
  // recharts needs the browser to render.
  data?: DeliveryTrendPoint[];
}) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Task delivery trend
        </CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tasks delivered per day across the last two sprints
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-delivered)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-delivered)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={1}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="delivered"
              type="monotone"
              fill="url(#fillDelivered)"
              stroke="var(--color-delivered)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
