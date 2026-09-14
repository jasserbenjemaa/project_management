import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { Role, Prisma } from "@/app/generated/prisma/client";

// Change these (or better, move them to env vars) before this ever runs
// against a real environment - they're only meant to get you back into an
// empty DB, not to be a permanent account.
const DEFAULT_UNIT_MANAGER_EMAIL = "admin@company.com";
const DEFAULT_UNIT_MANAGER_PASSWORD = "0000";

// Idempotent + race-safe: guarantees the DB always has at least one
// UNIT_MANAGER to sign in as. Only ever inserts when the User table is
// genuinely empty (e.g. right after `prisma migrate reset`, or someone
// manually truncated the table) - a no-op (single COUNT) otherwise, so
// it's cheap to call defensively from middleware.
//
// Two requests can both see count === 0 and both attempt the create; the
// unique constraint on User.email/name means only one wins, and the loser
// gets a P2002 here which is swallowed as "someone else already handled
// it" rather than surfaced as an error.
export async function ensureDefaultUnitManager(): Promise<{
  created: boolean;
}> {
  const existing = await db.user.count();
  if (existing > 0) return { created: false };

  try {
    const password = await hashPassword(DEFAULT_UNIT_MANAGER_PASSWORD);
    await db.user.create({
      data: {
        name: "Default Unit Manager",
        email: DEFAULT_UNIT_MANAGER_EMAIL,
        password,
        role: Role.UNIT_MANAGER,
        hiredAt: new Date(),
      },
    });

    console.warn(
      `[bootstrap] DB had no users - created default Unit Manager ` +
        `(${DEFAULT_UNIT_MANAGER_EMAIL} / ${DEFAULT_UNIT_MANAGER_PASSWORD}). ` +
        `Sign in and change this password immediately.`,
    );

    return { created: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Lost the race to another request doing the same thing - fine.
      return { created: false };
    }
    throw error;
  }
}

// Cheap existence check for the session-validity guard in middleware -
// selects nothing but the id so it's as light as the count() above.
export async function userExists(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}
