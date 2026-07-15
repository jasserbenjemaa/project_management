"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.string().min(1),
  status: z.enum(["BLOCKED", "TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  estimatedDays: z.coerce.number().optional(),
});

export async function createTask(input: z.infer<typeof createTaskSchema>) {
  const data = createTaskSchema.parse(input);

  const task = await db.task.create({
    data: {
      title: data.title,
      projectId: data.projectId,
      status: data.status, // Prisma accepts the plain string since it matches the enum values
      estimatedDays: data.estimatedDays,
    },
  });

  revalidatePath(`/projects/${data.projectId}`);

  return task;
}
