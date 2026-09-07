import { UsersView } from "@/components/users-view";
import { getProjects, getUserOptions, getUsers } from "@/lib/dal";

export default async function EngagementManagersPage() {
  const [users, projects, userOptions] = await Promise.all([
    getUsers(),
    getProjects(),
    getUserOptions(),
  ]);

  const visibleUsers = users.filter((user) => user.role !== "UNIT_MANAGER");
  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">Engagement Managers</h1>
          <p className="text-sm text-muted-foreground">
            Browse and search all the engagement managers in one place.
          </p>
        </div>
        <UsersView
          users={visibleUsers}
          projects={projects}
          userOptions={userOptions}
          fixedRole="ENGAGEMENT_MANAGER"
          allowCreate={true}
        />
      </div>
    </main>
  );
}
