import type { Role, Level, Artifact } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";

export type UserRole = Role;
export type SeniorityLevel = Level;
export type ArtifactType = Artifact;

// project is null once the project has been deleted (Assignment.project
// is onDelete: SetNull) — name/id then fall back to the assignment's own
// snapshot fields, and isDeleted flags that for the UI.
export type UserProjectRef = {
  id: string | null;
  name: string;
  isDeleted: boolean;
};

export const userRowSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  seniority_level: true,
  artifact_type: true,
  assignments: {
    select: {
      id: true,
      roleOnProject: true,
      startDate: true,
      projectId: true, // snapshot FK, survives project deletion (null'd)
      projectName: true, // snapshot name, always available
      project: { select: { id: true, name: true } }, // live relation, null if deleted
    },
  },
} satisfies Prisma.UserSelect;

export type UserWithRelations = Prisma.UserGetPayload<{
  select: typeof userRowSelect;
}>;

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  seniority_level: SeniorityLevel | null;
  artifact_type: ArtifactType | null;
  projects: UserProjectRef[];
  primaryAssignment: {
    id: string;
    projectId: string | null;
    projectName: string;
    isDeleted: boolean;
    roleOnProject: string;
    startDate: string;
  } | null;
};

function toProjectRef(a: {
  projectId: string | null;
  projectName: string;
  project: { id: string; name: string } | null;
}): UserProjectRef {
  return {
    id: a.project?.id ?? a.projectId,
    name: a.project?.name ?? a.projectName,
    isDeleted: a.project === null,
  };
}

export function mapUserToRow(user: UserWithRelations): UserRow {
  const [primary] = user.assignments;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    seniority_level: user.seniority_level,
    artifact_type: user.artifact_type,
    projects: user.assignments.map(toProjectRef),
    primaryAssignment: primary
      ? {
          id: primary.id,
          projectId: primary.project?.id ?? primary.projectId,
          projectName: primary.project?.name ?? primary.projectName,
          isDeleted: primary.project === null,
          roleOnProject: primary.roleOnProject,
          startDate: primary.startDate.toISOString(),
        }
      : null,
  };
}
