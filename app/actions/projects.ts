"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ProjectStatus } from "@/features/projects-columns";
import { createSheetForProject, renameSheetForProject } from "./sheet";

// Update this if the projects table lives at a different route.
const PROJECTS_PATH = "/projects";
const SHEETS_PATH = "/sheets";

// CREATE
export async function createProject(input: {
  name: string;
  status: ProjectStatus;
}) {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Project name is required." } as const;
  }

  try {
    const project = await db.project.create({
      data: { name, status: input.status },
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
  input: { name: string; status: ProjectStatus },
) {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Project name is required." } as const;
  }

  try {
    const project = await db.project.update({
      where: { id },
      data: { name, status: input.status },
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
