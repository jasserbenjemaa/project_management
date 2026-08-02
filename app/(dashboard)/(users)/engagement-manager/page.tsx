import { UsersView } from "@/components/users-view";
import { getProjects, getUserOptions, getUsers } from "@/lib/dal";

export default async function EngagementManagersPage() {
  const [users, projects, userOptions] = await Promise.all([
    getUsers(),
    getProjects(),
    getUserOptions(),
  ]);

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
          users={users}
          projects={projects}
          userOptions={userOptions}
          fixedRole="ENGAGEMENT_MANAGER"
          allowCreate={false}
        />
      </div>
    </main>
  );
}
