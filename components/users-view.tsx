"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
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
}

export const UsersView = ({ users, projects }: UsersViewProps) => {
  const router = useRouter();
  const [filters, setFilters] = useUsersFilters();

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  // Replace these with your real edit/delete logic (open a dialog, call a
  // server action/mutation, etc.) the same way you would for projects.
  const handleEditUser = (user: UserRow) => {
    console.log("edit", user.id);
  };
  const handleDeleteUser = (user: UserRow) => {
    console.log("delete", user.id);
  };

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
    <Tabs
      value={filters.artifact}
      onValueChange={(value) => setFilters({ artifact: value as ArtifactTab })}
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
          <Button size="sm" className="w-full lg:w-auto">
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
            <SelectTrigger className="w-full lg:w-44 h-8">
              <div className="flex items-center pr-2">
                <UsersIcon className="size-4 mr-2" />
                <SelectValue placeholder="All roles" />
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

          <Select
            value={filters.projectId}
            onValueChange={(value) => setFilters({ projectId: value })}
          >
            <SelectTrigger className="w-full lg:w-48 h-8">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectSeparator />
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
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
  );
};
