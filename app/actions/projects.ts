"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ProjectStatus } from "@/features/projects-columns";

// Update this if the projects table lives at a different route.
const PROJECTS_PATH = "/projects";

const serializeProject = (project: {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...project,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

// READ
export async function getProjects() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  return projects.map(serializeProject);
}

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
    revalidatePath(PROJECTS_PATH);
    return { success: true, project: serializeProject(project) } as const;
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
    revalidatePath(PROJECTS_PATH);
    return { success: true, project: serializeProject(project) } as const;
  } catch (error) {
    console.error("Failed to update project", error);
    return { success: false, error: "Failed to update project." } as const;
  }
}

export async function deleteProject(id: string) {
  try {
    await db.project.delete({ where: { id } });
    revalidatePath(PROJECTS_PATH);
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
