import { Project } from "@/features/projects-columns";
import { ProjectsView } from "@/components/projects-view";
const MOCK_PROJETS: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    status: "in_progress",
    dueDate: "2026-08-15",
  },
  { id: "2", name: "Mobile App", status: "not_started", dueDate: "2026-09-01" },
  {
    id: "3",
    name: "Data Migration",
    status: "completed",
    dueDate: "2026-06-30",
  },
];
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
        <ProjectsView projects={MOCK_PROJETS} />
      </div>
    </main>
  );
};

export default ProjectsPage;
