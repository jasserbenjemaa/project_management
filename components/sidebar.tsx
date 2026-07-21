"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, getAuthUser } from "@/app/actions/auth";
import {
  LogOut,
  Home,
  FolderOpen,
  User,
  Users,
  ChartColumnBig,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { DottedSeparator } from "./dotted-separator";

interface AppSidebarProps {
  name: string;
  role: string;
}

const navItems = [
  { linkTo: "/", icon: Home, name: "Home" },
  { linkTo: "/projects", icon: FolderOpen, name: "Projects" },
  { linkTo: "/people-manager", icon: User, name: "People Manager" },
  { linkTo: "/users?role=CONSULTANT", icon: Users, name: "Consultants" },
  { linkTo: "/kpi", icon: ChartColumnBig, name: "KPIs" },
];

const revealBase =
  "opacity-0 -translate-x-2 overflow-hidden transition-all duration-300 ease-out " +
  "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2 " +
  "group-data-[collapsible=icon]:w-0";
const revealExpanded =
  "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:translate-x-0";

export function NavSidebar({ name, role }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const isExpanded = state === "expanded";
  const handleIconClick = () => {
    if (!isExpanded) {
      toggleSidebar();
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col p-2 pt-5">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center px-3 pt-0.5">
          <button
            type="button"
            onClick={handleIconClick}
            aria-label={isExpanded ? "Capgemini" : "Expand Sidebar"}
            disabled={isExpanded}
            className={`group/btn flex items-center gap-2 group-data-[collapsible=icon]:gap-0 rounded-md transition-opacity ${
              isExpanded ? "cursor-default" : "hover:opacity-80"
            }`}
          >
            <span className="relative flex h-6 w-6 items-center justify-center shrink-0">
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

            {/* Capgemini title — now animates in instead of popping,
               since we no longer use display:none to hide it */}
            <span
              className={`text-lg font-semibold tracking-tight whitespace-nowrap delay-75 ${revealBase} ${revealExpanded}`}
            >
              Capgemini
            </span>
          </button>

          {isExpanded && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 ease-out hover:bg-accent hover:text-foreground"
            >
              <PanelRightOpen width={18} height={18} />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pl-0.5">
        <SidebarGroup>
          <DottedSeparator className="pb-2" />
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, index) => {
                const isActive = pathname === item.linkTo;
                return (
                  <SidebarMenuItem key={item.linkTo}>
                    <Link href={item.linkTo} className="block">
                      <SidebarMenuButton
                        tooltip={item.name}
                        isActive={isActive}
                      >
                        <item.icon size={16} className="shrink-0" />
                        <span
                          className={`whitespace-nowrap ${revealBase} ${revealExpanded}`}
                          style={{
                            transitionDelay: isExpanded
                              ? `${75 + index * 40}ms`
                              : "0ms",
                          }}
                        >
                          {item.name}
                        </span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center  m-2 group-data-[collapsible=icon]:pb-2.5 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              className="w-full data-[state=open]:bg-transparent group-data-[collapsible=icon]:justify-center "
            >
              <Avatar className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarFallback className="bg-neutral-300 text-neutral-900 font-medium">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex flex-col text-left leading-tight whitespace-nowrap delay-150 ${revealBase} ${revealExpanded} group-data-[collapsible=icon]:hidden`}
              >
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{role}</span>
              </div>
            </SidebarMenuButton>

            <div
              className={`flex shrink-0 items-center rounded-md border border-border delay-200 ${revealBase} ${revealExpanded}`}
            >
              <button
                type="button"
                onClick={async () => signOut()}
                className="relative flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors duration-200 ease-out hover:bg-accent hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
