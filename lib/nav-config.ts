import {
  Home as HomeIcon,
  ScrollText,
  FolderOpen,
  User,
  Users,
  ChartColumnBig,
  TableProperties,
  LucideIcon,
} from "lucide-react";

export type Role = "Unit Manager" | "Engagement Manager" | "Consultant";

export interface NavItem {
  linkTo: string;
  icon: LucideIcon;
  name: string;
  roles: Role[]; // who can see this item
}

// Single source of truth for both the sidebar and the home page cards.
export const ALL_NAV_ITEMS: NavItem[] = [
  {
    linkTo: "/",
    icon: HomeIcon,
    name: "Home",
    roles: ["Unit Manager", "Engagement Manager", "Consultant"],
  },
  {
    linkTo: "/projects-logs",
    icon: ScrollText,
    name: "projects logs",
    roles: ["Engagement Manager", "Consultant"],
  },
  {
    linkTo: "/projects",
    icon: FolderOpen,
    name: "Projects",
    roles: ["Unit Manager", "Engagement Manager", "Consultant"],
  },
  {
    linkTo: "/engagement-manager",
    icon: User,
    name: "Engagement Manager",
    roles: ["Unit Manager"],
  },
  {
    linkTo: "/consultant",
    icon: Users,
    name: "Consultants",
    roles: ["Unit Manager"],
  },
  {
    linkTo: "/sheets",
    icon: TableProperties,
    name: "Progress Table",
    roles: ["Unit Manager"],
  },
  {
    linkTo: "/kpi",
    icon: ChartColumnBig,
    name: "KPIs",
    roles: ["Unit Manager", "Engagement Manager", "Consultant"],
  },
];

export function normalizeRole(role?: string): Role | undefined {
  if (!role) return undefined;
  const match = ["Unit Manager", "Engagement Manager", "Consultant"].find(
    (r) => r.toLowerCase() === role.trim().toLowerCase(),
  );
  return match as Role | undefined;
}

export function itemsForRole(role?: string): NavItem[] {
  const normalized = normalizeRole(role);
  if (!normalized) return []; // unknown role: show nothing, fail safe
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(normalized));
}
