export type Role = "UNIT_MANAGER" | "PEOPLE_MANAGER" | "CONSULTANT";
export type TaskStatus = "BLOCKED" | "TODO" | "IN_PROGRESS" | "DONE";
export type ProjectStatus = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED";

export type UserRole = "UNIT_MANAGER" | "PEOPLE_MANAGER" | "CONSULTANT";

export type SeniorityLevel = "JUNIOR" | "MID" | "SENIOR" | "EXPERT";

export type ArtifactType =
  | "HLT"
  | "LLT"
  | "LLR"
  | "CODE_REVIEW"
  | "ARCHITECTURE";

export type ProjectOption = {
  id: string;
  name: string;
};

// Flat shape the table/columns consume. Build this from your Prisma `User`
// (with `assignments.project` included) in your data-fetching layer, e.g.:
//
// const rows: UserRow[] = users.map((u) => ({
//   id: u.id,
//   name: u.name,
//   email: u.email,
//   role: u.role,
//   seniorityLevel: u.seniority_level,
//   artifactType: u.artifact_type,
//   projects: u.assignments.map((a) => ({ id: a.project.id, name: a.project.name })),
// }));
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  seniorityLevel: SeniorityLevel | null;
  artifactType: ArtifactType | null;
  projects: ProjectOption[];
};
