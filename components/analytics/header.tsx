"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";

function formatDate(date: Date) {
  return `${date.getDate()} / ${date.getMonth() + 1} / ${date.getFullYear()}`;
}

export default function KpiHeader() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze trends, track growth, and make data-driven decisions.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" className="gap-2 font-normal">
              <CalendarIcon className="h-4 w-4" />
              {date ? formatDate(date) : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>

        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
