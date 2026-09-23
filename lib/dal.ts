import { db } from "./db";
import { getSession } from "./auth";
import { Prisma } from "@/app/generated/prisma/client";
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

// Pulled out (and typed via `satisfies`) rather than written inline in
// the findMany call below: with a `select` written inline alongside a
// ternary `where`, TS's payload-type inference for Prisma's findMany can
// collapse to the plain scalar shape and silently drop nested relation
// selects like `sheets` — which is exactly what caused the previous
// version's "Property 'sheets' is missing" error. Same fix already used
// for `userRowSelect`/`UserWithRelations` in users-data.ts.
//
// NOTE: that collapse is also triggered by ANY type error inside the
// findMany arguments (e.g. an `unknown` userId in the `where`) — Prisma's
// generics fall back to the default payload when the args don't check.
// So a "Property 'sheets' is missing" error usually means look for a
// different error in the same call first.
const currentUserProjectSelect = {
  id: true,
  name: true,
  status: true,
  deliveryDate: true,
  createdAt: true,
  updatedAt: true,
  // Only the Progress sheet feeds the progress %; a project now has an
  // ITS and IQA sheet too, but those use different row shapes
  // ("itsStatus"/"iqaStatus", not "statusLLTDate").
  sheets: {
    where: { kind: "PROGRESS" },
    take: 1,
    select: { rows: true },
  },
} satisfies Prisma.ProjectSelect;

type CurrentUserProjectRow = Prisma.ProjectGetPayload<{
  select: typeof currentUserProjectSelect;
}>;

// Same column id + "Delivered" convention used by getActiveProjectProgress
// in actions/projects.ts — kept in sync with that function's comment
// rather than imported from it, since that file is "use server"-only and
// this one also needs to run from other server contexts.
const DELIVERY_STATUS_COLUMN_ID = "statusLLTDate";
const DELIVERED_VALUE = "Delivered";

// Unlike getActiveProjectProgress (which only reports ACTIVE projects
// that already have sheet rows, for a KPI widget), this backs a full
// project table — every project needs a progress value, so one with no
// Progress sheet yet, or an empty one, just shows 0% instead of being
// dropped.
function computeProjectProgress(rows: unknown): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const typedRows = rows as Record<string, string>[];
  const delivered = typedRows.filter(
    (r) => r[DELIVERY_STATUS_COLUMN_ID] === DELIVERED_VALUE,
  ).length;
  return Math.round((delivered / typedRows.length) * 100);
}

const serializeProject = (project: CurrentUserProjectRow) => ({
  id: project.id,
  name: project.name,
  status: project.status,
  progress: computeProjectProgress(project.sheets[0]?.rows),
  deliveryDate: project.deliveryDate
    ? project.deliveryDate.toISOString()
    : null,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

export async function getCurrentUserProjects() {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  // `session.userId` is typed `unknown`, and a plain truthiness check only
  // narrows it to `{}` — not `string`, which is what Prisma's `where`
  // needs. Check the type explicitly so `userId` is a real `string` below.
  const userId = session.userId;
  if (typeof userId !== "string" || !userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Typed on its own (not inline in findMany) so a mistake here can't
  // collapse findMany's inferred result type — see the note above
  // currentUserProjectSelect.
  const where: Prisma.ProjectWhereInput | undefined =
    user.role === "UNIT_MANAGER"
      ? undefined
      : {
          assignments: {
            some: { userId },
          },
        };

  const projects = await db.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: currentUserProjectSelect,
  });

  return projects.map(serializeProject);
}

export async function getHistory() {
  // Outside try/catch so Next's dynamic-usage signal can propagate
  const session = await getSession();
  if (!session) return null;
  const userId = session.userId;
  if (typeof userId !== "string" || !userId) return null;

  try {
    const history = await db.assignment.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        roleOnProject: true,
        startDate: true,
        endDate: true,
        projectName: true,
        projectId: true,
        project: { select: { status: true } },
      },
    });
    return history;
  } catch (e) {
    console.log("error in getting user projects history: ", e);
    return null; // the original returned undefined here
  }
}
