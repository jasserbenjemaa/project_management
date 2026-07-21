"use server";

import { revalidatePath } from "next/cache";
// npm install bcryptjs @types/bcryptjs — swap for whatever hashing lib your
// project already uses if it's not bcryptjs.
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
  // Single "primary" project assignment - see the note on
  // `UserRow.primaryAssignment` in users-columns.tsx. Manager, role-on-
  // project, start date, and assigned-by are no longer collected by the
  // form; the server fills in sane defaults below when a project is set.
  projectId: string | null;
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
      return { success: false, error: "That email is already in use." };
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

    const assignedById = await requireCurrentUserId();
    const hashed = await bcrypt.hash(input.password, 10);

    await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashed,
        role: input.role,
        seniority_level: input.seniority_level,
        artifact_type: input.artifact_type,
        assignments: input.projectId
          ? {
              create: {
                projectId: input.projectId,
                roleOnProject: input.role,
                startDate: new Date(),
                // Whoever is signed in and performing this create is
                // recorded as having made the assignment.
                assignedById,
              },
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

    // Upsert the single "primary" assignment for this user (see the note on
    // `UserRow.primaryAssignment`). A user with multiple Assignments will
    // only have the first one touched here. Role-on-project and start date
    // are no longer collected by the form, so they default to the user's
    // role and "now" respectively; existing values are left untouched on
    // update unless the project itself changes.
    const existing = await db.assignment.findFirst({ where: { userId } });

    if (input.projectId) {
      if (existing) {
        await db.assignment.update({
          where: { id: existing.id },
          data: {
            projectId: input.projectId,
            // Whoever is signed in and performing this reassignment is
            // recorded as having made it.
            ...(existing.projectId !== input.projectId
              ? {
                  roleOnProject: input.role,
                  startDate: new Date(),
                  assignedById: await requireCurrentUserId(),
                }
              : {}),
          },
        });
      } else {
        await db.assignment.create({
          data: {
            userId,
            projectId: input.projectId,
            roleOnProject: input.role,
            startDate: new Date(),
            assignedById: await requireCurrentUserId(),
          },
        });
      }
    } else if (existing) {
      await db.assignment.delete({ where: { id: existing.id } });
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to update user.");
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    await db.$transaction([
      // 1. Detach direct reports so the delete doesn't violate the
      //    self-referencing manager FK.
      //    NOTE: this assumes User.managerId is nullable. If it's actually
      //    required in your schema, this needs to become "reassign each
      //    direct report to a specific new manager" instead of null - as
      //    written, that case will throw a Prisma validation error here
      //    rather than silently corrupting data.
      db.user.updateMany({
        where: { managerId: userId },
        data: { managerId: null },
      }),
      // 2. Delete this user's project assignments.
      db.assignment.deleteMany({ where: { userId } }),
      // 3. Hard-delete this user's time entries. IRREVERSIBLE - this
      //    permanently destroys historical/billing data, confirmed
      //    intentional.
      db.timeEntry.deleteMany({ where: { userId } }),
      // 4. Finally, delete the user.
      db.user.delete({ where: { id: userId } }),
    ]);

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete user.");
  }
}
