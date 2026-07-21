import { ProjectsView } from "@/components/projects-view";
import { getProjects } from "@/app/actions/projects";

const ProjectsPage = async () => {
  const projects = await getProjects();

  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all your projects in one place.
          </p>
        </div>
        <ProjectsView projects={projects} />
      </div>
    </main>
  );
};

export default ProjectsPage;
