import type { Role, Level, Artifact } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";

export type UserRole = Role;
export type SeniorityLevel = Level;
export type ArtifactType = Artifact;

export type UserProjectRef = { id: string; name: string };

export const userRowSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  seniority_level: true,
  artifact_type: true,
  manager: { select: { id: true, name: true } },
  assignments: {
    select: {
      id: true,
      roleOnProject: true,
      startDate: true,
      project: { select: { id: true, name: true } },
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
  manager: { id: string; name: string } | null;
  projects: UserProjectRef[];
  primaryAssignment: {
    id: string;
    projectId: string;
    roleOnProject: string;
    startDate: string;
  } | null;
};

export function mapUserToRow(user: UserWithRelations): UserRow {
  const [primary] = user.assignments;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    seniority_level: user.seniority_level,
    artifact_type: user.artifact_type,
    manager: user.manager,
    projects: user.assignments.map((a) => a.project),
    primaryAssignment: primary
      ? {
          id: primary.id,
          projectId: primary.project.id,
          roleOnProject: primary.roleOnProject,
          startDate: primary.startDate.toISOString(),
        }
      : null,
  };
}
