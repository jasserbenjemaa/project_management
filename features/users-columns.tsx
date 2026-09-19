"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role, Level, Artifact } from "@/app/generated/prisma/enums";

// --- Types -------------------------------------------------------------
// UserRow/UserProjectRef/etc. used to be duplicated here AND in
// lib/users-data.ts — two independent copies of the same shape, free to
// drift apart (which is exactly what caused the id: string vs
// id: string | null mismatch). lib/users-data.ts is the source of truth
// now (it's where the Prisma select + mapping actually live); re-export
// from there so nothing importing from "@/features/users-columns" has to
// change, and so there's only ever one definition to keep in sync with
// schema.prisma.
export type {
  UserRow,
  UserProjectRef,
  UserWithRelations,
} from "@/lib/users-data";
export { userRowSelect, mapUserToRow } from "@/lib/users-data";

import type { UserRow, UserProjectRef } from "@/lib/users-data";

export type UserRole = Role;
export type SeniorityLevel = Level;
export type ArtifactType = Artifact;

// --- Display config ----------------------------------------------------------
// `Record<UserRole, ...>` etc. below means TypeScript will now error if the
// Role/Level/Artifact enums in schema.prisma ever gain or lose a value and
// this config isn't updated to match.
export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; className: string }
> = {
  UNIT_MANAGER: {
    label: "Unit Manager",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  },
  ENGAGEMENT_MANAGER: {
    label: "Engagement Manager",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  CONSULTANT: {
    label: "Consultant",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
};

// Fixed priority order used when sorting the Role column. Engagement
// Manager ranks first (0) so it sits at the top when sorted ascending.
// Keep in sync if new roles are added to the Role enum.
const ROLE_SORT_RANK: Record<UserRole, number> = {
  ENGAGEMENT_MANAGER: 0,
  UNIT_MANAGER: 1,
  CONSULTANT: 2,
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

// Key for a project badge: falls back to the (snapshotted) name when the
// project itself has been deleted and id is null, since two deleted refs
// on the same user could otherwise collide on a null key.
const projectRefKey = (project: UserProjectRef, index: number) =>
  project.id ?? `${project.name}-${index}`;

// Shared header button that shows an up/down/neutral arrow depending on
// the column's current sort state, used by any sortable column.
function SortableHeader({
  label,
  isSorted,
  onClick,
}: {
  label: string;
  isSorted: false | "asc" | "desc";
  onClick: () => void;
}) {
  const Icon =
    isSorted === "asc"
      ? ArrowUp
      : isSorted === "desc"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <Button variant="ghost" size="sm" className="-ml-3" onClick={onClick}>
      {label}
      <Icon className="ml-2 size-3.5" />
    </Button>
  );
}

interface ColumnActions {
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
  // Optional: if provided, clicking a user's name navigates (e.g. to a
  // detail page) instead of just rendering static text.
  onNameClick?: (user: UserRow) => void;
  // Column ids to leave out entirely - e.g. the Engagement Managers page
  // hides "role" and "seniority_level" since every row is the same role
  // and seniority doesn't apply to that role. "name" and "actions" always
  // show regardless of what's passed here.
  hiddenColumns?: Array<
    "role" | "seniority_level" | "artifact_type" | "projects"
  >;
}

export const getUserColumns = ({
  onEdit,
  onDelete,
  onNameClick,
  hiddenColumns = [],
}: ColumnActions): ColumnDef<UserRow>[] => {
  const hidden = new Set<string>(hiddenColumns);

  const columns: ColumnDef<UserRow>[] = [
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
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
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
      header: ({ column }) => (
        <SortableHeader
          label="Role"
          isSorted={column.getIsSorted()}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => {
        const role = ROLE_CONFIG[row.getValue("role") as UserRole];
        return (
          <Badge variant="secondary" className={role.className}>
            {role.label}
          </Badge>
        );
      },
      // Custom priority order instead of alphabetical: Engagement Manager
      // ranks first, so it's on top by default (ascending sort).
      sortingFn: (rowA, rowB) => {
        const a = ROLE_SORT_RANK[rowA.original.role];
        const b = ROLE_SORT_RANK[rowB.original.role];
        return a - b;
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
            {visible.map((project, index) => (
              <Badge
                key={projectRefKey(project, index)}
                variant="outline"
                // Deleted projects only survive as a name snapshot — dim
                // them so it's clear the link/id behind them is gone.
                className={
                  project.isDeleted
                    ? "text-muted-foreground line-through"
                    : undefined
                }
              >
                {project.name}
              </Badge>
            ))}
            {remaining > 0 && <Badge variant="outline">+{remaining}</Badge>}
          </div>
        );
      },
      // Used by the "Project" select filter: matches if the user is assigned
      // to the selected project id, or always matches when value is "all".
      // A deleted project (id: null) can never match a specific filter
      // value, which is correct — it's no longer a selectable project.
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

  // Accessor-based columns (name/role/seniority_level/artifact_type) key off
  // `accessorKey`; the rest (projects/actions) have an explicit `id`.
  const columnKey = (col: ColumnDef<UserRow>): string =>
    "accessorKey" in col
      ? (col.accessorKey as string)
      : ((col.id as string) ?? "");

  return columns.filter((col) => !hidden.has(columnKey(col)));
};
