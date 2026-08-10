"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import {
  LogOut,
  Home,
  FolderOpen,
  User,
  Users,
  ChartColumnBig,
  PanelLeftOpen,
  TableProperties,
  PanelRightOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { DottedSeparator } from "./dotted-separator";
import { useUser } from "@/context/user-context";

// Grouped into logical sections instead of one flat list, each with its
// own label. Add/move items here freely — the render logic below just
// maps over groups.
const navGroups = [
  {
    label: "Overview",
    items: [
      { linkTo: "/", icon: Home, name: "Home" },
      { linkTo: "/projects", icon: FolderOpen, name: "Projects" },
    ],
  },
  {
    label: "People",
    items: [
      { linkTo: "/engagement-manager", icon: User, name: "Engagement Manager" },
      { linkTo: "/consultant", icon: Users, name: "Consultants" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { linkTo: "/sheets", icon: TableProperties, name: "Progress Table" },
      { linkTo: "/kpi", icon: ChartColumnBig, name: "KPIs" },
    ],
  },
];

export function NavSidebar() {
  const { name, role } = useUser();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();
  const isExpanded = state === "expanded";

  // Single reusable class for anything that should fade/slide in on expand
  // and cleanly hide on collapse. `truncate` + `min-w-0` on the wrapping flex
  // item is what prevents the old mid-word clipping bug on small screens.
  //
  // On mobile the sidebar renders inside a Sheet, where `state` stays
  // "collapsed" / `collapsible=icon` still applies even though the sheet is
  // fully open — that's what was hiding the labels down to icon-only. On
  // mobile we always want full labels, so we skip the collapse-driven
  // classes entirely there.
  const revealText = isMobile
    ? "truncate opacity-100 translate-x-0"
    : "truncate opacity-0 -translate-x-1 transition-all duration-200 ease-out " +
      "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:translate-x-0 " +
      "group-data-[collapsible=icon]:hidden";

  const handleIconClick = () => {
    if (!isExpanded) toggleSidebar();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col pt-3">
        <div className="flex items-center justify-between gap-2 p-2 group-data-[collapsible=icon]:pl-0.3 group-data-[collapsible=icon]:justify-center">
          <button
            type="button"
            onClick={handleIconClick}
            aria-label={isExpanded ? "Capgemini" : "Expand Sidebar"}
            disabled={isExpanded}
            className={`group/btn flex min-w-0 items-center gap-2 rounded-md transition-opacity ${
              isExpanded ? "cursor-default" : "hover:opacity-80"
            }`}
          >
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              <Image
                src="/capgemini_symbol.svg"
                alt="Capgemini Logo"
                width={24}
                height={24}
                className={`absolute inset-0 transition-all duration-200 ease-out ${
                  !isExpanded
                    ? "group-hover/btn:opacity-0 group-hover/btn:scale-90"
                    : ""
                }`}
              />
              {!isExpanded && (
                <PanelLeftOpen
                  width={18}
                  height={18}
                  className="absolute inset-0 m-auto text-gray-500 opacity-0 scale-90 transition-all duration-200 ease-out group-hover/btn:opacity-100 group-hover/btn:scale-100"
                />
              )}
            </span>

            <span
              className={`text-lg font-semibold tracking-tight ${revealText}`}
            >
              Capgemini
            </span>
          </button>

          {isExpanded && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 ease-out hover:bg-accent hover:text-foreground"
            >
              <PanelRightOpen width={18} height={18} />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pl-0.5">
        {navGroups.map((group, idx) => (
          <SidebarGroup
            key={group.label}
            className="group-data-[collapsible=icon]:py-0"
          >
            {idx === 0 && (
              <DottedSeparator className="pb-3 group-data-[collapsible=icon]:hidden" />
            )}
            <SidebarGroupLabel className={revealText}>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:gap-0">
                {group.items.map((item) => {
                  const isActive = pathname === item.linkTo;
                  return (
                    <SidebarMenuItem key={item.linkTo}>
                      <Link href={item.linkTo} className="block min-w-0">
                        <SidebarMenuButton
                          tooltip={item.name}
                          isActive={isActive}
                        >
                          <item.icon size={16} className="shrink-0" />
                          <span className={revealText}>{item.name}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="m-2 flex items-center gap-2 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pb-2.5">
            <SidebarMenuButton
              size="lg"
              className="w-full min-w-0 data-[state=open]:bg-transparent group-data-[collapsible=icon]:justify-center"
            >
              <Avatar className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarFallback className="bg-neutral-300 font-medium text-neutral-900">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-[0.6rem] text-muted-foreground">
                  {role.toLowerCase()}
                </span>
              </div>
            </SidebarMenuButton>

            <button
              type="button"
              onClick={async () => signOut()}
              aria-label="Log out"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-200 ease-out hover:bg-accent hover:text-foreground ${revealText} !translate-x-0`}
            >
              <LogOut size={16} />
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
