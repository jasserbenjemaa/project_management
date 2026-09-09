"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { DayButton } from "react-day-picker";

// Example event data — replace with your real events (e.g. from an API)
type CalendarEvent = {
  date: Date;
  title: string;
  color: string; // tailwind color class, e.g. "bg-red-500"
};

const events: CalendarEvent[] = [
  { date: new Date(2026, 8, 12), title: "Team standup", color: "bg-blue-500" },
  { date: new Date(2026, 8, 12), title: "Design review", color: "bg-pink-500" },
  {
    date: new Date(2026, 8, 20),
    title: "Product launch",
    color: "bg-green-500",
  },
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEventsForDay(day: Date) {
  return events.filter((e) => isSameDay(e.date, day));
}

function CalendarDayButton(props: React.ComponentProps<typeof DayButton>) {
  const { day, modifiers, ...buttonProps } = props;
  const dayEvents = getEventsForDay(day.date);

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
      className="relative flex h-9 w-9 flex-col items-center justify-center rounded-md text-sm aria-selected:bg-primary aria-selected:text-primary-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <span>{day.date.getDate()}</span>
      {dayEvents.length > 0 && (
        <span className="mt-0.5 flex gap-0.5">
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

  return (
    <TooltipProvider>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border"
        captionLayout="dropdown"
        components={{
          DayButton: CalendarDayButton,
        }}
      />
    </TooltipProvider>
  );
}

export default CalendarDemo;
