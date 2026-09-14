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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

import {
  createUser,
  updateUser,
  type UserFormInput,
} from "@/app/actions/users";
import { getProjectOptions } from "@/app/actions/projects";
import {
  ARTIFACT_CONFIG,
  ROLE_CONFIG,
  SENIORITY_CONFIG,
  type UserRow,
} from "./users-columns";

type UserOption = { id: string; name: string };

// Radix's <SelectItem> can't take an empty string as its value, so this
// sentinel stands in for "not set" on every optional single-select below.
const NONE = "none";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pass a user to edit them; pass null to create a new one.
  user: UserRow | null;
  userOptions: UserOption[];
  // The projects a user can be assigned to from this dialog. Optional so a
  // caller that forgets to pass it doesn't crash — but the Project field
  // will just show no options until it's wired up.
  projectOptions?: UserOption[];
  // Prefilled from the page's active filters when creating a user - e.g. if
  // the "Project" filter is set to "Project 4", the new user defaults into it.
  defaultValues?: {
    role?: Role;
    artifactType?: string;
    projectId?: string;
  };
  // When set, the Role field is hidden and every user created/edited here
  // gets this role - used by pages scoped to one role (Consultants,
  // Engagement Managers) where there's nothing to pick.
  fixedRole?: Role;
  onSaved?: () => void;
}

type FormState = {
  name: string;
  email: string;
  password: string;
  role: Role | "";
  seniority_level: string; // Level | NONE - only meaningful when role is CONSULTANT
  artifact_type: string; // Artifact | NONE
  hiredAt: Date | null;
  project_ids: string[]; // ids of every project this user is assigned to
};

const emptyState = (): FormState => ({
  name: "",
  email: "",
  password: "",
  role: "",
  seniority_level: NONE,
  artifact_type: NONE,
  hiredAt: null,
  project_ids: [],
});

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  // Callers can still pass this in directly (e.g. to reuse a list already
  // loaded on the page). If omitted, the dialog queries the projects
  // itself the first time it opens.
  projectOptions: projectOptionsProp,
  defaultValues,
  fixedRole,
  onSaved,
}: UserFormDialogProps) {
  const isEditing = !!user;
  const [form, setForm] = useState<FormState>(emptyState());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fetchedProjectOptions, setFetchedProjectOptions] = useState<
    UserOption[]
  >([]);

  const projectOptions = projectOptionsProp ?? fetchedProjectOptions;

  // Query the projects to populate the Project select whenever the dialog
  // opens, unless the caller already supplied a list via props.
  useEffect(() => {
    if (!open || projectOptionsProp) return;

    let cancelled = false;
    getProjectOptions().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setFetchedProjectOptions(result.projects);
      } else {
        console.error(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, projectOptionsProp]);

  // Reset/prefill the form whenever the dialog opens - either from the user
  // being edited, or from the page's current filters when creating.
  useEffect(() => {
    if (!open) return;

    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        seniority_level: user.seniority_level ?? NONE,
        artifact_type: user.artifact_type ?? NONE,
        // TODO: rename `UserRow.hireDate` -> `hiredAt` in users-columns.ts
        // to match the schema field.
        hiredAt: user.hiredAt ? new Date(user.hiredAt) : null,
        // TODO: `UserRow` currently only exposes `primaryAssignment` (one
        // project). Once it exposes the full `assignments` list, prefill
        // every assigned project here instead of just the primary one.
        project_ids: user.primaryAssignment
          ? [user.primaryAssignment.projectId]
          : [],
      });
    } else {
      setForm({
        ...emptyState(),
        role: fixedRole ?? defaultValues?.role ?? "",
        artifact_type: defaultValues?.artifactType ?? NONE,
        project_ids: defaultValues?.projectId ? [defaultValues.projectId] : [],
      });
    }
    setError(null);
  }, [open, user, defaultValues, fixedRole]);

  const isConsultant = form.role === "CONSULTANT";

  const toggleProject = (projectId: string) => {
    setForm((prev) => ({
      ...prev,
      project_ids: prev.project_ids.includes(projectId)
        ? prev.project_ids.filter((id) => id !== projectId)
        : [...prev.project_ids, projectId],
    }));
  };

  // Names (not ids) of every currently-selected project, for display in the
  // trigger button.
  const selectedProjectNames = projectOptions
    .filter((project) => form.project_ids.includes(project.id))
    .map((project) => project.name);

  // Seniority only means something for consultants - clear it whenever the
  // role changes to anything else so a stale value can't get submitted.
  const roleEntries = Object.entries(ROLE_CONFIG).filter(
    ([role]) => role !== "UNIT_MANAGER" || user?.role === "UNIT_MANAGER",
  );
  const handleRoleChange = (v: Role) => {
    setForm({
      ...form,
      role: v,
      seniority_level: v === "CONSULTANT" ? form.seniority_level : NONE,
    });
  };

  const handleSubmit = () => {
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.role) {
      setError("Name, email, and role are required.");
      return;
    }
    if (!isEditing && !form.password) {
      setError("Password is required.");
      return;
    }

    const payload: UserFormInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password || undefined,
      role: form.role as Role,
      seniority_level:
        isConsultant && form.seniority_level !== NONE
          ? (form.seniority_level as UserFormInput["seniority_level"])
          : null,
      artifact_type:
        form.artifact_type === NONE
          ? null
          : (form.artifact_type as UserFormInput["artifact_type"]),
      hiredAt: form.hiredAt,
      projectIds: form.project_ids,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateUser(user!.id, payload)
        : await createUser(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSaved?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit user"
              : fixedRole
                ? `New ${ROLE_CONFIG[fixedRole]?.label ?? "user"}`
                : "New user"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this user's info and role."
              : fixedRole
                ? `Add a new ${ROLE_CONFIG[fixedRole]?.label ?? "user"}.`
                : "Add a new user."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="password">
              Password{" "}
              {isEditing && (
                <span className="text-muted-foreground font-normal">
                  (leave blank to keep current)
                </span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {/* Hidden entirely when the page has already fixed the role - e.g.
              the Consultants page always creates CONSULTANT users. */}
          {!fixedRole && (
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => handleRoleChange(v as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleEntries.map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Only consultants have a seniority level. */}
          {isConsultant && (
            <div className="flex flex-col gap-1.5">
              <Label>Seniority</Label>
              <Select
                value={form.seniority_level}
                onValueChange={(v) => setForm({ ...form, seniority_level: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {Object.entries(SENIORITY_CONFIG).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Artifact</Label>
            <Select
              value={form.artifact_type}
              onValueChange={(v) => setForm({ ...form, artifact_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {Object.entries(ARTIFACT_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projects this user is assigned to. Selecting/deselecting here
              creates or removes the corresponding Assignment rows on save.
              See createUser/updateUser in app/actions/users.ts. */}
          <div className="flex flex-col gap-1.5">
            <Label>Projects</Label>
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  role="combobox"
                  className="justify-between font-normal"
                >
                  <span className="truncate text-left">
                    {selectedProjectNames.length === 0
                      ? "No projects"
                      : selectedProjectNames.length === 1
                        ? selectedProjectNames[0]
                        : `${selectedProjectNames[0]}...`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-2"
                align="start"
              >
                {projectOptions.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No projects found.
                  </p>
                ) : (
                  <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                    {projectOptions.map((project) => {
                      const checked = form.project_ids.includes(project.id);
                      return (
                        <label
                          key={project.id}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleProject(project.id)}
                          />
                          {project.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Hire date is set once, at creation, and can never be changed
              afterwards - so it's only shown here when creating. See the
              server-side note in UserFormInput/createUser (users.ts). */}
          {!isEditing && (
            <div className="flex flex-col gap-1.5">
              <Label>Hire date</Label>
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !form.hiredAt && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.hiredAt ? format(form.hiredAt, "PPP") : "Not set"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.hiredAt ?? undefined}
                    onSelect={(date) =>
                      setForm({ ...form, hiredAt: date ?? null })
                    }
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                  {form.hiredAt && (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setForm({ ...form, hiredAt: null })}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
