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

// How many days out from its delivery date a project counts as "at
// risk" rather than comfortably "on track" — kept identical to
// AT_RISK_WINDOW_DAYS in actions/projects.ts (deriveProjectHealth) so
// this calendar's dot colors never disagree with the status donut.
const AT_RISK_WINDOW_DAYS = 14;

// Legend (and dot colors) below match deriveProjectHealth's rule
// one-for-one:
//   - COMPLETED status                          -> green  "Delivered"
//   - not completed, delivery date already past -> red    "Delayed"
//   - not completed, ON_HOLD OR due within
//     AT_RISK_WINDOW_DAYS                        -> orange "At risk"
//   - everything else                            -> blue   "Active"
function colorForProject(status: ProjectStatus, deliveryDate: Date): string {
  if (status === "COMPLETED") return "bg-green-500";

  const now = Date.now();
  if (deliveryDate.getTime() < now) return "bg-red-500";

  if (status === "ON_HOLD") return "bg-orange-500";
  const daysUntilDue = (deliveryDate.getTime() - now) / (1000 * 60 * 60 * 24);
  if (daysUntilDue <= AT_RISK_WINDOW_DAYS) return "bg-orange-500";

  return "bg-blue-500";
}

const LEGEND: { color: string; label: string }[] = [
  { color: "bg-blue-500", label: "Active" },
  { color: "bg-green-500", label: "Delivered" },
  { color: "bg-orange-500", label: "At risk" },
  { color: "bg-red-500", label: "Delayed" },
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Manual, locale-independent formatting for the data-day attribute.
// day.date.toLocaleDateString() with no explicit locale uses whatever
// locale the *runtime* defaults to, which differs between the Node
// server and the browser (e.g. "8/30/2026" vs "30/08/2026") and causes
// a hydration mismatch — same root cause as the Progress aria-valuetext
// issue. This never touches Intl, so server and client always agree.
function formatDataDay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function CalendarDayButton(
  props: React.ComponentProps<typeof DayButton> & { events: CalendarEvent[] },
) {
  const { day, modifiers, events, ...buttonProps } = props;
  const dayEvents = events.filter((e) => isSameDay(e.date, day.date));

  const dayButton = (
    <button
      {...buttonProps}
      data-day={formatDataDay(day.date)}
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
    return dayButton;
  }

  return (
    <Tooltip>
      {/* render (Base UI's polymorphic prop, the equivalent of Radix's
          asChild) merges the trigger's handlers/ARIA attrs directly onto
          dayButton instead of wrapping it in TooltipTrigger's own
          <button> — that wrapping is what caused the invalid
          <button><button> nesting. */}
      <TooltipTrigger render={dayButton} />
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
      <CardContent className="flex flex-col items-center gap-3 pb-6">
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

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

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
