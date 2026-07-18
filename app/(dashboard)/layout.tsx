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
        <NavSidebar name={"jasser"} role={"Consaltant"} />
        <SidebarInset>
          <div className="flex items-center gap-2 border-b p-3 md:hidden">
            <SidebarTrigger />
          </div>
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-muted/20">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
