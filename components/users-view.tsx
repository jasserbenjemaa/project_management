"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, FolderOpen, SearchIcon, UsersIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DottedSeparator } from "./dotted-separator";
import { DataTable } from "./data-table";
import { getUserColumns, ROLE_CONFIG, UserRow } from "@/features/users-columns";
import { UserFormDialog } from "@/features/users-form-dialog";
import { DeleteUserDialog } from "@/features/users-delete-dialog";
import {
  ARTIFACT_TABS,
  ArtifactTab,
  useUsersFilters,
} from "@/hooks/use-users-filters";

// Human-readable labels for the tab strip. "all" gets its own entry so the
// view can show every user regardless of artifact type.
const TAB_LABELS: Record<ArtifactTab, string> = {
  all: "All users",
  HLT: "HLT",
  LLT: "LLT",
  LLR: "LLR",
  CODE_REVIEW: "Code Review",
  ARCHITECTURE: "Architecture",
};

interface UsersViewProps {
  users: UserRow[];
  // Passed in from the server (e.g. `prisma.project.findMany()`) so the
  // "Project" filter always reflects real projects, not mock data.
  projects: { id: string; name: string }[];
  // Every user, for the "Manager" and "Assigned by" selects in the form.
  userOptions: { id: string; name: string }[];
}

export const UsersView = ({ users, projects, userOptions }: UsersViewProps) => {
  const router = useRouter();
  const [filters, setFilters] = useUsersFilters();

  // Create/edit dialog: `editingUser` is null when creating, set when
  // editing. `isFormOpen` controls visibility either way.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  // Delete dialog is open whenever this is non-null.
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: UserRow) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = (user: UserRow) => {
    setDeletingUser(user);
  };

  // The "New" button carries over whatever the user has already filtered
  // by, e.g. if the "Project" filter is set to "Project 4", a new user
  // defaults into Project 4 instead of "Unassigned".
  const createDefaults = useMemo(
    () => ({
      role: filters.role !== "all" ? filters.role : undefined,
      projectId: filters.projectId !== "all" ? filters.projectId : undefined,
      artifactType: filters.artifact !== "all" ? filters.artifact : undefined,
    }),
    [filters],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesTab =
        filters.artifact === "all" || user.artifact_type === filters.artifact;

      const search = filters.search.trim().toLowerCase();
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);

      const matchesRole = filters.role === "all" || user.role === filters.role;

      const matchesProject =
        filters.projectId === "all" ||
        user.projects.some((project) => project.id === filters.projectId);

      return matchesTab && matchesSearch && matchesRole && matchesProject;
    });
  }, [users, filters]);

  const tableColumns = useMemo(
    () =>
      getUserColumns({
        onEdit: handleEditUser,
        onDelete: handleDeleteUser,
        onNameClick: (user) => handleUserClick(user.id),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <Tabs
        value={filters.artifact}
        onValueChange={(value) =>
          setFilters({ artifact: value as ArtifactTab })
        }
        className="flex-1 w-full border rounded-lg"
      >
        <div className="h-full flex flex-col overflow-auto p-4">
          <div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
            <TabsList className="w-full lg:w-auto flex-wrap h-auto">
              {ARTIFACT_TABS.map((tab) => (
                <TabsTrigger
                  key={tab}
                  className="h-8 w-full lg:w-auto"
                  value={tab}
                >
                  {TAB_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              size="sm"
              className="w-full lg:w-auto"
              onClick={handleAddUser}
            >
              <PlusIcon className="size-4 mr-2" />
              New
            </Button>
          </div>

          <DottedSeparator className="my-4" />

          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative w-full lg:w-64">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="pl-8 h-8 w-full"
              />
            </div>

            <Select
              value={filters.role}
              onValueChange={(value) =>
                setFilters({ role: value as typeof filters.role })
              }
            >
              <SelectTrigger className="h-8">
                <div className="flex items-center pr-2">
                  <UsersIcon className="size-4 mr-2" />
                  <SelectValue placeholder="All roles">
                    {filters.role === "all"
                      ? "All roles"
                      : (ROLE_CONFIG[filters.role]?.label ?? "All roles")}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectSeparator />
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <SelectItem key={role} value={role}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* URL stores the project's id (?projectId=<uuid>); SelectValue explicitly
    looks up and renders the matching project's name. */}
            <Select
              value={filters.projectId}
              onValueChange={(value) => setFilters({ projectId: value })}
            >
              <SelectTrigger className="lg:w-64 w-full h-8">
                <FolderOpen className="size-4 mr-2 shrink-0" />
                <SelectValue placeholder="All projects" className="min-w-0">
                  <span className="truncate block">
                    {filters.projectId === "all"
                      ? "All projects"
                      : (projects.find((p) => p.id === filters.projectId)
                          ?.name ?? "All projects")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectSeparator />
                {projects.map((project) => (
                  <SelectItem
                    key={project.id}
                    value={project.id}
                    title={project.name}
                  >
                    <span className="truncate">{project.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DottedSeparator className="my-4" />

          {/* One TabsContent per tab, all rendering the same filtered table -
              the tab itself just narrows `filteredUsers` via filters.artifact. */}
          {ARTIFACT_TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <DataTable
                columns={tableColumns}
                data={filteredUsers}
                pageSize={7}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
        projects={projects}
        userOptions={userOptions}
        defaultValues={editingUser ? undefined : createDefaults}
        onSaved={() => router.refresh()}
      />

      <DeleteUserDialog
        user={deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onDeleted={() => router.refresh()}
      />
    </>
  );
};
