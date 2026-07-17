"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, SearchIcon } from "lucide-react";
import { DottedSeparator } from "./dotted-separator";
import { DataTable } from "./data-table";
import { getColumns, Project } from "@/features/projects-columns";

// Replace this with your real data (fetched projects)

export const ProjectsView = (props: { projects: Project[] }) => {
  const MOCK_PROJECTS = props.projects;
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    return MOCK_PROJECTS.filter((project) =>
      project.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, MOCK_PROJECTS]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/?projectId=${projectId}`);
  };

  // Replace these with your real edit/delete logic (e.g. open a dialog, call a mutation).
  const handleEditProject = (project: Project) => {
    console.log("edit", project.id);
  };

  const handleDeleteProject = (project: Project) => {
    console.log("delete", project.id);
  };

  const tableColumns = useMemo(() => {
    const base = getColumns({
      onEdit: handleEditProject,
      onDelete: handleDeleteProject,
    });

    // Give the table row an onClick without touching the shared DataTable component.
    return base.map((col, i) =>
      i === 0
        ? {
            ...col,
            cell: (ctx: Parameters<NonNullable<typeof col.cell>>[0]) => (
              <button
                className="text-left font-medium w-full"
                onClick={() => handleProjectClick(ctx.row.original.id)}
              >
                {ctx.row.original.name}
              </button>
            ),
          }
        : col,
    );
  }, []);

  return (
    <div className="flex-1 w-full border rounded-lg">
      <div className="h-full flex flex-col overflow-auto p-4">
        <div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
          <div className="relative w-full lg:w-64">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-full"
            />
          </div>
          <Button size="sm" className="w-full lg:w-auto">
            <PlusIcon className="size-4 mr-2" />
            New
          </Button>
        </div>

        <DottedSeparator className="my-4" />

        <DataTable columns={tableColumns} data={filteredProjects} />
      </div>
    </div>
  );
};
