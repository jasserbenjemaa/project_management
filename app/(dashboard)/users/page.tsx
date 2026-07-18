"use client";

import { UsersView } from "@/components/users-view";
import { MOCK_USERS, MOCK_PROJECTS } from "./mock-data";

export default function UsersPage() {
  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all the users in one place.
          </p>
        </div>
        <UsersView users={MOCK_USERS} projects={MOCK_PROJECTS} />;
      </div>
    </main>
  );
}
