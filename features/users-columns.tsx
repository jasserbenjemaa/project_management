"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Types -----------------------------------------------------------------
// These line up 1:1 with the Prisma schema's enums (Role, Level, Artifact).
export type UserRole = "UNIT_MANAGER" | "PEOPLE_MANAGER" | "CONSULTANT";
export type SeniorityLevel = "JUNIOR" | "MID" | "SENIOR" | "EXPERT";
export type ArtifactType =
  | "HLT"
  | "LLT"
  | "LLR"
  | "CODE_REVIEW"
  | "ARCHITECTURE";

export type UserProjectRef = {
  id: string;
  name: string;
};

// This is the shape the table expects. Build it server-side by including
// `assignments.project` and `manager` on your Prisma `user.findMany` call,
// then map each row down to this shape before passing it to <UsersView />.
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  seniority_level: SeniorityLevel | null;
  artifact_type: ArtifactType | null;
  manager: { id: string; name: string } | null;
  projects: UserProjectRef[]; // derived from user.assignments[].project
};

// --- Display config ----------------------------------------------------------
export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; className: string }
> = {
  UNIT_MANAGER: {
    label: "Unit Manager",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  },
  PEOPLE_MANAGER: {
    label: "People Manager",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  CONSULTANT: {
    label: "Consultant",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
};

export const SENIORITY_CONFIG: Record<
  SeniorityLevel,
  { label: string; className: string }
> = {
  JUNIOR: {
    label: "Junior",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  MID: {
    label: "Mid",
    className: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
  },
  SENIOR: {
    label: "Senior",
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  },
  EXPERT: {
    label: "Expert",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
};

export const ARTIFACT_CONFIG: Record<
  ArtifactType,
  { label: string; className: string }
> = {
  HLT: {
    label: "HLT",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  },
  LLT: {
    label: "LLT",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  LLR: {
    label: "LLR",
    className: "bg-lime-100 text-lime-700 hover:bg-lime-100",
  },
  CODE_REVIEW: {
    label: "Code Review",
    className: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  },
  ARCHITECTURE: {
    label: "Architecture",
    className: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  },
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

interface ColumnActions {
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
  // Optional: if provided, clicking a user's name navigates (e.g. to a
  // detail page) instead of just rendering static text.
  onNameClick?: (user: UserRow) => void;
}

export const getUserColumns = ({
  onEdit,
  onDelete,
  onNameClick,
}: ColumnActions): ColumnDef<UserRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const user = row.original;
      const content = (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="font-medium leading-none">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      );

      if (!onNameClick) return content;

      return (
        <button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onNameClick(user);
          }}
        >
          {content}
        </button>
      );
    },
    filterFn: (row, _id, value: string) => {
      const user = row.original;
      const needle = value.toLowerCase();
      return (
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle)
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = ROLE_CONFIG[row.getValue("role") as UserRole];
      return (
        <Badge variant="secondary" className={role.className}>
          {role.label}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "seniority_level",
    header: "Seniority",
    cell: ({ row }) => {
      const level = row.getValue("seniority_level") as SeniorityLevel | null;
      if (!level) return <span className="text-muted-foreground">—</span>;
      const config = SENIORITY_CONFIG[level];
      return (
        <Badge variant="secondary" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "artifact_type",
    header: "Artifact",
    cell: ({ row }) => {
      const artifact = row.getValue("artifact_type") as ArtifactType | null;
      if (!artifact) return <span className="text-muted-foreground">—</span>;
      const config = ARTIFACT_CONFIG[artifact];
      return (
        <Badge variant="secondary" className={config.className}>
          {config.label}
        </Badge>
      );
    },
    filterFn: (row, id, value: string) =>
      value === "all" || row.getValue(id) === value,
  },
  {
    accessorKey: "manager",
    header: "Manager",
    cell: ({ row }) => {
      const manager = row.original.manager;
      return manager ? (
        <span>{manager.name}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "projects",
    header: "Projects",
    cell: ({ row }) => {
      const projects = row.original.projects;
      if (!projects.length)
        return <span className="text-muted-foreground">—</span>;
      const visible = projects.slice(0, 2);
      const remaining = projects.length - visible.length;
      return (
        <div className="flex flex-wrap items-center gap-1">
          {visible.map((project) => (
            <Badge key={project.id} variant="outline">
              {project.name}
            </Badge>
          ))}
          {remaining > 0 && <Badge variant="outline">+{remaining}</Badge>}
        </div>
      );
    },
    // Used by the "Project" select filter: matches if the user is assigned
    // to the selected project id, or always matches when value is "all".
    filterFn: (row, _id, value: string) => {
      if (value === "all") return true;
      return row.original.projects.some((project) => project.id === value);
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <PencilIcon className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original);
          }}
        >
          <TrashIcon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    ),
  },
];
