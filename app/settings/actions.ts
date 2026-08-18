"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function updateSettings(data: {
  name: string;
  email: string;
  role: string;
}) {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await db.user.update({
      where: { id: session.userId as string },
      data: {
        name: data.name,
        email: data.email,
        role: data.role as Role,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error("Error updating settings:", e);
    return { success: false, error: "Something went wrong" };
  }
}