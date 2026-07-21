"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, SearchIcon } from "lucide-react";
import { DottedSeparator } from "./dotted-separator";
import { DataTable } from "./data-table";
import { getColumns, Project } from "@/features/projects-columns";
import { deleteProject } from "@/app/actions/projects";
import { ProjectFormDialog } from "@/features/project_form_dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectsViewProps {
  projects: Project[];
}

export const ProjectsView = ({
  projects: initialProjects,
}: ProjectsViewProps) => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, projects]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/?projectId=${projectId}`);
  };

  // Called by the form dialog after a create/update server action succeeds.
  const handleFormSuccess = (savedProject: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === savedProject.id);
      return exists
        ? prev.map((p) => (p.id === savedProject.id ? savedProject : p))
        : [savedProject, ...prev];
    });
    setEditingProject(null);
    router.refresh();
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const id = projectToDelete.id;

    startDeleteTransition(async () => {
      const result = await deleteProject(id);
      if (result.success) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      }
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    });
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
                className="text-left font-medium w-full hover:text-primary transition-colors"
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
    <>
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
            <Button
              size="sm"
              className="w-full lg:w-auto"
              onClick={handleNewProject}
            >
              <PlusIcon className="size-4 mr-2" />
              New
            </Button>
          </div>

          <DottedSeparator className="my-4" />

          {filteredProjects.length === 0 && search ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                {`No projects found matching "${search}"`}
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No projects yet. Create your first project to get started.
              </p>
              <Button onClick={handleNewProject}>
                <PlusIcon className="size-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <DataTable columns={tableColumns} data={filteredProjects} />
          )}
        </div>
      </div>

      {/* Project Form Dialog */}
      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to delete "${projectToDelete?.name}"? This
              action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
