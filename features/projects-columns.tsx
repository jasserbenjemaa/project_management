"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: string;
};

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface ColumnActions {
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export const getColumns = ({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<Project>[] => [
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
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 size-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.getValue("dueDate"))}
      </span>
    ),
    sortingFn: (a, b) =>
      new Date(a.original.dueDate).getTime() -
      new Date(b.original.dueDate).getTime(),
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
