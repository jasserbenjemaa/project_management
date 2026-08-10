import { UsersView } from "@/components/users-view";
import { getProjects, getUserOptions, getUsers } from "@/lib/dal";

export default async function ConsultantsPage() {
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
          <h1 className="text-2xl font-semibold">Consultants</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all the consultants in one place.
          </p>
        </div>
        <UsersView
          users={visibleUsers}
          projects={projects}
          userOptions={userOptions}
          // TODO: replace "CONSULTANT" with your actual Role enum value
          // (e.g. Role.CONSULTANT if you're using a Prisma-generated enum).
          fixedRole="CONSULTANT"
          allowCreate
        />
      </div>
    </main>
  );
}
