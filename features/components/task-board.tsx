"use client";

import { useMemo, useState } from "react";
import { KanbanSquare, CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import KanbanBoard, {
  type Task,
  type TaskStatus,
  sampleTasks,
} from "@/features/components/data-kanban";
import TaskCalendar from "@/features/components/calendar-view";
import { updateTaskStatus } from "@/app/actions/tasks";

// ---------------------------------------------------------------------------
// TaskBoard — purely presentational/interactive. Data comes from the
// parent Server Component (app/(protected)/tasks/page.tsx), which fetches
// the authenticated user's tasks via getTasksForCurrentUser() and passes
// them in as `tasks`. `sampleTasks` is only a fallback for rendering this
// component in isolation (e.g. Storybook) without that wrapper — once a
// `tasks` prop is passed, even an empty array, it's used as-is instead of
// falling back to samples.
//
// Kanban tab: TaskBoard owns the `tasks` state and hands it to KanbanBoard
// as a controlled component via `tasks` + `onTasksChange`, so a drag or a
// new task here is where you'd also fire a server action to persist it.
// Calendar tab: read-only view (react-big-calendar), filterable by the
// search box without touching the underlying task list.
// ---------------------------------------------------------------------------

export default function TaskBoard({ tasks: tasksProp }: { tasks?: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(tasksProp ?? sampleTasks);
  const [calendarSearch, setCalendarSearch] = useState("");

  const filteredForCalendar = useMemo(() => {
    const q = calendarSearch.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.project.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q),
    );
  }, [tasks, calendarSearch]);

  // The local state update already happened (KanbanBoard called
  // onTasksChange before this fires), so this just persists it. On
  // failure, revert this one task back to its previous status rather
  // than leaving the UI showing a move that didn't actually save.
  async function handleTaskStatusChange(
    taskId: string,
    status: TaskStatus,
    previousStatus: TaskStatus,
  ) {
    const result = await updateTaskStatus(taskId, status);
    if (!result.success) {
      console.error(result.error);
      setTasks((current) =>
        current.map((t) =>
          t.id === taskId ? { ...t, status: previousStatus } : t,
        ),
      );
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden p-6">
      <Card className="w-full min-w-0 max-w-full rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Tasks</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track work on the board or by due date
          </p>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <Tabs defaultValue="kanban" className="min-w-0">
            <TabsList className="mb-3">
              <TabsTrigger value="kanban">
                <KanbanSquare className="mr-1.5 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="kanban" className="min-w-0 pr-4 pt-1">
              <KanbanBoard
                tasks={tasks}
                onTasksChange={setTasks}
                onTaskStatusChange={handleTaskStatusChange}
              />
            </TabsContent>
            <TabsContent value="calendar" className="min-w-0 pt-1">
              <div className="relative mb-3 max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={calendarSearch}
                  onChange={(e) => setCalendarSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-8"
                />
              </div>
              <TaskCalendar tasks={filteredForCalendar} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
