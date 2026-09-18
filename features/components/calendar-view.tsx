"use client";

import { useMemo, useState } from "react";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { type Task, STATUS_LLT_COLORS, sampleTasks } from "./data-kanban";

// ---------------------------------------------------------------------------
// react-big-calendar setup
//
// Requires `date-fns` alongside `react-big-calendar`:
//   npm install react-big-calendar date-fns
// ---------------------------------------------------------------------------

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface TaskEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: Task;
}

function toEvent(task: Task): TaskEvent {
  const date = new Date(`${task.dueDate}T00:00:00`);
  return {
    id: task.id,
    title: task.title,
    start: date,
    end: date,
    allDay: true,
    resource: task,
  };
}

function EventPill({ event }: EventProps<TaskEvent>) {
  return (
    <div className="flex items-center gap-1 truncate">
      <span className="truncate">{event.title}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskCalendar — standalone, like KanbanBoard. Works with `sampleTasks` out
// of the box, or pass real `tasks` from a parent that owns the data.
// ---------------------------------------------------------------------------

export default function TaskCalendar({ tasks: tasksProp }: { tasks?: Task[] }) {
  const tasks = tasksProp ?? sampleTasks;

  const events = useMemo(() => tasks.map(toEvent), [tasks]);

  // Controlled so the toolbar's Back/Next/Today buttons reliably move
  // the displayed month (react-big-calendar can otherwise manage this
  // internally, but keeping it explicit avoids relying on that).
  const [date, setDate] = useState(new Date());

  function eventPropGetter(event: TaskEvent) {
    const colors = STATUS_LLT_COLORS[event.resource.status];
    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.fg,
        border: "none",
        borderRadius: "4px",
        fontSize: "12px",
        padding: "1px 6px",
      },
    };
  }

  return (
    <div className="rbc-theme w-0 min-w-full overflow-auto rounded-xl border border-border/60 p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={["month"]}
        view="month"
        date={date}
        onNavigate={setDate}
        popup
        eventPropGetter={eventPropGetter}
        components={{ event: EventPill }}
        style={{ height: 520, minWidth: 640 }}
      />
      <style jsx global>{`
        .rbc-theme .rbc-toolbar button {
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          font-size: 0.8125rem;
          padding: 0.375rem 0.75rem;
          color: hsl(var(--foreground));
        }
        .rbc-theme .rbc-toolbar button:hover {
          background-color: hsl(var(--muted));
        }
        .rbc-theme .rbc-toolbar button.rbc-active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-color: hsl(var(--primary));
        }
        .rbc-theme .rbc-toolbar-label {
          font-weight: 600;
          font-size: 0.9375rem;
        }
        .rbc-theme .rbc-month-view,
        .rbc-theme .rbc-time-view {
          border-radius: 0.75rem;
          overflow: hidden;
          border-color: hsl(var(--border));
        }
        .rbc-theme .rbc-header {
          border-color: hsl(var(--border));
          padding: 0.5rem 0;
          font-weight: 500;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
        .rbc-theme .rbc-day-bg + .rbc-day-bg,
        .rbc-theme .rbc-header + .rbc-header,
        .rbc-theme .rbc-month-row + .rbc-month-row {
          border-color: hsl(var(--border));
        }
        .rbc-theme .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.4);
        }
        .rbc-theme .rbc-today {
          background-color: hsl(var(--primary) / 0.06);
        }
        .rbc-theme .rbc-event {
          border: none;
        }
      `}</style>
    </div>
  );
}
