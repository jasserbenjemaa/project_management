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

// tune these however you like — they currently total 100 users / 10 projects
const NUM_UNIT_MANAGERS = 10;
const NUM_PEOPLE_MANAGERS = 20;
const NUM_CONSULTANTS = 70;
const NUM_PROJECTS = 10;
const TASKS_PER_PROJECT = 6;

const ARTIFACT_LABELS = ["HLT", "LLT", "LLR", "Code review", "Architecture"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // 1. clean slate — order matters because of foreign keys
  await prisma.timeEntry.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.task.deleteMany({});
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
        },
      }),
    );
  }

  // 3. people managers — each reports to a random unit manager
  const peopleManagers = [];
  for (let i = 0; i < NUM_PEOPLE_MANAGERS; i++) {
    peopleManagers.push(
      await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `people.manager.${i}@company.com`,
          role: Role.PEOPLE_MANAGER,
          password: passwordHash,
          managerId: pick(unitManagers).id,
        },
      }),
    );
  }

  // 4. consultants — each reports to a random people manager. seniority_level and
  //    artifact_type are set here only (they're the "what they work on / how senior"
  //    attributes from your spec) — remove if you want managers to have them too.
  const consultantLevels = Object.values(Level);
  const artifactTypes = Object.values(Artifact);
  const consultants = [];
  for (let i = 0; i < NUM_CONSULTANTS; i++) {
    consultants.push(
      await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `consultant.${i}@company.com`,
          role: Role.CONSULTANT,
          password: passwordHash,
          managerId: pick(peopleManagers).id,
          seniority_level: pick(consultantLevels),
          artifact_type: pick(artifactTypes),
        },
      }),
    );
  }

  const staff = [...peopleManagers, ...consultants];

  // 5. projects
  const projectStatuses = Object.values(ProjectStatus);
  const projects = [];
  for (let i = 0; i < NUM_PROJECTS; i++) {
    projects.push(
      await prisma.project.create({
        data: {
          name: `Project ${faker.commerce.productAdjective()} ${faker.animal.type()}`,
          status: pick(projectStatuses),
        },
      }),
    );
  }

  // 6. tasks per project
  const taskStatuses = Object.values(TaskStatus);
  const tasksByProject: Record<
    string,
    Awaited<ReturnType<typeof prisma.task.create>>[]
  > = {};
  for (const project of projects) {
    tasksByProject[project.id] = [];
    for (let t = 0; t < TASKS_PER_PROJECT; t++) {
      const task = await prisma.task.create({
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
      });
      tasksByProject[project.id].push(task);
    }
  }

  // 7. assignments — every people manager / consultant staffed on exactly one project
  //    (keeps the "one user, one project" rule), plus a few time entries per assignment
  //    so KPI has something to be computed from.
  for (const user of faker.helpers.shuffle(staff)) {
    const project = pick(projects);
    const assignedBy = pick(unitManagers);

    await prisma.assignment.create({
      data: {
        userId: user.id,
        projectId: project.id,
        assignedById: assignedBy.id,
        roleOnProject:
          user.role === Role.PEOPLE_MANAGER ? "People manager" : "Consultant",
        startDate: faker.date.recent({ days: 90 }),
      },
    });

    const projectTasks = tasksByProject[project.id];
    const entryCount = faker.number.int({ min: 1, max: 3 });
    for (let e = 0; e < entryCount; e++) {
      const task = pick(projectTasks);
      await prisma.timeEntry.create({
        data: {
          userId: user.id,
          taskId: task.id,
          days: faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 }),
          note: faker.lorem.sentence(),
        },
      });
    }
  }

  console.log(
    `Seeded ${unitManagers.length + peopleManagers.length + consultants.length} users and ${projects.length} projects.`,
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
