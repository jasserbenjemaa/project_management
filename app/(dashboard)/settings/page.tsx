import SettingsForm from "./SettingsForm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId as string },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return <SettingsForm user={user} />;
}