"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  FolderOpen,
  SearchIcon,
  UsersIcon,
  UserPlusIcon,
} from "lucide-react";

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
import { AssignUsersDialog } from "@/features/assign-users-dialog";
import {
  ARTIFACT_TABS,
  ArtifactTab,
  useUsersFilters,
} from "@/hooks/use-users-filters";

const TAB_LABELS: Record<ArtifactTab, string> = {
  all: "All",
  HLT: "HLT",
  LLT: "LLT",
  LLR: "LLR",
  CODE_REVIEW: "Code Review",
  ARCHITECTURE: "Architecture",
};

interface UsersViewProps {
  users: UserRow[];
  projects: { id: string; name: string }[];
  userOptions: { id: string; name: string }[];
  // When set, this view is scoped to a single project: the filter is locked
  // to it, and "New" becomes "Assign" (opens AssignUsersDialog instead of
  // the create form).
  fixedProject?: { id: string; name: string };
  // When set, locks the role filter to this role (e.g. "CONSULTANT").
  fixedRole?: string;
  // Controls whether the create button renders at all when there's no
  // fixedProject. Defaults to true so existing pages keep working.
  allowCreate?: boolean;
}

export const UsersView = ({
  users,
  projects,
  userOptions,
  fixedProject,
  fixedRole,
  allowCreate = true,
}: UsersViewProps) => {
  const router = useRouter();
  const [filters, setFilters] = useUsersFilters();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

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

  // Effective filters: a fixedProject/fixedRole overrides whatever is in
  // the URL, so the page-level "scope" always wins.
  const effectiveRole = fixedRole ?? filters.role;
  const effectiveProjectId = fixedProject?.id ?? filters.projectId;

  const createDefaults = useMemo(
    () => ({
      role: effectiveRole !== "all" ? effectiveRole : undefined,
      projectId: effectiveProjectId !== "all" ? effectiveProjectId : undefined,
      artifactType: filters.artifact !== "all" ? filters.artifact : undefined,
    }),
    [effectiveRole, effectiveProjectId, filters.artifact],
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

      const matchesRole =
        effectiveRole === "all" || user.role === effectiveRole;

      const matchesProject =
        effectiveProjectId === "all" ||
        user.projects.some((project) => project.id === effectiveProjectId);

      return matchesTab && matchesSearch && matchesRole && matchesProject;
    });
  }, [users, filters, effectiveRole, effectiveProjectId]);

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

  const showAssignButton = !!fixedProject;
  const showNewButton = !fixedProject && allowCreate;

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

            {showAssignButton && (
              <Button
                size="sm"
                className="w-full lg:w-auto"
                onClick={() => setIsAssignOpen(true)}
              >
                <UserPlusIcon className="size-4 mr-2" />
                Assign
              </Button>
            )}

            {showNewButton && (
              <Button
                size="sm"
                className="w-full lg:w-auto"
                onClick={handleAddUser}
              >
                <PlusIcon className="size-4 mr-2" />
                New
              </Button>
            )}
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

            {/* Role filter is hidden when the page already locks the role
                (e.g. Consultants / Engagement Managers pages). */}
            {!fixedRole && (
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
            )}

            {/* Project filter is hidden when the page is already scoped to
                one project. */}
            {!fixedProject && (
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
            )}
          </div>

          <DottedSeparator className="my-4" />

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

      {fixedProject && (
        <AssignUsersDialog
          open={isAssignOpen}
          onOpenChange={setIsAssignOpen}
          users={users}
          projectId={fixedProject.id}
          projectName={fixedProject.name}
          onAssigned={() => router.refresh()}
        />
      )}
    </>
  );
};
