"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { DayButton } from "react-day-picker";
import { enUS } from "date-fns/locale";
import { getProjectDeliveries } from "@/app/actions/projects";
import type { ProjectStatus } from "@/app/generated/prisma/enums";

// One event per project delivery date, built from real data instead of
// the old hardcoded array.
type CalendarEvent = {
  date: Date;
  title: string;
  color: string; // tailwind color class, e.g. "bg-red-500"
};

// Same on-track / at-risk / delayed / completed semantics as
// project-status.tsx, so a color means the same thing everywhere on the
// dashboard. The schema has no separate "at risk"/"delayed" status field,
// so "delayed" is derived: not completed and past its delivery date.
function colorForProject(status: ProjectStatus, deliveryDate: Date): string {
  if (status === "COMPLETED") return "bg-blue-500";
  if (deliveryDate.getTime() < Date.now()) return "bg-red-500";
  if (status === "ON_HOLD") return "bg-amber-500";
  return "bg-green-500";
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarDayButton(
  props: React.ComponentProps<typeof DayButton> & { events: CalendarEvent[] },
) {
  const { day, modifiers, events, ...buttonProps } = props;
  const dayEvents = events.filter((e) => isSameDay(e.date, day.date));

  const content = (
    <button
      {...buttonProps}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      className="relative flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-md text-base aria-selected:bg-primary aria-selected:text-primary-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <span>{day.date.getDate()}</span>
      {dayEvents.length > 0 && (
        <span className="flex gap-0.5">
          {dayEvents.slice(0, 3).map((e, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${e.color}`} />
          ))}
        </span>
      )}
    </button>
  );

  if (dayEvents.length === 0) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger>{content}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <ul className="space-y-0.5">
          {dayEvents.map((e, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${e.color}`} />
              {e.title}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getProjectDeliveries()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setEvents(
            result.projects.map((p) => {
              const deliveryDate = new Date(p.deliveryDate);
              return {
                date: deliveryDate,
                title: `${p.name} — delivery`,
                color: colorForProject(p.status, deliveryDate),
              };
            }),
          );
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load project delivery dates.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="h-full rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Calendar</CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Project delivery dates this month
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 pb-6">
        <TooltipProvider>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={enUS}
            className="w-full rounded-lg border p-4"
            captionLayout="dropdown"
            components={{
              DayButton: (props) => (
                <CalendarDayButton {...props} events={events} />
              ),
            }}
          />
        </TooltipProvider>
        {loading && (
          <p className="text-xs text-muted-foreground">Loading deliveries…</p>
        )}
        {!loading && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default CalendarDemo;
