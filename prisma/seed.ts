import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
} from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { hashPassword } from "@/lib/auth";
import { hash } from "crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // 1. Clean existing data to prevent unique/foreign key constraints violations on re-run
  await prisma.timeEntry.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users (Managers first so we can reference them)
  const unitManager = await prisma.user.create({
    data: {
      name: "Alice UnitManager",
      email: "alice@company.com",
      role: Role.UNIT_MANAGER,
      password: await hashPassword("0000"), // In production, use bcrypt/argon2 to hash this
    },
  });

  const consultant = await prisma.user.create({
    data: {
      name: "Bob Consultant",
      email: "bob@company.com",
      role: Role.CONSULTANT,
      password: "hashed_password_456",
      managerId: unitManager.id, // Setting up the ReportsTo relationship
    },
  });

  // 3. Create a Project
  const project = await prisma.project.create({
    data: {
      name: "Project Apollo",
      status: ProjectStatus.ACTIVE,
    },
  });

  // 4. Create Tasks inside the Project
  const task1 = await prisma.task.create({
    data: {
      title: "Database Design",
      status: TaskStatus.DONE,
      projectId: project.id,
      estimatedDays: 3.5,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "API Implementation",
      status: TaskStatus.IN_PROGRESS,
      projectId: project.id,
      estimatedDays: 5.0,
    },
  });

  // 5. Create Project Assignment
  await prisma.assignment.create({
    data: {
      userId: consultant.id,
      projectId: project.id,
      assignedById: unitManager.id,
      roleOnProject: "Lead Backend Developer",
      startDate: new Date(),
    },
  });

  // 6. Create Time Entries
  await prisma.timeEntry.create({
    data: {
      userId: consultant.id,
      taskId: task1.id,
      days: 3.0,
      note: "Completed core database migrations and seeding script.",
    },
  });

  await prisma.timeEntry.create({
    data: {
      userId: consultant.id,
      taskId: task2.id,
      days: 1.5,
      note: "Setup boilerplate routes and middleware.",
    },
  });
}

main()
  .catch(() => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
