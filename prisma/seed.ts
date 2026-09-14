import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  Artifact,
  Level,
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
// 5 projects * 5 EMs * 5 consultants each = 25 EMs + 125 consultants,
// plus a handful of unit managers on top.
const NUM_UNIT_MANAGERS = 2;
const NUM_PROJECTS = 5;
const EMS_PER_PROJECT = 5;
const CONSULTANTS_PER_EM = 5;
const ROWS_PER_EM = 4;

const ARTIFACT_LABELS = ["HLT", "LLT", "LLR", "Code review", "Architecture"];

// The 5 Artifact enum values, one per EM per project — this is the "role"
// (LLR / LLT / HLT / ...) each EM owns, and their consultants inherit it.
const ARTIFACT_ROLES = Object.values(Artifact);

// --- Sheet column shape, mirrors initialColumns in sheet-table.tsx ---
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

// Unit managers are seeded as the most senior people, EMs next, consultants
// most recent - so hire dates roughly line up with the org hierarchy instead
// of being uniformly random.
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

  // 2. unit managers — top of the hierarchy, no manager of their own
  const unitManagers = [];
  for (let i = 0; i < NUM_UNIT_MANAGERS; i++) {
    unitManagers.push(
      await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `unit.manager.${i}@company.com`,
          role: Role.UNIT_MANAGER,
          password: passwordHash,
          hiredAt: hireDateFor(Role.UNIT_MANAGER),
        },
      }),
    );
  }

  const consultantLevels = Object.values(Level);
  const projectStatuses = Object.values(ProjectStatus);

  let emCounter = 0;
  let consultantCounter = 0;

  // 3-8. one pass per project: create the project, its 5 EMs (each with a
  // distinct artifact role), 5 consultants under each EM (inheriting that
  // role), a Task + sheet row per line item (kept 1:1, same as the real
  // sheet-save sync), assignments, and time entries.
  for (let p = 0; p < NUM_PROJECTS; p++) {
    const project = await prisma.project.create({
      data: {
        name: `Project ${faker.commerce.productAdjective()} ${faker.animal.type()}`,
        status: pick(projectStatuses),
      },
    });

    const assignedBy = pick(unitManagers);

    // Tasks created below (1 per sheet row) accumulate here so time
    // entries have something real to reference.
    const tasks: { id: string }[] = [];
    // Sheet rows accumulate as we create EMs/consultants below, so the
    // Author LLR / Author LLT columns reference real names on this project.
    const sheetRows: Record<string, string>[] = [];

    for (let e = 0; e < EMS_PER_PROJECT; e++) {
      const artifactRole = ARTIFACT_ROLES[e % ARTIFACT_ROLES.length];

      const em = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `engagement.manager.${emCounter}@company.com`,
          role: Role.ENGAGEMENT_MANAGER,
          password: passwordHash,
          managerId: assignedBy.id,
          artifact_type: artifactRole,
          hiredAt: hireDateFor(Role.ENGAGEMENT_MANAGER),
        },
      });
      emCounter++;

      await prisma.assignment.create({
        data: {
          userId: em.id,
          projectId: project.id,
          assignedById: assignedBy.id,
          roleOnProject: `Engagement Manager - ${artifactRole}`,
          startDate: faker.date.recent({ days: 90 }),
          userName: em.name,
          userEmail: em.email,
          projectName: project.name,
        },
      });

      // 5 consultants under this EM, inheriting the EM's artifact role.
      const consultantsUnderEm = [];
      for (let c = 0; c < CONSULTANTS_PER_EM; c++) {
        const consultant = await prisma.user.create({
          data: {
            name: faker.person.fullName(),
            email: `consultant.${consultantCounter}@company.com`,
            role: Role.CONSULTANT,
            password: passwordHash,
            managerId: em.id,
            seniority_level: pick(consultantLevels),
            artifact_type: artifactRole,
            hiredAt: hireDateFor(Role.CONSULTANT),
          },
        });
        consultantCounter++;
        consultantsUnderEm.push(consultant);

        await prisma.assignment.create({
          data: {
            userId: consultant.id,
            projectId: project.id,
            assignedById: em.id,
            roleOnProject: `Consultant - ${artifactRole}`,
            startDate: faker.date.recent({ days: 90 }),
            userName: consultant.name,
            userEmail: consultant.email,
            projectName: project.name,
          },
        });
      }

      // A few sheet rows per EM, each backed by a real Task row (same
      // shape actions/sheet.ts's syncSheetRowsToTasks produces), authored
      // by this EM and its consultants.
      for (let r = 0; r < ROWS_PER_EM; r++) {
        const rowNum = sheetRows.length + 1;
        const author = pick(consultantsUnderEm);
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
          authorLLR: em.name,
          authorLLT: author.name,
          testStatus,
          its,
          iqa,
          commentLLT: testStatus === "KO" ? faker.lorem.sentence() : "",
          statusLLTDate: statusLLT,
          estimationDays: String(estimationDays),
        });

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
            assigneeLLRId: em.id,
            assigneeLLTId: author.id,
          },
        });
        tasks.push(task);
      }
    }

    // Time entries for EMs/consultants, logged against the real Task rows
    // created above rather than a separate ad-hoc task list.
    const allProjectUsers = await prisma.user.findMany({
      where: { assignments: { some: { projectId: project.id } } },
      select: { id: true },
    });
    for (const user of allProjectUsers) {
      const entryCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < entryCount; i++) {
        await prisma.timeEntry.create({
          data: {
            userId: user.id,
            taskId: pick(tasks).id,
            days: faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 }),
            note: faker.lorem.sentence(),
          },
        });
      }
    }

    // one Sheet per project, columns matching the grid, rows built above —
    // every row carries the same __rowId as its corresponding Task.
    await prisma.sheet.create({
      data: {
        name: `FiAv-${project.name}`,
        columns: SHEET_COLUMNS,
        rows: sheetRows,
        projectId: project.id,
      },
    });
  }

  console.log(
    `Seeded ${unitManagers.length} unit managers, ${emCounter} engagement managers, ` +
      `${consultantCounter} consultants across ${NUM_PROJECTS} projects (with a sheet + synced tasks each).`,
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
