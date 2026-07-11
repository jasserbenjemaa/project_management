"use server";

import { email, z } from "zod";
import { createSession, deleteSession, verifyPassword } from "@/lib/auth";
import { getUserByEmail } from "@/lib/dal";
import { redirect } from "next/navigation";

const SignInSchema = z.object({
  email: z.email("invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
};

export async function signIn(formData: FormData): Promise<ActionResponse> {
  const data = {
    email: formData.get("email") as string,
    password: formData.get("email") as string,
  };
  const validationResult = SignInSchema.safeParse(data);
  if (!validationResult.success)
    return {
      success: false,
      message: "wrong credentials",
      errors: validationResult.error.flatten().fieldErrors,
    };
  const user = await getUserByEmail(data.email);
  if (!user)
    return {
      success: false,
      message: "Invalid email or password",
      errors: { email: ["invalid email or password"] },
    };

  const isPasswordValid = await verifyPassword(data.password, user.password);
  if (!isPasswordValid)
    return {
      success: false,
      message: "Invalid email or password",
      errors: { password: ["Invalid email or password"] },
    };

  await createSession(user.id);
  return { success: true, message: "Signed in successfully" };
}

export async function signOut() {
  await deleteSession();
  redirect("/sign-in");
}
