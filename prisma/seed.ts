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
const TASKS_PER_PROJECT = 6;

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
];

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
  const taskStatuses = Object.values(TaskStatus);

  let emCounter = 0;
  let consultantCounter = 0;

  // 3-8. one pass per project: create the project, its 5 EMs (each with a
  // distinct artifact role), 5 consultants under each EM (inheriting that
  // role), tasks, assignments, time entries, and a populated Sheet.
  for (let p = 0; p < NUM_PROJECTS; p++) {
    const project = await prisma.project.create({
      data: {
        name: `Project ${faker.commerce.productAdjective()} ${faker.animal.type()}`,
        status: pick(projectStatuses),
      },
    });

    const assignedBy = pick(unitManagers);

    // Tasks for this project (created up front so time entries can
    // reference them).
    const tasks = [];
    for (let t = 0; t < TASKS_PER_PROJECT; t++) {
      tasks.push(
        await prisma.task.create({
          data: {
            title: `${pick(ARTIFACT_LABELS)} - ${faker.lorem.words(3)}`,
            status: pick(taskStatuses),
            projectId: project.id,
            estimatedDays: faker.number.float({
              min: 1,
              max: 10,
              fractionDigits: 1,
            }),
          },
        }),
      );
    }

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

      const emEntryCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < emEntryCount; i++) {
        await prisma.timeEntry.create({
          data: {
            userId: em.id,
            taskId: pick(tasks).id,
            days: faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 }),
            note: faker.lorem.sentence(),
          },
        });
      }

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

        const entryCount = faker.number.int({ min: 1, max: 3 });
        for (let i = 0; i < entryCount; i++) {
          await prisma.timeEntry.create({
            data: {
              userId: consultant.id,
              taskId: pick(tasks).id,
              days: faker.number.float({
                min: 0.5,
                max: 5,
                fractionDigits: 1,
              }),
              note: faker.lorem.sentence(),
            },
          });
        }
      }

      // A few sheet rows per EM, authored by this EM and its consultants —
      // gives every project's sheet real, traceable names instead of
      // placeholder text.
      for (let r = 0; r < 4; r++) {
        const rowNum = sheetRows.length + 1;
        const author = pick(consultantsUnderEm);
        const testStatus = pick(["OK", "KO"]);
        sheetRows.push({
          priority: String(faker.number.int({ min: 1, max: 5 })),
          llrId: `REQ-${faker.string.alpha({ length: 4, casing: "upper" })}-FUNCT-NAME${rowNum}`,
          functionName: `Funct-Name${rowNum}`,
          complexity: String(faker.number.int({ min: 1, max: 10 })),
          fileC: `funct-name${rowNum}.c`,
          codeVersion: `v${faker.system.semver()}`,
          authorLLR: em.name,
          authorLLT: author.name,
          testStatus,
          its: faker.datatype.boolean(0.3)
            ? `ITS#${faker.number.int({ min: 1000, max: 9999 })}`
            : "",
          iqa: faker.datatype.boolean(0.2)
            ? `IQA#${faker.number.int({ min: 1000, max: 9999 })}`
            : "",
          commentLLT: testStatus === "KO" ? faker.lorem.sentence() : "",
          statusLLTDate: pick(STATUS_LLT_OPTIONS),
        });
      }
    }

    // one Sheet per project, columns matching the grid, rows built above.
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
      `${consultantCounter} consultants across ${NUM_PROJECTS} projects (with a sheet each).`,
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
