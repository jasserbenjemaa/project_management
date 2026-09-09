"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/circular-progress";
import type { ProjectStatus } from "@/app/generated/prisma/enums";

export type { ProjectStatus };

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number; // 0-100
  deadline: string | null; // ISO string, nullable if no deadline set
  createdAt: string;
  updatedAt: string;
};

type StatusConfigEntry = { label: string; className: string };
type StatusConfigMap = Record<ProjectStatus, StatusConfigEntry>;

export const STATUS_CONFIG: StatusConfigMap = {
  PLANNED: {
    label: "Planned",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isOverdue = (deadline: string | null, status: ProjectStatus) => {
  if (!deadline || status === "COMPLETED") return false;
  return new Date(deadline).getTime() < Date.now();
};

interface ColumnActions {
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export const getColumns = ({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<Project>[] => {
  const showActions = !!(onEdit || onDelete);

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 size-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = STATUS_CONFIG[row.getValue("status") as ProjectStatus];
        return (
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
        );
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "progress",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Progress
            <ArrowUpDown className="ml-2 size-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <CircularProgress value={row.getValue("progress") as number} />
      ),
      sortingFn: (a, b) => a.original.progress - b.original.progress,
    },
    {
      accessorKey: "deadline",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Deadline
            <ArrowUpDown className="ml-2 size-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const deadline = row.getValue("deadline") as string | null;
        const overdue = isOverdue(deadline, row.original.status);
        if (!deadline) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span
            className={
              overdue ? "text-destructive font-medium" : "text-muted-foreground"
            }
          >
            {formatDate(deadline)}
          </span>
        );
      },
      sortingFn: (a, b) => {
        const aTime = a.original.deadline
          ? new Date(a.original.deadline).getTime()
          : Infinity;
        const bTime = b.original.deadline
          ? new Date(b.original.deadline).getTime()
          : Infinity;
        return aTime - bTime;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created
            <ArrowUpDown className="ml-2 size-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.getValue("createdAt"))}
        </span>
      ),
      sortingFn: (a, b) =>
        new Date(a.original.createdAt).getTime() -
        new Date(b.original.createdAt).getTime(),
    },
  ];

  if (showActions) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
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
          )}
          {onDelete && (
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
          )}
        </div>
      ),
    });
  }

  return columns;
};
