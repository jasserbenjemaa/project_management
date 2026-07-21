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
import type { Role } from "@/app/generated/prisma/enums";

import {
  createUser,
  updateUser,
  type UserFormInput,
} from "@/app/actions/users";
import {
  ARTIFACT_CONFIG,
  ROLE_CONFIG,
  SENIORITY_CONFIG,
  type UserRow,
} from "./users-columns";

type UserOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };

// Radix's <SelectItem> can't take an empty string as its value, so this
// sentinel stands in for "not set" on every optional single-select below.
const NONE = "none";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pass a user to edit them; pass null to create a new one.
  user: UserRow | null;
  projects: ProjectOption[];
  userOptions: UserOption[];
  // Prefilled from the page's active filters when creating a user - e.g. if
  // the "Project" filter is set to "Project 4", the new user defaults into it.
  defaultValues?: {
    role?: Role;
    projectId?: string;
    artifactType?: string;
  };
  onSaved?: () => void;
}

type FormState = {
  name: string;
  email: string;
  password: string;
  role: Role | "";
  seniority_level: string; // Level | NONE - only meaningful when role is CONSULTANT
  artifact_type: string; // Artifact | NONE
  projectId: string; // project id | NONE
};

const emptyState = (): FormState => ({
  name: "",
  email: "",
  password: "",
  role: "",
  seniority_level: NONE,
  artifact_type: NONE,
  projectId: NONE,
});

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  projects,
  userOptions,
  defaultValues,
  onSaved,
}: UserFormDialogProps) {
  const isEditing = !!user;
  const [form, setForm] = useState<FormState>(emptyState());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        projectId: user.primaryAssignment?.projectId ?? NONE,
      });
    } else {
      setForm({
        ...emptyState(),
        role: defaultValues?.role ?? "",
        // Comes from the page's ?projectId= filter, if one is set.
        projectId: defaultValues?.projectId ?? NONE,
        artifact_type: defaultValues?.artifactType ?? NONE,
      });
    }
    setError(null);
  }, [open, user, defaultValues]);

  const hasProject = form.projectId !== NONE;
  const isConsultant = form.role === "CONSULTANT";

  // Seniority only means something for consultants - clear it whenever the
  // role changes to anything else so a stale value can't get submitted.
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
      // Manager, role-on-project, start date, and assigned-by are no longer
      // collected in this form - the server fills in sane defaults for the
      // assignment when a project is selected.
      projectId: hasProject ? form.projectId : null,
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
          <DialogTitle>{isEditing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this user's info, role, and project assignment."
              : "Add a new user and, optionally, assign them to a project."}
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
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <SelectItem key={role} value={role}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div
            className={
              isConsultant
                ? "flex flex-col gap-1.5"
                : "flex flex-col gap-1.5 sm:col-span-2"
            }
          >
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

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label>Project</Label>
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned">
                  {form.projectId === NONE
                    ? "Unassigned"
                    : (projects.find((p) => p.id === form.projectId)?.name ??
                      "Unassigned")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
