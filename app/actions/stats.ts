"use server";

import { db } from "@/lib/db";
import { getUserKpiForRole } from "@/lib/kpi";
import type { Artifact } from "@/app/generated/prisma/enums";

// Keep in sync with the Specialty union in features/team-columns.tsx.
export type Specialty = "HLT" | "LLR" | "LLT" | "Code Review" | "Architecture";

const ARTIFACT_TO_SPECIALTY: Record<Artifact, Specialty> = {
  HLT: "HLT",
  LLR: "LLR",
  LLT: "LLT",
  CODE_REVIEW: "Code Review",
  ARCHITECTURE: "Architecture",
};

export type ConsultantRow = {
  id: string;
  name: string;
  specialty: Specialty;
  progression: number; // 0-100, % of this consultant's assigned tasks (as LLR) that are DELIVERED
  projects: string[]; // distinct project names they're assigned to
  kpi: number; // getUserKpiForRole(id, "LLR").kpi, rounded — see kpi.ts for the formula
};

// Powers the Consultants tab of the Team table. Progression and KPI are
// both computed off the LLR assignment specifically (Task.assigneeLLRId),
// per how KPI is scoped in actions/kpi.ts — a consultant who's only ever
// an LLT author will show progression 0 / kpi 0 here, not an error, just
// no LLR-assigned tasks to measure.
export async function getConsultantsOverview(): Promise<ConsultantRow[]> {
  const consultants = await db.user.findMany({
    where: { role: "CONSULTANT" },
    select: {
      id: true,
      name: true,
      artifact_type: true,
      assignments: { select: { projectName: true } },
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    consultants.map(async (c) => {
      const [assignedCount, deliveredCount, llrKpi] = await Promise.all([
        db.task.count({ where: { assigneeLLRId: c.id } }),
        db.task.count({
          where: { assigneeLLRId: c.id, status: "DELIVERED" },
        }),
        getUserKpiForRole(c.id, "LLR"),
      ]);

      const progression =
        assignedCount > 0
          ? Math.round((deliveredCount / assignedCount) * 100)
          : 0;

      // Assignment.projectName is a point-in-time snapshot (survives
      // project deletion), and the same project can appear more than
      // once if reassigned, so dedupe for display.
      const projects = [...new Set(c.assignments.map((a) => a.projectName))];

      return {
        id: c.id,
        name: c.name,
        // artifact_type is nullable on User; default to LLR display
        // rather than widening Specialty with an "Unset" case just for
        // this table.
        specialty: c.artifact_type
          ? ARTIFACT_TO_SPECIALTY[c.artifact_type]
          : "LLR",
        progression,
        projects,
        kpi: Math.round(llrKpi.kpi),
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Task delivery trend
// ---------------------------------------------------------------------------

export type DeliveryTrendPoint = { day: string; delivered: number };

const TREND_DAYS = 14;

// "Delivered on day X" is approximated by Task.updatedAt while status is
// DELIVERED — same caveat as the KPI on-time calculation in kpi.ts: if a
// task is edited again after delivery, its updatedAt moves and it will
// count on the wrong day here too. A dedicated `deliveredAt` column (set
// once, on the first DELIVERED transition) would remove this caveat for
// both this trend and the KPI calc.
export async function getTaskDeliveryTrend(): Promise<DeliveryTrendPoint[]> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (TREND_DAYS - 1));
  start.setUTCHours(0, 0, 0, 0);

  const delivered = await db.task.findMany({
    where: { status: "DELIVERED", updatedAt: { gte: start } },
    select: { updatedAt: true },
  });

  // Bucket by UTC calendar day, keyed as YYYY-MM-DD — deliberately not
  // using Intl/locale date formatting here (see the aria-valuetext
  // hydration issue from the Progress bar): a plain manual format keeps
  // the string byte-identical between server render and client render.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const counts = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    counts.set(dayKey(d), 0);
  }
  for (const task of delivered) {
    const key = dayKey(task.updatedAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].map(([key, count]) => {
    const [, month, day] = key.split("-");
    return { day: `${month}/${day}`, delivered: count };
  });
}

export type ManagerRow = {
  id: string;
  name: string;
  projects: string[]; // distinct names of every project they're assigned to
  progression: number; // 0-100, % of ALL tasks across their projects (any assignee) that are DELIVERED
  completionRate: number; // 0-100, % of their assigned projects with status COMPLETED
};

// Unlike consultant progression (scoped to that person's own assigned
// tasks), a manager's progression rolls up every Task in every project
// they're on — they're responsible for the project's delivery as a
// whole, not a personal task queue. No manager-KPI formula has been
// defined yet (there's no schema field like client-satisfaction to base
// one on), so this intentionally only returns progression/completionRate
// /projects — say the word if you want a KPI added here too.
export async function getEngagementManagersOverview(): Promise<ManagerRow[]> {
  const managers = await db.user.findMany({
    where: { role: "ENGAGEMENT_MANAGER" },
    select: {
      id: true,
      name: true,
      assignments: {
        select: {
          projectId: true,
          projectName: true,
          project: { select: { status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    managers.map(async (m) => {
      // A project can be deleted while the Assignment snapshot survives
      // (assignment.project is then null) — those can't be counted
      // toward progression/completionRate since there's no live project
      // or tasks to check, but their name still shows in the list.
      const liveAssignments = m.assignments.filter((a) => a.project);
      const projectIds = [
        ...new Set(liveAssignments.map((a) => a.projectId as string)),
      ];
      const projects = [...new Set(m.assignments.map((a) => a.projectName))];

      const totalProjects = new Set(liveAssignments.map((a) => a.projectId))
        .size;
      const completedProjects = new Set(
        liveAssignments
          .filter((a) => a.project!.status === "COMPLETED")
          .map((a) => a.projectId),
      ).size;
      const completionRate =
        totalProjects > 0
          ? Math.round((completedProjects / totalProjects) * 100)
          : 0;

      const [totalTasks, deliveredTasks] = projectIds.length
        ? await Promise.all([
            db.task.count({ where: { projectId: { in: projectIds } } }),
            db.task.count({
              where: { projectId: { in: projectIds }, status: "DELIVERED" },
            }),
          ])
        : [0, 0];
      const progression =
        totalTasks > 0 ? Math.round((deliveredTasks / totalTasks) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        projects,
        progression,
        completionRate,
      };
    }),
  );
}
