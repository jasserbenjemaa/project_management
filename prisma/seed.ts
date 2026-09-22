import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  Artifact,
  Level,
  SheetKind,
} from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { hashPassword } from "@/lib/auth";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});
const prisma = new PrismaClient({ adapter });

// tune these however you like.
// 15 projects * 7 EMs * 8 consultants each = 105 EMs + 840 consultants,
// plus unit managers and a bench of unassigned consultants on top.
// NOTE: this is now ~970 users created one-at-a-time via sequential
// prisma.create() calls (kept sequential to match the original script's
// style and because later rows depend on earlier ones' ids/dates) — expect
// the run to take a while. Dial the constants below down if that's a
// problem, or ask for a batched/parallel version.
const NUM_UNIT_MANAGERS = 6;
const NUM_PROJECTS = 15;
const EMS_PER_PROJECT = 7;
const CONSULTANTS_PER_EM = 8;
const ROWS_PER_EM = 8;

// Consultants who exist but aren't currently staffed on a project (no
// Assignment row) — every real org has people on the bench between
// engagements.
const NUM_BENCH_CONSULTANTS = 20;

// Fraction of consultants who pick up a *second*, lighter assignment on
// another project. Assignment's unique constraint is [userId, projectId],
// not per-user, so this is legal.
const CROSS_PROJECT_ASSIGNMENT_RATE = 0.15;

// "Manually-created" sheets with no project — the schema comment on Sheet
// calls these out explicitly (NULL projectId never collides with the
// @@unique([projectId, kind]) index).
const NUM_STANDALONE_SHEETS = 5;

// ---- activity window ------------------------------------------------
// Every "activity" timestamp below (record creation, edits, assignment
// start/end, time logged) is pinned inside this trailing window instead
// of defaulting to the literal instant the seed script happens to run —
// which is what @default(now()) silently does for every createdAt field
// left unset. Spreading everything across a real 4-month span makes any
// time-bucketed view (weekly burndown, monthly utilization, etc.) show a
// believable trend instead of one giant spike on seed day.
const WINDOW_MONTHS = 4;
const WINDOW_END = new Date();
const WINDOW_START = (() => {
  const d = new Date(WINDOW_END);
  d.setMonth(d.getMonth() - WINDOW_MONTHS);
  return d;
})();

function clampToWindow(d: Date): Date {
  if (d < WINDOW_START) return WINDOW_START;
  if (d > WINDOW_END) return WINDOW_END;
  return d;
}

// A random date between `after` and `before`, both clamped into the
// window. Falls back to the boundary itself (instead of calling faker
// with an invalid range) when the two collapse onto each other — e.g. a
// project created in the window's very last hour leaves no room for a
// downstream event to happen strictly after it.
function dateInWindow(after?: Date, before?: Date): Date {
  const from = clampToWindow(after ?? WINDOW_START);
  const to = clampToWindow(before ?? WINDOW_END);
  if (from >= to) return from;
  return faker.date.between({ from, to });
}

// Divides the window into `total` equal slices and returns the bounds of
// slice `index`. Used so that e.g. 15 projects' kickoff dates land roughly
// one per week across the 4 months, rather than trusting pure uniform
// randomness not to clump a small sample near one end.
function windowSlice(index: number, total: number): [Date, Date] {
  const spanMs = WINDOW_END.getTime() - WINDOW_START.getTime();
  const sliceMs = spanMs / total;
  const from = new Date(WINDOW_START.getTime() + index * sliceMs);
  const to = new Date(WINDOW_START.getTime() + (index + 1) * sliceMs);
  return [from, to];
}

const ARTIFACT_LABELS = ["HLT", "LLT", "LLR", "Code review", "Architecture"];

// The 5 Artifact enum values, one per EM per project — this is the "role"
// (LLR / LLT / HLT / ...) each EM owns, and their consultants inherit it.
// EMS_PER_PROJECT (7) is more than ARTIFACT_ROLES.length (5), so a couple
// of roles double up per project — realistic for a bigger project team,
// and the % cycling below already handles it safely.
const ARTIFACT_ROLES = Object.values(Artifact);

// --- Sheet column shapes ---
// Mirrors initialColumns in sheet-table.tsx (Progress sheet).
const SHEET_COLUMNS = [
  { title: "Priority", id: "priority", width: 90 },
  { title: "LLR ID", id: "llrId", width: 110 },
  { title: "Function Name", id: "functionName", width: 160 },
  { title: "Complexity", id: "complexity", width: 100 },
  { title: "File .c", id: "fileC", width: 150 },
  { title: "Code Version", id: "codeVersion", width: 110 },
  { title: "Author LLR", id: "authorLLR", width: 130 },
  { title: "Author LLT", id: "authorLLT", width: 130 },
  { title: "Test Status", id: "testStatus", width: 130 },
  { title: "ITS", id: "its", width: 100 },
  { title: "IQA", id: "iqa", width: 150 },
  { title: "Comment LLT", id: "commentLLT", width: 200 },
  { title: "Status LLT (JJ/MM/AAAA)", id: "statusLLTDate", width: 180 },
  { title: "Estimation (days)", id: "estimationDays", width: 140 },
];

// Mirrors ITS_DEFAULT_COLUMNS / IQA_DEFAULT_COLUMNS in its-columns.tsx /
// iqa-columns.tsx exactly (same ids, same order, same widths). This has
// to match: SheetTable prefers saved.columns over the defaultColumns prop
// once a sheet has ever been saved (see the loadSheet effect in
// sheet-table.tsx), so whatever ids get written here are what a seeded
// ITS/IQA sheet actually renders with, regardless of what the ITS/IQA
// page passes in as defaultColumns. An earlier version of this script
// invented its own placeholder ids (testCaseId, auditor, finding, ...)
// before its-columns.tsx/iqa-columns.tsx existed — that's what made
// seeded ITS/IQA sheets show the wrong column names.
const ITS_SHEET_COLUMNS = [
  { title: "N°ITS", id: "itsNumber", width: 100 },
  { title: "Opening date", id: "openingDate", width: 130 },
  { title: "Priority", id: "itsPriority", width: 100 },
  { title: "Batch", id: "batch", width: 100 },
  { title: "Component", id: "component", width: 140 },
  { title: "Requirement", id: "requirement", width: 140 },
  { title: "ITS description", id: "itsDescription", width: 240 },
  { title: "LLR/LLT answer - discussion", id: "answerDiscussion", width: 240 },
  { title: "LLT", id: "itsAuthorLLT", width: 120 },
  { title: "LLR", id: "itsAuthorLLR", width: 120 },
  { title: "Status", id: "itsStatus", width: 120 },
];

const IQA_SHEET_COLUMNS = [
  { title: "N°IQA", id: "iqaNumber", width: 100 },
  { title: "Opening date", id: "openingDate", width: 130 },
  { title: "Priority", id: "itsPriority", width: 100 },
  { title: "Level", id: "iqaLevel", width: 130 },
  { title: "Origin", id: "iqaOrigin", width: 110 },
  { title: "Component", id: "component", width: 140 },
  { title: "Requirement", id: "requirement", width: 140 },
  { title: "Discussion", id: "discussion", width: 220 },
  {
    title: "Customer answer - discussion",
    id: "customerAnswerDiscussion",
    width: 240,
  },
  { title: "Customer", id: "customer", width: 140 },
  { title: "CAP", id: "cap", width: 120 },
  { title: "Status", id: "iqaStatus", width: 150 },
  { title: "CR NBR", id: "crNumber", width: 110 },
];

const STATUS_LLT_OPTIONS = [
  "In progress",
  "Ready for dry run",
  "Dry run in progress",
  "Ready for TC",
  "TC Done",
  "TC Correction",
  "Ready for QC",
  "Ready for Delivery",
  "Delivered",
  "Out of scop",
  "Blocked",
] as const;

// Mirror the strict-select option lists in priority-cell.tsx /
// its-status-cell.tsx / level-cell.tsx / origin-cell.tsx /
// iqa-status-cell.tsx — same manual-sync situation as STATUS_LLT_OPTIONS
// above (the seed script builds rows directly rather than importing the
// .tsx cell files, so these have to be kept in sync by hand).
const ITS_PRIORITY_OPTIONS = ["High", "Medium", "Low"] as const;
const ITS_STATUS_OPTIONS = ["Open", "Postponed", "Rejected", "Closed"] as const;
const LEVEL_OPTIONS = [
  "LLR",
  "LLT",
  "HLT",
  "Architecture",
  "Code review",
] as const;
const ORIGIN_OPTIONS = ["Code", "Spec", "Code/Spec"] as const;
const IQA_STATUS_OPTIONS = [
  "Open",
  "Postponed",
  "Rejected",
  "Closed",
  "CR to be created",
] as const;

// Best-effort placeholder component names — no real list was given for
// this field. Swap for the real component catalog if there is one.
const COMPONENT_NAMES = [
  "Engine Control",
  "Sensor Fusion",
  "Diagnostics",
  "Power Management",
  "Communication Bus",
  "User Interface",
  "Safety Monitor",
  "Calibration",
];

// Mirrors SHEET_STATUS_TO_TASK_STATUS in actions/sheet.ts — kept in sync
// manually since the seed script builds Task rows directly instead of
// going through saveSheet()'s sync path. "Out of scop" is the same typo
// that's already baked into the real sheet data.
const STATUS_LLT_TO_TASK_STATUS: Record<string, TaskStatus> = {
  "In progress": TaskStatus.IN_PROGRESS,
  "Ready for dry run": TaskStatus.READY_FOR_DRY_RUN,
  "Dry run in progress": TaskStatus.DRY_RUN_IN_PROGRESS,
  "Ready for TC": TaskStatus.READY_FOR_TC,
  "TC Done": TaskStatus.TC_DONE,
  "TC Correction": TaskStatus.TC_CORRECTION,
  "Ready for QC": TaskStatus.READY_FOR_QC,
  "Ready for Delivery": TaskStatus.READY_FOR_DELIVERY,
  Delivered: TaskStatus.DELIVERED,
  "Out of scop": TaskStatus.OUT_OF_SCOPE,
  Blocked: TaskStatus.BLOCKED,
};

// Same id shape sheet-table.tsx generates client-side (ROW_ID_KEY /
// genRowId). Every sheet row gets one, and it's what actions/sheet.ts's
// syncSheetRowsToTasks keys Task.sheetRowId off of.
const ROW_ID_KEY = "__rowId";
const genRowId = (): string => crypto.randomUUID();

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// faker's name pool is large but not infinite — at ~1000 users the odds of
// a collision against User.name's @unique constraint stop being
// negligible. Regenerate on collision instead of letting the seed crash
// partway through.
const usedNames = new Set<string>();
function uniqueFullName(): string {
  let name = faker.person.fullName();
  while (usedNames.has(name)) {
    name = faker.person.fullName();
  }
  usedNames.add(name);
  return name;
}

// Real HR hire date — independent of the 4-month activity window above.
// Unit managers are seeded as the most senior people, EMs next,
// consultants most recent, so hire dates roughly line up with the org
// hierarchy instead of being uniformly random.
function hireDateFor(role: Role): Date {
  switch (role) {
    case Role.UNIT_MANAGER:
      return faker.date.past({ years: 8 });
    case Role.ENGAGEMENT_MANAGER:
      return faker.date.past({ years: 5 });
    case Role.CONSULTANT:
    default:
      return faker.date.past({ years: 3 });
  }
}

// deliveryDate was declared on Project but never populated by the old
// script. Completed/on-hold projects get a delivery date drawn from
// inside their own lifetime (kickoff → now); active/planned projects get
// a forward-looking target, which is deliberately allowed to fall outside
// the historical window since it hasn't happened yet.
function deliveryDateFor(status: ProjectStatus, projectCreatedAt: Date): Date {
  switch (status) {
    case ProjectStatus.COMPLETED:
    case ProjectStatus.ON_HOLD:
      return dateInWindow(projectCreatedAt, WINDOW_END);
    case ProjectStatus.ACTIVE:
      return faker.date.soon({ days: 120 });
    case ProjectStatus.PLANNED:
    default:
      return faker.date.future({ years: 1 });
  }
}

// Assignment.endDate was declared but never set by the old script, so
// every assignment looked perpetually ongoing even on COMPLETED projects.
function assignmentEndDateFor(
  status: ProjectStatus,
  startDate: Date,
): Date | null {
  if (status === ProjectStatus.COMPLETED) {
    return dateInWindow(startDate, WINDOW_END);
  }
  // some (not all) people roll off an on-hold project rather than sitting
  // idle on it indefinitely
  if (status === ProjectStatus.ON_HOLD && faker.datatype.boolean(0.4)) {
    return dateInWindow(startDate, WINDOW_END);
  }
  return null;
}

async function main() {
  // 1. clean slate — order matters because of foreign keys
  await prisma.timeEntry.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.sheet.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // one shared hash reused for every seeded user — hashing 100x individually
  // is slow and pointless for fixture data. Swap for per-user passwords if you need to.
  const passwordHash = await hashPassword("password123");

  // 2. unit managers — top of the hierarchy, no manager of their own.
  // Their *records* are spread across the window like everyone else's
  // (createdAt), even though their real hiredAt predates all of this.
  const unitManagers = [];
  for (let i = 0; i < NUM_UNIT_MANAGERS; i++) {
    const [slotFrom, slotTo] = windowSlice(i, NUM_UNIT_MANAGERS);
    const createdAt = faker.date.between({ from: slotFrom, to: slotTo });
    unitManagers.push(
      await prisma.user.create({
        data: {
          name: uniqueFullName(),
          email: `unit.manager.${i}@company.com`,
          role: Role.UNIT_MANAGER,
          password: passwordHash,
          hiredAt: hireDateFor(Role.UNIT_MANAGER),
          createdAt,
          updatedAt: dateInWindow(createdAt, WINDOW_END),
        },
      }),
    );
  }

  const consultantLevels = Object.values(Level);
  const projectStatuses = Object.values(ProjectStatus);

  let emCounter = 0;
  let consultantCounter = 0;

  // Every consultant created below, with the project + date they were
  // primarily staffed on — feeds the cross-project assignment pass after
  // the main loop.
  const allConsultants: {
    id: string;
    name: string;
    email: string;
    primaryProjectId: string;
    createdAt: Date;
  }[] = [];
  const allProjects: {
    id: string;
    name: string;
    status: ProjectStatus;
    createdAt: Date;
  }[] = [];

  // 3-9. one pass per project: create the project, its EMs (each with a
  // distinct artifact role) and their consultants, then a Task + sheet
  // row per line item (kept 1:1, same as the real sheet-save sync),
  // assignments, time entries, and a sheet per kind.
  //
  // EM/consultant creation and sheet-row generation are deliberately two
  // separate passes now (they used to be nested, one EM's rows generated
  // right after that EM's own consultants). Author LLR / Author LLT need
  // to be picked from whoever on the *whole project* is actually tagged
  // artifact_type LLR / LLT (mirroring authorSuggestionsByCol in
  // sheet-table.tsx, which scopes the real autosuggest dropdown to
  // consultants on the project with the matching artifact_type) — that
  // pool isn't known until every EM and consultant for the project
  // exists, so row generation has to wait until after the first pass.
  //
  // Project kickoff dates are stratified one-per-slice across the window
  // (see windowSlice) so the 15 projects don't all land in the same week;
  // everything belonging to a project (its EMs, consultants, tasks,
  // sheets, time entries) is then dated at or after that project's own
  // kickoff, so a project that kicked off last week doesn't somehow have
  // two months of logged time already.
  for (let p = 0; p < NUM_PROJECTS; p++) {
    const status = pick(projectStatuses);
    const [slotFrom, slotTo] = windowSlice(p, NUM_PROJECTS);
    const projectCreatedAt = faker.date.between({ from: slotFrom, to: slotTo });
    const project = await prisma.project.create({
      data: {
        name: `Project ${faker.commerce.productAdjective()} ${faker.animal.type()}`,
        status,
        deliveryDate: deliveryDateFor(status, projectCreatedAt),
        createdAt: projectCreatedAt,
        updatedAt: dateInWindow(projectCreatedAt, WINDOW_END),
      },
    });
    allProjects.push({
      id: project.id,
      name: project.name,
      status,
      createdAt: projectCreatedAt,
    });

    const assignedBy = pick(unitManagers);

    // Tasks created below (1 per sheet row) accumulate here so time
    // entries have something real to reference — keeping each task's own
    // createdAt too, so a logged entry never predates the task it's on.
    const tasks: { id: string; createdAt: Date }[] = [];
    // Sheet rows accumulate as rows are generated in the second pass
    // below, so the Author LLR / Author LLT columns reference real names
    // on this project.
    const sheetRows: Record<string, string>[] = [];

    // Consultants on this project, tagged with the artifact role they
    // inherited from their EM. Only consultants go in here — EMs are
    // managers, not the people whose names belong in an Author LLR /
    // Author LLT cell, matching getUserSuggestions' "consultants assigned
    // to this project" scope (see sheet-table.tsx).
    const projectConsultants: {
      id: string;
      name: string;
      artifactRole: Artifact;
      createdAt: Date;
    }[] = [];

    // --- Pass 1: create every EM and consultant for this project ---
    for (let e = 0; e < EMS_PER_PROJECT; e++) {
      const artifactRole = ARTIFACT_ROLES[e % ARTIFACT_ROLES.length];

      const emCreatedAt = dateInWindow(projectCreatedAt, WINDOW_END);
      const em = await prisma.user.create({
        data: {
          name: uniqueFullName(),
          email: `engagement.manager.${emCounter}@company.com`,
          role: Role.ENGAGEMENT_MANAGER,
          password: passwordHash,
          managerId: assignedBy.id,
          artifact_type: artifactRole,
          hiredAt: hireDateFor(Role.ENGAGEMENT_MANAGER),
          createdAt: emCreatedAt,
          updatedAt: dateInWindow(emCreatedAt, WINDOW_END),
        },
      });
      emCounter++;

      const emAssignEnd = assignmentEndDateFor(status, emCreatedAt);
      await prisma.assignment.create({
        data: {
          userId: em.id,
          projectId: project.id,
          assignedById: assignedBy.id,
          roleOnProject: `Engagement Manager - ${artifactRole}`,
          startDate: emCreatedAt,
          endDate: emAssignEnd,
          userName: em.name,
          userEmail: em.email,
          projectName: project.name,
          createdAt: emCreatedAt,
          updatedAt: dateInWindow(emCreatedAt, WINDOW_END),
        },
      });

      // consultants under this EM, inheriting the EM's artifact role.
      for (let c = 0; c < CONSULTANTS_PER_EM; c++) {
        const consultantCreatedAt = dateInWindow(emCreatedAt, WINDOW_END);
        const consultant = await prisma.user.create({
          data: {
            name: uniqueFullName(),
            email: `consultant.${consultantCounter}@company.com`,
            role: Role.CONSULTANT,
            password: passwordHash,
            managerId: em.id,
            seniority_level: pick(consultantLevels),
            artifact_type: artifactRole,
            hiredAt: hireDateFor(Role.CONSULTANT),
            createdAt: consultantCreatedAt,
            updatedAt: dateInWindow(consultantCreatedAt, WINDOW_END),
          },
        });
        consultantCounter++;
        projectConsultants.push({
          id: consultant.id,
          name: consultant.name,
          artifactRole,
          createdAt: consultantCreatedAt,
        });
        allConsultants.push({
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          primaryProjectId: project.id,
          createdAt: consultantCreatedAt,
        });

        const consultantAssignEnd = assignmentEndDateFor(
          status,
          consultantCreatedAt,
        );
        await prisma.assignment.create({
          data: {
            userId: consultant.id,
            projectId: project.id,
            assignedById: em.id,
            roleOnProject: `Consultant - ${artifactRole}`,
            startDate: consultantCreatedAt,
            endDate: consultantAssignEnd,
            userName: consultant.name,
            userEmail: consultant.email,
            projectName: project.name,
            createdAt: consultantCreatedAt,
            updatedAt: dateInWindow(consultantCreatedAt, WINDOW_END),
          },
        });
      }
    }

    // --- Author pools: consultants actually tagged LLR / LLT on this
    // project. Falls back to any consultant on the project if nobody
    // happens to be tagged that way yet — same fallback
    // authorSuggestionsByCol uses in sheet-table.tsx.
    const llrPool = projectConsultants.filter(
      (u) => u.artifactRole === Artifact.LLR,
    );
    const lltPool = projectConsultants.filter(
      (u) => u.artifactRole === Artifact.LLT,
    );
    const llrCandidates = llrPool.length > 0 ? llrPool : projectConsultants;
    const lltCandidates = lltPool.length > 0 ? lltPool : projectConsultants;

    // --- Pass 2: sheet rows + tasks, now that the LLR/LLT pools exist ---
    const totalRows = EMS_PER_PROJECT * ROWS_PER_EM;
    for (let r = 0; r < totalRows; r++) {
      const rowNum = r + 1;
      const llrAuthor = pick(llrCandidates);
      const lltAuthor = pick(lltCandidates);
      const testStatus = pick(["OK", "KO"]);
      const statusLLT = pick(STATUS_LLT_OPTIONS);
      const rowId = genRowId();
      const llrId = `REQ-${faker.string.alpha({ length: 4, casing: "upper" })}-FUNCT-NAME${rowNum}`;
      const functionName = `Funct-Name${rowNum}`;
      const complexity = faker.number.int({ min: 1, max: 10 });
      const fileC = `funct-name${rowNum}.c`;
      const codeVersion = `v${faker.system.semver()}`;
      const its = faker.datatype.boolean(0.3)
        ? `ITS#${faker.number.int({ min: 1000, max: 9999 })}`
        : "";
      const iqa = faker.datatype.boolean(0.2)
        ? `IQA#${faker.number.int({ min: 1000, max: 9999 })}`
        : "";
      const estimationDays = faker.number.float({
        min: 0.5,
        max: 10,
        fractionDigits: 1,
      });

      sheetRows.push({
        [ROW_ID_KEY]: rowId,
        priority: String(faker.number.int({ min: 1, max: 5 })),
        llrId,
        functionName,
        complexity: String(complexity),
        fileC,
        codeVersion,
        authorLLR: llrAuthor.name,
        authorLLT: lltAuthor.name,
        testStatus,
        its,
        iqa,
        commentLLT: testStatus === "KO" ? faker.lorem.sentence() : "",
        statusLLTDate: statusLLT,
        estimationDays: String(estimationDays),
      });

      // Neither author should appear to have written this before they
      // themselves existed on the project.
      const authorsReadyAt = new Date(
        Math.max(llrAuthor.createdAt.getTime(), lltAuthor.createdAt.getTime()),
      );
      const taskCreatedAt = dateInWindow(authorsReadyAt, WINDOW_END);
      const task = await prisma.task.create({
        data: {
          title: functionName,
          status: STATUS_LLT_TO_TASK_STATUS[statusLLT],
          projectId: project.id,
          estimatedDays: estimationDays,
          sheetRowId: rowId,
          functionName,
          llrId,
          fileC,
          codeVersion,
          complexity,
          its: its || null,
          iqa: iqa || null,
          assigneeLLRId: llrAuthor.id,
          assigneeLLTId: lltAuthor.id,
          createdAt: taskCreatedAt,
          updatedAt: dateInWindow(taskCreatedAt, WINDOW_END),
        },
      });
      tasks.push({ id: task.id, createdAt: taskCreatedAt });
    }

    // Time entries for EMs/consultants, logged against the real Task rows
    // created above. loggedAt (and createdAt) fall between the chosen
    // task's own creation and now, so nothing is ever logged before the
    // task existed — and the whole set naturally clusters more heavily in
    // projects that kicked off earlier in the window, since they've had
    // more time to accumulate entries.
    const allProjectUsers = await prisma.user.findMany({
      where: { assignments: { some: { projectId: project.id } } },
      select: { id: true },
    });
    for (const user of allProjectUsers) {
      const entryCount = faker.number.int({ min: 1, max: 5 });
      for (let i = 0; i < entryCount; i++) {
        const task = pick(tasks);
        const loggedAt = dateInWindow(task.createdAt, WINDOW_END);
        await prisma.timeEntry.create({
          data: {
            userId: user.id,
            taskId: task.id,
            days: faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 }),
            note: faker.lorem.sentence(),
            loggedAt,
            createdAt: dateInWindow(loggedAt, WINDOW_END),
          },
        });
      }
    }

    // Up to three sheets per project — one per SheetKind — matching the
    // @@unique([projectId, kind]) constraint. The old script only ever
    // created the PROGRESS one; ITS and IQA never existed in seed data.
    const progressSheetCreatedAt = dateInWindow(projectCreatedAt, WINDOW_END);
    await prisma.sheet.create({
      data: {
        name: `FiAv-${project.name}`,
        kind: SheetKind.PROGRESS,
        columns: SHEET_COLUMNS,
        rows: sheetRows,
        projectId: project.id,
        createdAt: progressSheetCreatedAt,
        updatedAt: dateInWindow(progressSheetCreatedAt, WINDOW_END),
      },
    });

    // ITS rows reuse the Progress row's own authorLLR/authorLLT (already
    // pooled from consultants tagged LLR/LLT above) rather than picking
    // again, so the same task's Progress-sheet and ITS-sheet entries
    // agree on who authored it.
    const itsRows = sheetRows
      .filter((row) => row.its)
      .map((row) => ({
        [ROW_ID_KEY]: genRowId(),
        itsNumber: row.its.replace(/^ITS#/, ""),
        openingDate: dateInWindow(
          projectCreatedAt,
          WINDOW_END,
        ).toLocaleDateString("fr-FR"),
        itsPriority: pick(ITS_PRIORITY_OPTIONS),
        batch: `Batch ${faker.number.int({ min: 1, max: 12 })}`,
        component: pick(COMPONENT_NAMES),
        // Best-effort: reuses the task's LLR ID as the linked requirement
        // reference. Swap if the real convention differs.
        requirement: row.llrId,
        itsDescription: faker.lorem.sentence(),
        answerDiscussion: faker.datatype.boolean(0.7)
          ? faker.lorem.sentence()
          : "",
        itsAuthorLLT: row.authorLLT,
        itsAuthorLLR: row.authorLLR,
        itsStatus: pick(ITS_STATUS_OPTIONS),
      }));
    const itsSheetCreatedAt = dateInWindow(projectCreatedAt, WINDOW_END);
    await prisma.sheet.create({
      data: {
        name: `${project.name} - ITS Tracker`,
        kind: SheetKind.ITS,
        columns: ITS_SHEET_COLUMNS,
        rows: itsRows,
        projectId: project.id,
        createdAt: itsSheetCreatedAt,
        updatedAt: dateInWindow(itsSheetCreatedAt, WINDOW_END),
      },
    });

    // IQA_DEFAULT_COLUMNS has no LLR/LLT author column (see iqa-columns.tsx)
    // — nothing here needs the author pools.
    const iqaRows = sheetRows
      .filter((row) => row.iqa)
      .map((row) => {
        const iqaStatus = pick(IQA_STATUS_OPTIONS);
        return {
          [ROW_ID_KEY]: genRowId(),
          iqaNumber: row.iqa.replace(/^IQA#/, ""),
          openingDate: dateInWindow(
            projectCreatedAt,
            WINDOW_END,
          ).toLocaleDateString("fr-FR"),
          itsPriority: pick(ITS_PRIORITY_OPTIONS),
          iqaLevel: pick(LEVEL_OPTIONS),
          iqaOrigin: pick(ORIGIN_OPTIONS),
          component: pick(COMPONENT_NAMES),
          requirement: row.llrId,
          discussion: faker.lorem.sentence(),
          customerAnswerDiscussion: faker.datatype.boolean(0.6)
            ? faker.lorem.sentence()
            : "",
          customer: faker.company.name(),
          cap: faker.datatype.boolean(0.4)
            ? `CAP-${faker.number.int({ min: 100, max: 999 })}`
            : "",
          iqaStatus,
          crNumber:
            iqaStatus === "CR to be created"
              ? `CR-${faker.number.int({ min: 1000, max: 9999 })}`
              : "",
        };
      });
    const iqaSheetCreatedAt = dateInWindow(projectCreatedAt, WINDOW_END);
    await prisma.sheet.create({
      data: {
        name: `${project.name} - IQA Tracker`,
        kind: SheetKind.IQA,
        columns: IQA_SHEET_COLUMNS,
        rows: iqaRows,
        projectId: project.id,
        createdAt: iqaSheetCreatedAt,
        updatedAt: dateInWindow(iqaSheetCreatedAt, WINDOW_END),
      },
    });
  }

  // 10. bench consultants — exist in the org but aren't staffed on any
  // project right now (no Assignment row at all). Report straight to a
  // unit manager, same as a real consultant waiting between engagements.
  // Their own records are stratified across the window like everyone else's.
  for (let i = 0; i < NUM_BENCH_CONSULTANTS; i++) {
    const [slotFrom, slotTo] = windowSlice(i, NUM_BENCH_CONSULTANTS);
    const createdAt = faker.date.between({ from: slotFrom, to: slotTo });
    await prisma.user.create({
      data: {
        name: uniqueFullName(),
        email: `consultant.${consultantCounter}@company.com`,
        role: Role.CONSULTANT,
        password: passwordHash,
        managerId: pick(unitManagers).id,
        seniority_level: pick(consultantLevels),
        artifact_type: pick(ARTIFACT_ROLES),
        hiredAt: hireDateFor(Role.CONSULTANT),
        createdAt,
        updatedAt: dateInWindow(createdAt, WINDOW_END),
      },
    });
    consultantCounter++;
  }

  // 11. cross-project assignments — Assignment's unique constraint is
  // [userId, projectId], so a consultant can legitimately carry a second,
  // lighter assignment on another project at the same time. Start date
  // has to come after both the consultant and the second project exist.
  let crossAssignedCount = 0;
  for (const consultant of allConsultants) {
    if (Math.random() >= CROSS_PROJECT_ASSIGNMENT_RATE) continue;
    const otherProjects = allProjects.filter(
      (pr) => pr.id !== consultant.primaryProjectId,
    );
    if (otherProjects.length === 0) continue;
    const secondProject = pick(otherProjects);
    const earliestPossible = new Date(
      Math.max(
        consultant.createdAt.getTime(),
        secondProject.createdAt.getTime(),
      ),
    );
    const start = dateInWindow(earliestPossible, WINDOW_END);
    await prisma.assignment.create({
      data: {
        userId: consultant.id,
        projectId: secondProject.id,
        assignedById: pick(unitManagers).id,
        roleOnProject: "Consultant - Cross-project support",
        startDate: start,
        endDate: assignmentEndDateFor(secondProject.status, start),
        userName: consultant.name,
        userEmail: consultant.email,
        projectName: secondProject.name,
        createdAt: start,
        updatedAt: dateInWindow(start, WINDOW_END),
      },
    });
    crossAssignedCount++;
  }

  // 12. standalone sheets — no projectId, so @@unique([projectId, kind])
  // never applies to them (Postgres doesn't treat NULLs as colliding).
  // Blank templates rather than seeded with rows, since "manually-created"
  // implies nobody's synced tasks into them yet.
  const standaloneSheetNames = [
    "Sheet Template - Progress",
    "Onboarding Sandbox",
    "Archived Format Reference",
  ];
  for (let i = 0; i < NUM_STANDALONE_SHEETS; i++) {
    const [slotFrom, slotTo] = windowSlice(i, NUM_STANDALONE_SHEETS);
    const createdAt = faker.date.between({ from: slotFrom, to: slotTo });
    await prisma.sheet.create({
      data: {
        name:
          standaloneSheetNames[i % standaloneSheetNames.length] +
          (i >= standaloneSheetNames.length ? ` ${i}` : ""),
        kind: SheetKind.PROGRESS,
        columns: SHEET_COLUMNS,
        rows: [],
        projectId: null,
        createdAt,
        updatedAt: dateInWindow(createdAt, WINDOW_END),
      },
    });
  }

  console.log(
    `Seeded ${unitManagers.length} unit managers, ${emCounter} engagement managers, ` +
      `${consultantCounter} consultants (including ${NUM_BENCH_CONSULTANTS} on the bench) ` +
      `across ${NUM_PROJECTS} projects (3 sheets + synced tasks each), ` +
      `${crossAssignedCount} cross-project assignments, and ${NUM_STANDALONE_SHEETS} standalone sheets. ` +
      `All activity timestamps fall between ${WINDOW_START.toDateString()} and ${WINDOW_END.toDateString()}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
