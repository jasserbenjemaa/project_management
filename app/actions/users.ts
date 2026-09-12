"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";
import {
  type Role,
  type Level,
  type Artifact,
} from "@/app/generated/prisma/enums";

export type UserFormInput = {
  name: string;
  email: string;
  // Required on create. On edit, leave undefined/empty to keep the current
  // password unchanged.
  password?: string;
  role: Role;
  seniority_level: Level | null;
  artifact_type: Artifact | null;
  // Ids of every project this user should be assigned to. On update this is
  // diffed against the user's existing Assignment rows: ids no longer
  // present are removed, new ids get an Assignment created, ids present in
  // both are left in place (aside from a snapshot refresh). Role-on-project,
  // start date, and assigned-by are no longer collected by the form; the
  // server fills in sane defaults below for any newly created assignment.
  projectIds: string[];
  // Only meaningful on create - see createUser. updateUser ignores this
  // entirely so a user's hire date can never be changed after the fact.
  hiredAt: Date | null;
};

type ActionResult = { success: true } | { success: false; error: string };

async function requireCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("You must be signed in to do this.");
  }
  return session.userId as string;
}
function formatError(error: unknown, fallback: string): ActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      // `target` tells us which unique constraint actually collided —
      // needed now that both `name` and `email` are unique on User.
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target
        : typeof target === "string"
          ? [target]
          : [];

      if (fields.includes("name")) {
        return { success: false, error: "That name is already in use." };
      }
      if (fields.includes("email")) {
        return { success: false, error: "That email is already in use." };
      }
      return { success: false, error: "That value is already in use." };
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return {
        success: false,
        error:
          "This user is still referenced elsewhere (assignments, time entries, or direct reports). Reassign those first.",
      };
    }
    if (error.code === "P2025") {
      return { success: false, error: "User not found." };
    }
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function createUser(input: UserFormInput): Promise<ActionResult> {
  try {
    if (!input.password) {
      return { success: false, error: "Password is required." };
    }

    const projectIds = input.projectIds ?? [];
    const [assignedById, projects] = await Promise.all([
      requireCurrentUserId(),
      projectIds.length
        ? db.project.findMany({ where: { id: { in: projectIds } } })
        : Promise.resolve([]),
    ]);
    const hashed = await bcrypt.hash(input.password, 10);

    await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashed,
        role: input.role,
        seniority_level: input.seniority_level,
        artifact_type: input.artifact_type,
        hiredAt: input.hiredAt ?? new Date(),
        assignments: projects.length
          ? {
              create: projects.map((project) => ({
                projectId: project.id,
                roleOnProject: input.role,
                startDate: new Date(),
                assignedById,
                userName: input.name,
                userEmail: input.email,
                projectName: project.name,
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to create user.");
  }
}

export async function updateUser(
  userId: string,
  input: UserFormInput,
): Promise<ActionResult> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        email: input.email,
        ...(input.password
          ? { password: await bcrypt.hash(input.password, 10) }
          : {}),
        role: input.role,
        seniority_level: input.seniority_level,
        artifact_type: input.artifact_type,
      },
    });

    const nextProjectIds = new Set(input.projectIds ?? []);
    const existing = await db.assignment.findMany({ where: { userId } });

    // Assignments whose project is no longer in the selected list get
    // dropped; ones whose project is still selected just get their
    // name/email snapshot refreshed; anything newly selected gets created.
    const toRemove = existing.filter(
      (a) => !a.projectId || !nextProjectIds.has(a.projectId),
    );
    const toKeep = existing.filter(
      (a) => a.projectId && nextProjectIds.has(a.projectId),
    );
    const existingProjectIds = new Set(
      existing.map((a) => a.projectId).filter((id): id is string => !!id),
    );
    const toAddIds = [...nextProjectIds].filter(
      (id) => !existingProjectIds.has(id),
    );

    const [assignedById, newProjects] = await Promise.all([
      toAddIds.length ? requireCurrentUserId() : Promise.resolve(null),
      toAddIds.length
        ? db.project.findMany({ where: { id: { in: toAddIds } } })
        : Promise.resolve([]),
    ]);

    await db.$transaction([
      ...toRemove.map((a) => db.assignment.delete({ where: { id: a.id } })),
      ...toKeep.map((a) =>
        db.assignment.update({
          where: { id: a.id },
          data: { userName: input.name, userEmail: input.email },
        }),
      ),
      ...newProjects.map((project) =>
        db.assignment.create({
          data: {
            userId,
            projectId: project.id,
            roleOnProject: input.role,
            startDate: new Date(),
            assignedById: assignedById as string,
            userName: input.name,
            userEmail: input.email,
            projectName: project.name,
          },
        }),
      ),
    ]);

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to update user.");
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    await db.$transaction([
      db.user.updateMany({
        where: { managerId: userId },
        data: { managerId: null },
      }),
      db.assignment.deleteMany({ where: { userId } }),

      db.timeEntry.deleteMany({ where: { userId } }),
      db.user.delete({ where: { id: userId } }),
    ]);

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete user.");
  }
}

export type UserSuggestion = {
  id: string;
  name: string;
  artifactType: string | null;
};

// Suggests consultants currently assigned to a given project — e.g. for
// project A's sheet, this returns only the consultants who have an
// Assignment row for project A, not every user in the system.
export async function getUserSuggestions(
  projectId: string,
): Promise<UserSuggestion[]> {
  const assignments = await db.assignment.findMany({
    where: {
      projectId,
      user: { role: "CONSULTANT" },
    },
    select: {
      user: {
        select: { id: true, name: true, artifact_type: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return assignments
    .filter(
      (a): a is typeof a & { user: NonNullable<typeof a.user> } => !!a.user,
    )
    .map((a) => ({
      id: a.user.id,
      name: a.user.name,
      artifactType: a.user.artifact_type,
    }));
}

export async function assignUserToProject(
  userId: string,
  projectId: string,
  roleOnProject?: Role,
) {
  const assignedById = await requireCurrentUserId();

  const [user, project] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
  ]);

  await db.assignment.upsert({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    update: {
      // Keep the snapshot fresh if the assignment already exists.
      userName: user.name,
      userEmail: user.email,
      projectName: project.name,
      ...(roleOnProject ? { roleOnProject } : {}),
    },
    create: {
      userId,
      projectId,
      assignedById,
      roleOnProject: roleOnProject ?? user.role,
      startDate: new Date(),
      userName: user.name,
      userEmail: user.email,
      projectName: project.name,
    },
  });

  revalidatePath("/");
}

export async function unassignUserFromProject(
  userId: string,
  projectId: string,
) {
  await db.assignment.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  revalidatePath("/");
}
