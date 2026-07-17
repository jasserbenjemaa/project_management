import { Suspense } from "react";
import { UsersView } from "@/components/users-view";
import { ProjectOption, UserRow } from "@/lib/types";

// ---------------------------------------------------------------------------
// 1) MOCK DATA — swap this block for a real Prisma query, e.g.:
//
// const dbUsers = await prisma.user.findMany({
//   include: { assignments: { include: { project: true } } },
// });
//
// const users: UserRow[] = dbUsers.map((u) => ({
//   id: u.id,
//   name: u.name,
//   email: u.email,
//   role: u.role,
//   seniorityLevel: u.seniority_level,
//   artifactType: u.artifact_type,
//   projects: u.assignments.map((a) => ({ id: a.project.id, name: a.project.name })),
// }));
//
// const dbProjects = await prisma.project.findMany();
// const projects: ProjectOption[] = dbProjects.map((p) => ({ id: p.id, name: p.name }));
// ---------------------------------------------------------------------------

const MOCK_PROJECTS: ProjectOption[] = [
  { id: "p1", name: "Falcon Avionics" },
  { id: "p2", name: "Meridian ECU" },
  { id: "p3", name: "Atlas Braking System" },
];

const MOCK_USERS: UserRow[] = [
  {
    id: "u1",
    name: "Sarra Ben Youssef",
    email: "sarra.benyoussef@example.com",
    role: "CONSULTANT",
    seniorityLevel: "SENIOR",
    artifactType: "HLT",
    projects: [MOCK_PROJECTS[0]],
  },
  {
    id: "u2",
    name: "Mehdi Trabelsi",
    email: "mehdi.trabelsi@example.com",
    role: "CONSULTANT",
    seniorityLevel: "JUNIOR",
    artifactType: "LLT",
    projects: [MOCK_PROJECTS[0], MOCK_PROJECTS[1]],
  },
  {
    id: "u3",
    name: "Nour Chaabane",
    email: "nour.chaabane@example.com",
    role: "PEOPLE_MANAGER",
    seniorityLevel: "EXPERT",
    artifactType: "ARCHITECTURE",
    projects: [MOCK_PROJECTS[1]],
  },
  {
    id: "u4",
    name: "Yassine Gharbi",
    email: "yassine.gharbi@example.com",
    role: "UNIT_MANAGER",
    seniorityLevel: "SENIOR",
    artifactType: "CODE_REVIEW",
    projects: [MOCK_PROJECTS[2]],
  },
  {
    id: "u5",
    name: "Rania Jendoubi",
    email: "rania.jendoubi@example.com",
    role: "CONSULTANT",
    seniorityLevel: "MID",
    artifactType: "LLR",
    projects: [MOCK_PROJECTS[0], MOCK_PROJECTS[2]],
  },
];

// 2) PAGE — wrap in Suspense because UsersView reads useSearchParams().
export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersView users={MOCK_USERS} projects={MOCK_PROJECTS} />
    </Suspense>
  );
}
