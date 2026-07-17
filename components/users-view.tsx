"use client";

import { useMemo } from "react";
import { FolderIcon, PlusIcon, SearchIcon, UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getUserColumns } from "@/features/users-columns";
import { useUsersFilters } from "@/hooks/use-users-filters";
import { ArtifactType, ProjectOption, UserRole, UserRow } from "@/lib/types";

const ARTIFACT_TABS: { value: ArtifactType; label: string }[] = [
  { value: "HLT", label: "HLT" },
  { value: "LLT", label: "LLT" },
  { value: "LLR", label: "LLR" },
  { value: "CODE_REVIEW", label: "Code Review" },
  { value: "ARCHITECTURE", label: "Architecture" },
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "UNIT_MANAGER", label: "Unit Manager" },
  { value: "PEOPLE_MANAGER", label: "People Manager" },
  { value: "CONSULTANT", label: "Consultant" },
];

interface UsersViewProps {
  users: UserRow[];
  projects: ProjectOption[];
}

export const UsersView = ({ users, projects }: UsersViewProps) => {
  const { tab, search, role, project, setTab, setSearch, setRole, setProject } =
    useUsersFilters();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.artifactType !== tab) return false;
      if (role !== "all" && user.role !== role) return false;
      if (project !== "all" && !user.projects.some((p) => p.id === project))
        return false;
      if (
        search &&
        !`${user.name} ${user.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [users, tab, role, project, search]);

  // Replace with real edit/delete logic (e.g. open a dialog, call a mutation).
  const handleEditUser = (user: UserRow) => {
    console.log("edit", user.id);
  };

  const handleDeleteUser = (user: UserRow) => {
    console.log("delete", user.id);
  };

  const tableColumns = useMemo(
    () =>
      getUserColumns({ onEdit: handleEditUser, onDelete: handleDeleteUser }),
    [],
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as ArtifactType)}
      className="flex-1 w-full border rounded-lg"
    >
      <div className="h-full flex flex-col overflow-auto p-4">
        <div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
          <TabsList className="w-full lg:w-auto h-auto flex-wrap">
            {ARTIFACT_TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                className="h-8 w-full lg:w-auto"
                value={t.value}
              >
                {t.label}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-full"
            />
          </div>

          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full lg:w-48">
              <div className="flex items-center pr-2">
                <UserIcon className="size-4 mr-2" />
                <SelectValue placeholder="All roles" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectSeparator />
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="w-full lg:w-48">
              <div className="flex items-center pr-2">
                <FolderIcon className="size-4 mr-2" />
                <SelectValue placeholder="All projects" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectSeparator />
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DottedSeparator className="my-4" />

        {ARTIFACT_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-0">
            <DataTable columns={tableColumns} data={filteredUsers} />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};
