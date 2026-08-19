import { db } from "./db";
import { getSession } from "./auth";
import type { ProjectStatus } from "@/features/projects-columns";
export const getCurrentUser = async () => {
  const session = await getSession();
  if (!session) return null;

  try {
    const userId = session.userId;
    if (typeof userId !== "string") {
      console.error("session.userId is not a string:", userId);
      return null;
    }

    return await db.user.findUnique({
      where: { id: userId },
    });
  } catch (e) {
    console.error("error in getting current user by id: ", e);
    return null;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    return await db.user.findUnique({
      where: { email },
    });
  } catch (e) {
    console.error("error in getting user by email: ", e);
    return null;
  }
};
// Server-only data reads. Import this from Server Components (e.g.
// `app/users/page.tsx`), never from a "use client" file - it talks to
// Prisma directly.
import { mapUserToRow, userRowSelect, type UserRow } from "./users-data";

export async function getUsers(): Promise<UserRow[]> {
  const users = await db.user.findMany({
    select: userRowSelect,
    orderBy: { name: "asc" },
  });
  return users.map(mapUserToRow);
}

export async function getProjects() {
  return db.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Powers both the "Manager" and "Assigned by" selects in the user form -
// any User can be a manager or an assigner per the schema, so this isn't
// filtered by role.
export async function getUserOptions() {
  return db.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
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

export async function getCurrentUserProjects() {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  const userId = session.userId;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const projects = await db.project.findMany({
    where:
      user.role === "UNIT_MANAGER"
        ? undefined
        : {
            assignments: {
              some: { userId: session.userId },
            },
          },
    orderBy: { createdAt: "desc" },
  });

  return projects.map(serializeProject);
}
export async function getHistory() {
  try {
    const session = await getSession();
    if (!session) return null;
    const userId = session.userId;
    if (!userId) return null;
    const history = await db.assignment.findMany({
      where: { userId: userId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        roleOnProject: true,
        startDate: true,
        endDate: true,
        projectName: true, // snapshot, always available
        projectId: true,
        project: {
          // live relation, null if project was deleted
          select: { status: true },
        },
      },
    });
    return history;
  } catch (e) {
    console.log("error in getting user projects history: ", e);
  }
}
