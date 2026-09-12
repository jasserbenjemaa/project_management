"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ProjectStatus } from "@/features/projects-columns";
import { createSheetForProject, renameSheetForProject } from "./sheet";

// Update this if the projects table lives at a different route.
const PROJECTS_PATH = "/projects";
const SHEETS_PATH = "/sheets";

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

    // Every project gets exactly one sheet, named "FiAv-{project name}".
    // If this fails, the project still exists but has no sheet yet —
    // surface it rather than silently swallowing it.
    try {
      await createSheetForProject(project.id, project.name);
    } catch (sheetError) {
      console.error("Project created but sheet creation failed", sheetError);
    }

    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
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

    // Keep the sheet tab name ("FiAv-{name}") in sync with the project.
    await renameSheetForProject(id, project.name);

    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
    return { success: true, project: project } as const;
  } catch (error) {
    console.error("Failed to update project", error);
    return { success: false, error: "Failed to update project." } as const;
  }
}

export async function deleteProject(id: string) {
  try {
    // Sheet.projectId is a nullable FK with onDelete: SetNull, so this
    // detaches (does not delete) the project's sheet. The sheet becomes
    // deletable afterwards via deleteSheet() in app/actions/sheet.ts.
    await db.project.delete({ where: { id } });
    revalidatePath(PROJECTS_PATH);
    revalidatePath(SHEETS_PATH);
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
