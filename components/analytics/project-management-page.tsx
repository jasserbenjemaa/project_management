"use client";

import ProjectStatus from "@/components/analytics/project-status";
import ProjectProgress from "@/components/analytics/project-progress";
import TaskDeliveryTrend from "@/components/analytics/task-delivery-trend";

export default function ProjectManagementDashboard() {
  return (
    <div className="h-full min-h-screen overflow-y-auto bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-6 p-6 pb-12 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProjectStatus />
          <ProjectProgress />
        </div>

        <TaskDeliveryTrend />
      </div>
    </div>
  );
}
