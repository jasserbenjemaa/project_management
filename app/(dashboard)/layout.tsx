"use client";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavSidebar } from "@/components/sidebar";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <SidebarProvider>
        <NavSidebar />
        {/* min-w-0 overrides the flex item's default min-width: auto —
            without it, a wide child (like the Kanban board) forces this
            whole panel, and the page, wider than the viewport instead of
            scrolling internally. */}
        <SidebarInset className="min-w-0">
          <div className="flex items-center gap-2 border-b p-3 md:hidden">
            <SidebarTrigger />
          </div>
          <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-muted/20">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
