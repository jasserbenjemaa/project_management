"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Consultants
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
          <Progress value={value} className="h-2" />
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
// Engagement managers
// ---------------------------------------------------------------------------

export type Region = "North America" | "EMEA" | "APAC" | "LATAM";

export type EngagementManager = {
  id: string;
  name: string;
  region: Region;
  progression: number; // 0-100 — "% Progression"
  completionRate: number; // 0-100 — "Completion Rate" (taux d'avancement)
  deliveryDate: string; // ISO date — "Delivery Date" (date de livraison)
  engagements: string[]; // accounts they oversee
  kpi: number; // 0-100, client satisfaction score
};

export const engagementManagers: EngagementManager[] = [
  {
    id: "1",
    name: "Farah Ben Youssef",
    region: "EMEA",
    progression: 88,
    completionRate: 76,
    deliveryDate: "2026-10-15",
    engagements: ["Atlas Migration", "Zenith Portal"],
    kpi: 93,
  },
  {
    id: "2",
    name: "Marcus Reyes",
    region: "North America",
    progression: 74,
    completionRate: 62,
    deliveryDate: "2026-11-01",
    engagements: ["Nova CRM", "Pulse Dashboard"],
    kpi: 81,
  },
  {
    id: "3",
    name: "Priya Nair",
    region: "APAC",
    progression: 66,
    completionRate: 55,
    deliveryDate: "2026-12-05",
    engagements: ["Orion Analytics"],
    kpi: 72,
  },
  {
    id: "4",
    name: "Diego Alvarez",
    region: "LATAM",
    progression: 53,
    completionRate: 40,
    deliveryDate: "2027-01-20",
    engagements: ["Comet Mobile", "Vertex API"],
    kpi: 61,
  },
  {
    id: "5",
    name: "Sophie Laurent",
    region: "EMEA",
    progression: 95,
    completionRate: 90,
    deliveryDate: "2026-09-30",
    engagements: ["Helios Billing", "Atlas Migration", "Nova CRM"],
    kpi: 90,
  },
  {
    id: "6",
    name: "James Whitfield",
    region: "North America",
    progression: 41,
    completionRate: 28,
    deliveryDate: "2027-02-10",
    engagements: ["Pulse Dashboard"],
    kpi: 48,
  },
];

const regionStyles: Record<Region, string> = {
  "North America": "bg-blue-100 text-blue-700 hover:bg-blue-100",
  EMEA: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  APAC: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  LATAM: "bg-amber-100 text-amber-700 hover:bg-amber-100",
};

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
          <div className="flex flex-col">
            <span className="font-medium">{manager.name}</span>
            <Badge
              variant="secondary"
              className={`w-fit text-xs font-normal ${regionStyles[manager.region]}`}
            >
              {manager.region}
            </Badge>
          </div>
        </div>
      );
    },
  },
  {
    // "% Progression" (%progression)
    accessorKey: "progression",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        % Progression
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<number>("progression");
      return (
        <div className="flex w-40 items-center gap-2">
          <Progress value={value} className="h-2" />
          <span className="w-9 text-right text-sm text-muted-foreground">
            {value}%
          </span>
        </div>
      );
    },
  },
  {
    // "Completion Rate" (taux d'avancement)
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
          <Progress value={value} className="h-2" />
          <span className="w-9 text-right text-sm text-muted-foreground">
            {value}%
          </span>
        </div>
      );
    },
  },
  {
    // "Delivery Date" (date de livraison)
    accessorKey: "deliveryDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Delivery Date
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue<string>("deliveryDate");
      return (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      );
    },
  },
  {
    accessorKey: "engagements",
    header: "Projects",
    cell: ({ row }) => {
      const engagements = row.getValue<string[]>("engagements");
      return (
        <div className="flex max-w-xs flex-wrap gap-1.5">
          {engagements.map((engagement) => (
            <Badge
              key={engagement}
              variant="outline"
              className="text-xs font-normal"
            >
              {engagement}
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

export default function TeamTable() {
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
            <DataTable
              columns={managerColumns}
              data={engagementManagers}
              pageSize={7}
              initialSorting={[{ id: "progression", desc: true }]}
            />
          </TabsContent>
          <TabsContent value="consultants">
            <DataTable
              columns={consultantColumns}
              data={consultants}
              pageSize={7}
              initialSorting={[{ id: "kpi", desc: true }]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
