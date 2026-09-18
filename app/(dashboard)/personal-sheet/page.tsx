import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/actions/auth";
import { getTasksForCurrentUser } from "@/app/actions/tasks";
import TaskBoard from "@/features/components/task-board";
// Server Component: this is the actual route entry, so it's the right
// place to read the session and fetch the authenticated user's tasks.
// All the interactive bits (tabs, drag-and-drop, search) stay in the
// client component this renders — see features/components/task-board.tsx.
export default async function TasksPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/sign-in");

  let tasks: Awaited<ReturnType<typeof getTasksForCurrentUser>> = [];
  try {
    tasks = await getTasksForCurrentUser();
  } catch (error) {
    // Same pattern as the rest of the actions/ layer: log and degrade to
    // an empty board rather than crashing the page.
    console.error("Failed to load tasks for current user", error);
  }

  return <TaskBoard tasks={tasks} />;
}
