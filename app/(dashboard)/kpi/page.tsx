"use client";

import KpiHeader from "@/components/analytics/header";
import PipelineDonut from "@/components/analytics/donut";
import CalendarDemo from "@/components/analytics/calender";
import ConsultantsTable from "@/components/analytics/table";
import ProjectStatus from "@/components/analytics/project-status";
import ProjectProgress from "@/components/analytics/project-progress";
import TaskDeliveryTrend from "@/components/analytics/task-delivery-trend";

export default function FullAnalyticsDashboard() {
  return (
    <div className="h-full min-h-screen overflow-y-auto bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-6 p-6 pb-12 lg:p-8">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">KPI</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all the KPIs in one place.
          </p>
        </div>
        <KpiHeader />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PipelineDonut />
          </div>
          <div className="lg:col-span-2">
            <CalendarDemo />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProjectStatus />
          <ProjectProgress />
        </div>

        <TaskDeliveryTrend />

        <ConsultantsTable />
      </div>
    </div>
  );
}
