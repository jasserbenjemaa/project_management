// features/users/actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcrypt";

const createPeopleManagerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createPeopleManager(
  input: z.infer<typeof createPeopleManagerSchema>,
) {
  const data = createPeopleManagerSchema.parse(input);

  const existing = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "PEOPLE_MANAGER",
    },
  });

  revalidatePath("/people-managers");
  return user;
}
