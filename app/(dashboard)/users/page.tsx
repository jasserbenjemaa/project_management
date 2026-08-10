// Server Component - no "use client" here. Move this file to wherever your
// actual /users route lives in the app router if it isn't app/users/page.tsx.
import { UsersView } from "@/components/users-view";
import { getProjects, getUserOptions, getUsers } from "@/lib/dal";
export default async function UsersPage() {
  const [users, projects, userOptions] = await Promise.all([
    getUsers(),
    getProjects(),
    getUserOptions(),
  ]);

  // Unit Managers are excluded from this list entirely.
  const visibleUsers = users.filter((user) => user.role !== "UNIT_MANAGER");

  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all the users in one place.
          </p>
        </div>
        <UsersView
          users={visibleUsers}
          projects={projects}
          userOptions={userOptions}
        />
      </div>
    </main>
  );
}
