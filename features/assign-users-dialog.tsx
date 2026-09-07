"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Loader2, UsersIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserRow } from "@/features/users-columns";
import {
  assignUserToProject,
  unassignUserFromProject,
} from "@/app/actions/users";

interface AssignUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserRow[];
  projectId: string;
  projectName: string;
  onAssigned?: () => void;
}

type ScopeTab = "all" | "unassigned-here" | "unassigned-any" | "assigned";

const SCOPE_TAB_LABELS: Record<ScopeTab, string> = {
  all: "All",
  "unassigned-here": "Not On This Project",
  "unassigned-any": "No Project",
  assigned: "Assigned",
};

export const AssignUsersDialog = ({
  open,
  onOpenChange,
  users,
  projectId,
  projectName,
  onAssigned,
}: AssignUsersDialogProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ScopeTab>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset local UI state each time the modal is opened fresh.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSearch("");
      setTab("all");
    }
    onOpenChange(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);

      const isAssignedHere = user.projects.some((p) => p.id === projectId);

      const matchesTab =
        tab === "all"
          ? true
          : tab === "assigned"
            ? isAssignedHere
            : tab === "unassigned-here"
              ? !isAssignedHere
              : /* unassigned-any */ user.projects.length === 0;

      return matchesSearch && matchesTab;
    });
  }, [users, search, tab, projectId]);

  const handleToggle = (user: UserRow) => {
    const isAssignedHere = user.projects.some((p) => p.id === projectId);
    setPendingId(user.id);
    startTransition(async () => {
      try {
        if (isAssignedHere) {
          await unassignUserFromProject(user.id, projectId);
        } else {
          await assignUserToProject(user.id, projectId);
        }
        onAssigned?.();
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-4" />
            Assign people to {projectName}
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0"
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as ScopeTab)}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="w-full shrink-0">
            {(Object.keys(SCOPE_TAB_LABELS) as ScopeTab[]).map((t) => (
              <TabsTrigger key={t} value={t} className="flex-1 text-xs">
                {SCOPE_TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(SCOPE_TAB_LABELS) as ScopeTab[]).map((t) => (
            <TabsContent
              key={t}
              value={t}
              className="mt-2 flex-1 min-h-0 overflow-y-auto"
            >
              <div className="flex flex-col gap-1 pr-2">
                {filtered.map((user) => {
                  const isAssignedHere = user.projects.some(
                    (p) => p.id === projectId,
                  );
                  const otherProjects = user.projects.filter(
                    (p) => p.id !== projectId,
                  );
                  const isLoading = isPending && pendingId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {user.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {otherProjects.length > 0
                            ? `Also on ${otherProjects
                                .map((p) => p.name)
                                .join(", ")}`
                            : user.email}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant={isAssignedHere ? "default" : "outline"}
                        className={cn(
                          "size-8 shrink-0 rounded-full",
                          isAssignedHere &&
                            "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
                        )}
                        disabled={isLoading}
                        onClick={() => handleToggle(user)}
                      >
                        {isLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isAssignedHere ? (
                          <Check className="size-4" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No users found.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
