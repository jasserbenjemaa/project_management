import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

// Mirrors the Prisma enums so the URL values and the DB values never drift apart.
export const ARTIFACT_TABS = [
  "all",
  "HLT",
  "LLT",
  "LLR",
  "CODE_REVIEW",
  "ARCHITECTURE",
] as const;

export const USER_ROLES = [
  "all",
  "UNIT_MANAGER",
  "PEOPLE_MANAGER",
  "CONSULTANT",
] as const;

export type ArtifactTab = (typeof ARTIFACT_TABS)[number];
export type RoleFilter = (typeof USER_ROLES)[number];

/**
 * URL-synced filters for the Users table.
 *
 * Usage:
 *   const [filters, setFilters] = useUsersFilters();
 *   filters.search      -> string
 *   filters.role        -> RoleFilter
 *   filters.projectId   -> string ("all" | Project.id) — the URL always
 *                           stores the project's *id*; look up its name
 *                           from your `projects` list when you need to
 *                           display it (the filter <Select> already does
 *                           this automatically).
 *   filters.artifact    -> ArtifactTab (drives the active Tab)
 *
 *   setFilters({ search: "jane" })                 // updates ?search=jane
 *   setFilters({ role: "CONSULTANT", search: "" })  // batches multiple params in one push
 *
 * Every field defaults to a value that means "no filter", so an empty
 * querystring is always a valid, fully-collapsed state (?search=&role=all&...).
 */
export const useUsersFilters = () => {
  return useQueryStates({
    search: parseAsString.withDefault(""),
    role: parseAsStringEnum<RoleFilter>([...USER_ROLES]).withDefault("all"),
    projectId: parseAsString.withDefault("all"),
    artifact: parseAsStringEnum<ArtifactTab>([...ARTIFACT_TABS]).withDefault(
      "all",
    ),
  });
};
