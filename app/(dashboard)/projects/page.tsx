import { Project } from "@/features/projects-columns";
import { ProjectsView } from "@/components/projects-view";

const ProjectsPage = () => {
  return (
    <main>
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all your projects in one place.
          </p>
        </div>
        <ProjectsView projects={[]} />
      </div>
    </main>
  );
};

export default ProjectsPage;
