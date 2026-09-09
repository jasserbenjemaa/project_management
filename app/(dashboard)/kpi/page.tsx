"use client";

import KpiHeader from "@/components/analytics/header";
import StatusOverview from "@/components/analytics/cards";
import PipelineDonut from "@/components/analytics/donut";
import CalendarDemo from "@/components/analytics/calender";
import ConsultantsTable from "@/components/analytics/table";

export default function KpiDashboard() {
  return (
    <div className="h-full min-h-screen overflow-y-auto bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-6 p-6 pb-12 lg:p-8">
        <KpiHeader />

        <StatusOverview />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PipelineDonut />
          </div>
          <div className="lg:col-span-2">
            <CalendarDemo />
          </div>
        </div>

        <ConsultantsTable />
      </div>
    </div>
  );
}
