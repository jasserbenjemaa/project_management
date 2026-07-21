"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Project,
  ProjectStatus,
  STATUS_CONFIG,
} from "@/features/projects-columns";
import { createProject, updateProject } from "@/app/actions/projects";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  // Fired with the created/updated project once the server action succeeds.
  onSuccess: (project: Project) => void;
}

const STATUS_OPTIONS = Object.keys(STATUS_CONFIG) as ProjectStatus[];

export const ProjectFormDialog = ({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNED");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(project);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setStatus(project?.status ?? "PLANNED");
      setError(null);
    }
  }, [open, project]);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateProject(project!.id, { name, status })
        : await createProject({ name, status });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSuccess(result.project);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Project" : "New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="project-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ProjectStatus)}
            >
              <SelectTrigger id="project-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_CONFIG[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
