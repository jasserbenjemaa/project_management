import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { LayoutDashboard, Settings, PieChart } from "lucide-react";
const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Analytics", icon: PieChart, url: "/analytics" },
  { title: "Settings", icon: Settings, url: "/settings" },
];
export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 py-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {/* Wrapping the button inside the Next.js Link avoids 'asChild' errors */}
                  <Link href={item.url} className="w-full">
                    <SidebarMenuButton className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
