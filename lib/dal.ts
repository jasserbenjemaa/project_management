import { db } from "./db";
import { getSession } from "./auth";

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
