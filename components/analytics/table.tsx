"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import type { ConsultantRow, ManagerRow, Specialty } from "@/app/actions/stats";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
// Consultants — real data (see app/actions/team.ts: getConsultantsOverview)
// ---------------------------------------------------------------------------

export type Consultant = ConsultantRow;

const specialtyStyles: Record<Specialty, string> = {
  HLT: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  LLR: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  LLT: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  "Code Review": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  Architecture: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

const consultantColumns: ColumnDef<Consultant>[] = [
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
    // % of this consultant's LLR-assigned tasks that are DELIVERED.
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
        <div className="flex w-40 items-center gap-2">
          <Progress
            value={value}
            className="h-2"
            aria-valuetext={`${value}%`}
          />
          <span className="w-9 text-right text-sm text-muted-foreground">
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
      if (projects.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <div className="flex max-w-xs flex-wrap gap-1.5">
          {projects.map((project) => (
            <Badge
              key={project}
              variant="outline"
              className="text-xs font-normal"
            >
              {project}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    // LLR KPI (see actions/kpi.ts: getUserKpiForRole(id, "LLR").kpi).
    // NOTE: unlike progression, this is not a bounded 0-100 percentage —
    // it's a complexity-weighted score, so the color thresholds below
    // are a rough heuristic, not calibrated cutoffs. Tune kpiColor (or
    // normalize the score in getConsultantsOverview) if that's misleading.
    accessorKey: "kpi",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        KPI (LLR)
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
// Engagement managers — real data (see app/actions/team.ts:
// getEngagementManagersOverview). No manager-KPI formula is defined yet,
// so this table only shows progression / completion rate / projects.
// ---------------------------------------------------------------------------

export type EngagementManager = ManagerRow;

const managerColumns: ColumnDef<EngagementManager>[] = [
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
      const manager = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(manager.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{manager.name}</span>
        </div>
      );
    },
  },
  {
    // % of ALL tasks across every project this manager is on that are
    // DELIVERED — not scoped to tasks personally assigned to them, since
    // a manager owns the project's delivery as a whole.
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
        <div className="flex w-40 items-center gap-2">
          <Progress
            value={value}
            className="h-2"
            aria-valuetext={`${value}%`}
          />
          <span className="w-9 text-right text-sm text-muted-foreground">
            {value}%
          </span>
        </div>
      );
    },
  },
  {
    // % of their assigned projects with status COMPLETED.
    accessorKey: "completionRate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Completion Rate
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("completionRate");
      return (
        <div className="flex w-40 items-center gap-2">
          <Progress
            value={value}
            className="h-2"
            aria-valuetext={`${value}%`}
          />
          <span className="w-9 text-right text-sm text-muted-foreground">
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
      if (projects.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <div className="flex max-w-xs flex-wrap gap-1.5">
          {projects.map((project) => (
            <Badge
              key={project}
              variant="outline"
              className="text-xs font-normal"
            >
              {project}
            </Badge>
          ))}
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Table wrapper with tabs
// ---------------------------------------------------------------------------

export default function TeamTable({
  consultants = [],
  managers = [],
}: {
  // Fetch both with the functions in app/actions/team.ts in the parent
  // server component and pass the results down — this component stays
  // client-side (needed for the search inputs' state) and does no data
  // fetching itself.
  consultants?: Consultant[];
  managers?: EngagementManager[];
}) {
  const [consultantSearch, setConsultantSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");

  const filteredConsultants = useMemo(() => {
    const q = consultantSearch.trim().toLowerCase();
    if (!q) return consultants;
    return consultants.filter((c) => c.name.toLowerCase().includes(q));
  }, [consultants, consultantSearch]);

  const filteredManagers = useMemo(() => {
    const q = managerSearch.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter((m) => m.name.toLowerCase().includes(q));
  }, [managers, managerSearch]);

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Team</CardTitle>
        <p className="text-sm text-muted-foreground">
          Progress and KPI across engagement managers and consultants
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="managers">
          <TabsList>
            <TabsTrigger value="managers">Engagement managers</TabsTrigger>
            <TabsTrigger value="consultants">Consultants</TabsTrigger>
          </TabsList>
          <TabsContent value="managers">
            <div className="relative mb-3 max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                placeholder="Search managers..."
                className="pl-8"
              />
            </div>
            <DataTable
              columns={managerColumns}
              data={filteredManagers}
              pageSize={7}
              initialSorting={[{ id: "progression", desc: true }]}
            />
          </TabsContent>
          <TabsContent value="consultants">
            <div className="relative mb-3 max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={consultantSearch}
                onChange={(e) => setConsultantSearch(e.target.value)}
                placeholder="Search consultants..."
                className="pl-8"
              />
            </div>
            <DataTable
              columns={consultantColumns}
              data={filteredConsultants}
              pageSize={7}
              initialSorting={[{ id: "kpi", desc: true }]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
