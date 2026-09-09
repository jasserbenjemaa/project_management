"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/data-table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Specialty = "HLT" | "LLR" | "LLT" | "Code Review" | "Architecture";

export type Consultant = {
  id: string;
  name: string;
  specialty: Specialty;
  progression: number; // 0-100
  projects: string[];
  kpi: number; // 0-100
};

// ---------------------------------------------------------------------------
// Sample data — replace with your API/DB query
// ---------------------------------------------------------------------------

export const consultants: Consultant[] = [
  {
    id: "1",
    name: "Sarah Mansour",
    specialty: "HLT",
    progression: 82,
    projects: ["Atlas Migration", "Nova CRM", "Helios Billing"],
    kpi: 91,
  },
  {
    id: "2",
    name: "Omar Belkacem",
    specialty: "LLR",
    progression: 47,
    projects: ["Orion Analytics"],
    kpi: 68,
  },
  {
    id: "3",
    name: "Nadia Chebbi",
    specialty: "LLT",
    progression: 63,
    projects: ["Zenith Portal", "Comet Mobile"],
    kpi: 74,
  },
  {
    id: "4",
    name: "Yassine Trabelsi",
    specialty: "Code Review",
    progression: 95,
    projects: ["Atlas Migration", "Vertex API", "Nova CRM", "Pulse Dashboard"],
    kpi: 88,
  },
  {
    id: "5",
    name: "Lina Feki",
    specialty: "Architecture",
    progression: 58,
    projects: ["Vertex API"],
    kpi: 55,
  },
  {
    id: "6",
    name: "Karim Hadded",
    specialty: "HLT",
    progression: 30,
    projects: ["Comet Mobile"],
    kpi: 40,
  },
  {
    id: "7",
    name: "Amira Sassi",
    specialty: "Code Review",
    progression: 71,
    projects: ["Pulse Dashboard", "Helios Billing"],
    kpi: 79,
  },
];

// ---------------------------------------------------------------------------
// Column styling helpers
// ---------------------------------------------------------------------------

const specialtyStyles: Record<Specialty, string> = {
  HLT: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  LLR: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  LLT: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  "Code Review": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  Architecture: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

function kpiColor(kpi: number) {
  if (kpi >= 80) return "text-emerald-600";
  if (kpi >= 60) return "text-amber-600";
  return "text-rose-600";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export const columns: ColumnDef<Consultant>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const consultant = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(consultant.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{consultant.name}</span>
            <Badge
              variant="secondary"
              className={`w-fit text-xs font-normal ${specialtyStyles[consultant.specialty]}`}
            >
              {consultant.specialty}
            </Badge>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "progression",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Progression
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("progression");
      return (
        <div className="flex items-center gap-2 w-40">
          <Progress value={value} className="h-2" locale="en-US" />
          <span className="text-sm text-muted-foreground w-9 text-right">
            {value}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "projects",
    header: "Projects",
    cell: ({ row }) => {
      const projects = row.getValue<string[]>("projects");
      return (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {projects.map((project) => (
            <Badge
              key={project}
              variant="outline"
              className="font-normal text-xs"
            >
              {project}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "kpi",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        KPI
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("kpi");
      return (
        <span className={`font-semibold tabular-nums ${kpiColor(value)}`}>
          {value}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Table wrapper
// ---------------------------------------------------------------------------

export default function ConsultantsTable() {
  return (
    <DataTable
      columns={columns}
      data={consultants}
      pageSize={7}
      initialSorting={[{ id: "kpi", desc: true }]}
    />
  );
}
