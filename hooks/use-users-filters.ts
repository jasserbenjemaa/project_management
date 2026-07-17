"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArtifactType } from "@/lib/types";

export type UsersFilters = {
  tab: ArtifactType;
  search: string;
  role: string; // UserRole | "all"
  project: string; // Project id | "all"
};

const DEFAULTS: UsersFilters = {
  tab: "HLT",
  search: "",
  role: "all",
  project: "all",
};

/**
 * Keeps the Users view filters (tab, search, role, project) in the URL
 * query string, e.g. /users?tab=LLR&role=CONSULTANT&project=abc123
 *
 * - Shareable / bookmarkable links
 * - Back/forward button works
 * - Survives refresh
 *
 * NOTE: `useSearchParams` requires this tree to be rendered inside a
 * <Suspense> boundary if the page is statically rendered. Wrap the page
 * that renders <UsersView /> like:
 *
 *   <Suspense fallback={null}>
 *     <UsersView users={users} projects={projects} />
 *   </Suspense>
 */
export const useUsersFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: UsersFilters = useMemo(
    () => ({
      tab: (searchParams.get("tab") as ArtifactType) ?? DEFAULTS.tab,
      search: searchParams.get("search") ?? DEFAULTS.search,
      role: searchParams.get("role") ?? DEFAULTS.role,
      project: searchParams.get("project") ?? DEFAULTS.project,
    }),
    [searchParams],
  );

  const setFilter = useCallback(
    (key: keyof UsersFilters, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!value || value === DEFAULTS[key]) {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return {
    ...filters,
    setTab: (value: ArtifactType) => setFilter("tab", value),
    setSearch: (value: string) => setFilter("search", value),
    setRole: (value: string) => setFilter("role", value),
    setProject: (value: string) => setFilter("project", value),
  };
};
