import { notFound } from "next/navigation";
import { UsersView } from "@/components/users-view";
import { getProjects, getUserOptions, getUsers } from "@/lib/dal";

interface ProjectUsersPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectUsersPage({
  params,
}: ProjectUsersPageProps) {
  const { projectId } = await params;

  const [users, projects, userOptions] = await Promise.all([
    getUsers(),
    getProjects(),
    getUserOptions(),
  ]);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    notFound();
  }

  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage the people on this project.
          </p>
        </div>
        <UsersView
          users={users}
          projects={projects}
          userOptions={userOptions}
          fixedProject={project}
        />
      </div>
    </main>
  );
}
