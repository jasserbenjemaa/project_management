// One-off backfill: run once after the `prisma migrate dev` that adds
// Sheet.kind / the IQA enum value has been applied, so every project
// that existed before ITS/IQA sheets did ends up with both. New projects
// don't need this — createSheetsForProject (app/actions/sheet.ts)
// already makes all three sheets at creation time going forward.
//
// Usage:
//   npx tsx scripts/backfill-its-iqa-sheets.ts
//
// Supersedes the earlier ITS-only backfill-its-sheets.ts — this does the
// same thing for both kinds in one pass.

import { config } from "dotenv";
import path from "node:path";

// next dev/next build load .env.local/.env into process.env
// automatically; a plain tsx script does not, so DATABASE_URL can be
// missing here even though the app itself connects fine.
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  // Imported dynamically, AFTER the config() calls above run — a static
  // import at the top of this file would be hoisted by the module
  // system and would construct the Prisma client (which reads
  // DATABASE_URL at import time) before config() ever executed.
  //
  // Also deliberately not importing from "@/app/actions/sheet": those
  // are Next.js Server Actions and call revalidatePath(), which throws
  // outside of a running Next.js request/build context. This script
  // talks to Prisma directly instead.
  const { db } = await import("@/lib/db");
  const { projectSheetName } = await import("@/lib/sheet-naming");

  const nameForKind: Record<"ITS" | "IQA", (projectName: string) => string> = {
    ITS: (name) => `${projectSheetName(name)} — ITS`,
    IQA: (name) => `${projectSheetName(name)} — IQA`,
  };

  const projects = await db.project.findMany({
    select: { id: true, name: true },
  });

  const counts: Record<"ITS" | "IQA", number> = { ITS: 0, IQA: 0 };

  for (const project of projects) {
    for (const kind of ["ITS", "IQA"] as const) {
      // Idempotent per kind — safe to re-run if it fails partway through.
      const existing = await db.sheet.findUnique({
        where: { projectId_kind: { projectId: project.id, kind } },
        select: { id: true },
      });
      if (existing) continue;

      await db.sheet.create({
        data: {
          name: nameForKind[kind](project.name),
          kind,
          columns: [],
          rows: [],
          projectId: project.id,
        },
      });
      counts[kind]++;
      console.log(`Created ${kind} sheet for "${project.name}"`);
    }
  }

  console.log(
    `Done. Created ${counts.ITS} ITS sheet(s) and ${counts.IQA} IQA sheet(s) ` +
      `out of ${projects.length} project(s).`,
  );
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
