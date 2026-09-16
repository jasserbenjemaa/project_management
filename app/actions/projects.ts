"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ProjectStatus } from "@/features/projects-columns";
import { createSheetsForProject, renameSheetForProject } from "./sheet";

// Update this if the projects table lives at a different route.
const PROJECTS_PATH = "/projects";
const SHEETS_PATH = "/sheets";
const ITS_PATH = "/its";
const IQA_PATH = "/iqa";

// LIST (lightweight - for populating selects/dropdowns, e.g. the Project
// field in the user form dialog). Returns just id/name, sorted by name.
export async function getProjectOptions() {
  try {
    const projects = await db.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, projects } as const;
  } catch (error) {
    console.error("Failed to fetch project options", error);
    return { success: false, error: "Failed to fetch projects." } as const;
  }
}

export type ProjectDelivery = {
  id: string;
  name: string;
  deliveryDate: Date;
  status: ProjectStatus;
};

// For the calendar KPI widget — only projects that actually have a
// delivery date set are relevant here. Pulls status too so the calendar
// can color-code the same way project-status.tsx does (on track / at
// risk / delayed / completed).
export async function getProjectDeliveries(): Promise<
  | { success: true; projects: ProjectDelivery[] }
  | { success: false; error: string }
> {
  try {
    const projects = await db.project.findMany({
      where: { deliveryDate: { not: null } },
      select: { id: true, name: true, deliveryDate: true, status: true },
      orderBy: { deliveryDate: "asc" },
    });
    return {
      success: true,
      // deliveryDate is guaranteed non-null by the where clause above
      projects: projects as ProjectDelivery[],
    };
  } catch (error) {
    console.error("Failed to fetch project delivery dates", error);
    return {
      success: false,
      error: "Failed to fetch project delivery dates.",
    };
  }
}

export type ProjectStatusStat = {
  status: ProjectStatus;
  count: number;
};

// Header KPI widget ("Project management analytics"): count of projects
// per status.
export async function getProjectStatusOverview(): Promise<
  | { success: true; stats: ProjectStatusStat[] }
  | { success: false; error: string }
> {
  try {
    const statuses: ProjectStatus[] = [
      "PLANNED",
      "ACTIVE",
      "ON_HOLD",
      "COMPLETED",
    ];

    const stats = await Promise.all(
      statuses.map(async (status) => {
        const count = await db.project.count({ where: { status } });
        return { status, count };
      }),
    );

    return { success: true, stats };
  } catch (error) {
    console.error("Failed to fetch project status overview", error);
    return {
      success: false,
      error: "Failed to fetch project status overview.",
    };
  }
}

export type ProjectProgressItem = {
  id: string;
  name: string;
  value: number; // 0-100, % of the project's sheet rows marked "Delivered"
};

// The sheet's status column is keyed "statusLLTDate" (see sheet.ts /
// project-progress row shape) even though it holds a pipeline-stage
// string, not a date — that's the column's actual id in Sheet.columns/rows.
const DELIVERY_STATUS_COLUMN_ID = "statusLLTDate";
const DELIVERED_VALUE = "Delivered";

// "Project progress" widget: % of a project's sheet rows whose status
// column is "Delivered", for each ACTIVE project. This reads the sheet
// data itself (Sheet.rows, a JSON blob keyed by column id) rather than
// the Task table, since the sheet — not Task — is where line items and
// their delivery status actually live in this app. Projects with no
// sheet, or a sheet with no rows, are omitted.
export async function getActiveProjectProgress(): Promise<
  | { success: true; projects: ProjectProgressItem[] }
  | { success: false; error: string }
> {
  try {
    const projects = await db.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        // A project now has three sheets (Progress + ITS + IQA); this
        // widget only cares about delivery progress, which lives on the
        // Progress one.
        sheets: {
          where: { kind: "PROGRESS" },
          take: 1,
          select: { rows: true },
        },
      },
    });

    const withProgress = projects
      .filter(
        (p) =>
          p.sheets[0] &&
          Array.isArray(p.sheets[0].rows) &&
          p.sheets[0].rows.length > 0,
      )
      .map((p) => {
        const rows = p.sheets[0].rows as Record<string, string>[];
        const delivered = rows.filter(
          (r) => r[DELIVERY_STATUS_COLUMN_ID] === DELIVERED_VALUE,
        ).length;
        return {
          id: p.id,
          name: p.name,
          value: Math.round((delivered / rows.length) * 100),
        };
      })
      .sort((a, b) => b.value - a.value);

    return { success: true, projects: withProgress };
  } catch (error) {
    console.error("Failed to fetch active project progress", error);
    return {
      success: false,
      error: "Failed to fetch active project progress.",
    };
  }
}

export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";

export type ProjectHealthCount = {
  health: ProjectHealth;
  count: number;
};

// How many days out from its delivery date a project counts as "at risk"
// rather than comfortably "on track".
const AT_RISK_WINDOW_DAYS = 14;

// Derives a project's health from status + deliveryDate. The schema has
// no explicit "at risk"/"delayed" field, so this is a rule, not stored
// data:
//   - COMPLETED status                              -> Completed
//   - not completed, deliveryDate already passed     -> Delayed
//   - not completed, ON_HOLD OR due within
//     AT_RISK_WINDOW_DAYS                            -> At risk
//   - everything else (incl. no deliveryDate set)    -> On track
// Same logic the calendar widget uses for its dot colors, kept in sync
// so the two widgets never disagree about a given project.
function deriveProjectHealth(
  status: ProjectStatus,
  deliveryDate: Date | null,
): ProjectHealth {
  if (status === "COMPLETED") return "COMPLETED";

  const now = Date.now();
  if (deliveryDate && deliveryDate.getTime() < now) return "DELAYED";

  if (status === "ON_HOLD") return "AT_RISK";
  if (deliveryDate) {
    const msUntilDue = deliveryDate.getTime() - now;
    const daysUntilDue = msUntilDue / (1000 * 60 * 60 * 24);
    if (daysUntilDue <= AT_RISK_WINDOW_DAYS) return "AT_RISK";
  }

  return "ON_TRACK";
}

// "Project status" donut: every project bucketed into On track / At risk
// / Delayed / Completed (see deriveProjectHealth for the rule).
export async function getProjectStatusHealth(): Promise<
  | { success: true; total: number; counts: ProjectHealthCount[] }
  | { success: false; error: string }
> {
  try {
    const projects = await db.project.findMany({
      select: { status: true, deliveryDate: true },
    });

    const tally: Record<ProjectHealth, number> = {
      ON_TRACK: 0,
      AT_RISK: 0,
      DELAYED: 0,
      COMPLETED: 0,
    };

    for (const p of projects) {
      const health = deriveProjectHealth(p.status, p.deliveryDate);
      tally[health] += 1;
    }

    const order: ProjectHealth[] = [
      "ON_TRACK",
      "AT_RISK",
      "DELAYED",
      "COMPLETED",
    ];
    const counts = order.map((health) => ({ health, count: tally[health] }));
    const total = projects.length;

    return { success: true, total, counts };
  } catch (error) {
    console.error("Failed to fetch project status health", error);
    return {
      success: false,
      error: "Failed to fetch project status health.",
    };
  }
}

export type ProjectStatusCount = {
  status: ProjectStatus;
  count: number;
};

// "Project management analytics" header widget: count of projects per
// literal enum status (PLANNED / ACTIVE / ON_HOLD / COMPLETED).
export async function getProjectStatusCounts(): Promise<
  | { success: true; total: number; counts: ProjectStatusCount[] }
  | { success: false; error: string }
> {
  try {
    const grouped = await db.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const byStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
    const statuses: ProjectStatus[] = [
      "PLANNED",
      "ACTIVE",
      "ON_HOLD",
      "COMPLETED",
    ];
    const counts = statuses.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    }));
    const total = counts.reduce((sum, c) => sum + c.count, 0);

    return { success: true, total, counts };
  } catch (error) {
    console.error("Failed to fetch project status counts", error);
    return {
      success: false,
      error: "Failed to fetch project status counts.",
    };
  }
}

// CREATE
export async function createProject(input: {
  name: string;
  status: ProjectStatus;
  deliveryDate?: Date | null;
}) {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Project name is required." } as const;
  }

  try {
    const project = await db.project.create({
      data: {
        name,
        status: input.status,
        deliveryDate: input.deliveryDate ?? null,
      },
    });

    // Every project gets exactly one sheet of each kind: a Progress
    // sheet ("FiAv-{project name}"), an ITS sheet
    // ("FiAv-{project name} — ITS"), and an IQA sheet
    // ("FiAv-{project name} — IQA"). If this fails, the project still
    // exists but is missing a sheet — surface it rather than silently
    // swallowing it.
    try {
      await createSheetsForProject(project.id, project.name);
    } catch (sheetError) {
      console.error("Project created but sheet creation failed", sheetError);
    }

    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
    revalidatePath(ITS_PATH);
    revalidatePath(IQA_PATH);
    return { success: true, project: project } as const;
  } catch (error) {
    console.error("Failed to create project", error);
    return { success: false, error: "Failed to create project." } as const;
  }
}

// UPDATE
export async function updateProject(
  id: string,
  input: { name: string; status: ProjectStatus; deliveryDate?: Date | null },
) {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Project name is required." } as const;
  }

  try {
    const project = await db.project.update({
      where: { id },
      data: {
        name,
        status: input.status,
        deliveryDate: input.deliveryDate ?? null,
      },
    });

    // Keep all three sheet tabs ("FiAv-{name}", "FiAv-{name} — ITS", and
    // "FiAv-{name} — IQA") in sync with the project.
    await renameSheetForProject(id, project.name);

    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
    revalidatePath(ITS_PATH);
    revalidatePath(IQA_PATH);
    return { success: true, project: project } as const;
  } catch (error) {
    console.error("Failed to update project", error);
    return { success: false, error: "Failed to update project." } as const;
  }
}

export async function deleteProject(id: string) {
  try {
    // Sheet.projectId is a nullable FK with onDelete: SetNull, so this
    // detaches (does not delete) all three of the project's sheets —
    // Progress, ITS, and IQA. Each becomes deletable afterwards via
    // deleteSheet() in app/actions/sheet.ts.
    await db.project.delete({ where: { id } });
    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
    revalidatePath(ITS_PATH);
    revalidatePath(IQA_PATH);
    return { success: true } as const;
  } catch (error) {
    console.error("Failed to delete project", error);
    return {
      success: false,
      error:
        "Failed to delete project. Make sure the cascade-delete migration has been applied.",
    } as const;
  }
}
// Add to your server actions file (e.g., actions/project.ts)

export async function getGlobalPipelineStats(): Promise<
  | { success: true; total: number; stats: { label: string; count: number }[] }
  | { success: false; error: string }
> {
  try {
    // Fetch all Progress sheets for the global KPI view. Scoped by kind
    // now that ITS and IQA sheets (app/actions/its-sheet.ts,
    // app/actions/iqa-sheet.ts) live in this same table — their rows use
    // different column ids ("itsStatus"/"iqaStatus", not
    // "statusLLTDate") so they'd have been skipped below anyway, but
    // filtering explicitly is clearer than relying on that.
    const sheets = await db.sheet.findMany({
      where: { kind: "PROGRESS" },
      select: { rows: true },
    });

    let total = 0;
    const tally: Record<string, number> = {};
    const DELIVERY_STATUS_COLUMN_ID = "statusLLTDate";

    for (const sheet of sheets) {
      if (!Array.isArray(sheet.rows)) continue;

      const rows = sheet.rows as Record<string, string>[];
      for (const row of rows) {
        let status = row[DELIVERY_STATUS_COLUMN_ID];
        if (!status) continue;

        // Normalize any typos in the raw sheet data
        if (status === "Out of scop") status = "Out of scope";

        tally[status] = (tally[status] || 0) + 1;
        total++;
      }
    }

    const stats = Object.entries(tally)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return { success: true, total, stats };
  } catch (error) {
    console.error("Failed to fetch global pipeline stats", error);
    return { success: false, error: "Failed to fetch global pipeline stats." };
  }
}
