"use client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeniorityLevel, UserRole, UserRow } from "@/lib/types";

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
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
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
};

const LEVEL_CONFIG: Record<
  SeniorityLevel,
  { label: string; className: string }
> = {
  JUNIOR: {
    label: "Junior",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
  MID: {
    label: "Mid",
    className: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
  },
  SENIOR: {
    label: "Senior",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  EXPERT: {
    label: "Expert",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
};

interface ColumnActions {
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

export const getUserColumns = ({
  onEdit,
  onDelete,
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
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("email")}</span>
    ),
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
  },
  {
    accessorKey: "seniorityLevel",
    header: "Level",
    cell: ({ row }) => {
      const level = row.getValue("seniorityLevel") as SeniorityLevel | null;
      if (!level) return <span className="text-muted-foreground">—</span>;
      const cfg = LEVEL_CONFIG[level];
      return (
        <Badge variant="secondary" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "projects",
    header: "Projects",
    cell: ({ row }) => {
      const projects = row.original.projects;
      if (!projects.length)
        return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {projects.map((p) => (
            <Badge key={p.id} variant="outline" className="font-normal">
              {p.name}
            </Badge>
          ))}
        </div>
      );
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
