"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// 1. Navigation items config

// 2. The Sidebar Component (Bypasses TypeScript 'asChild' issue)

// 3. The Main Dashboard Layout Component
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar Panel */}
        <AppSidebar />

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-muted/20">
          {/* Header Panel */}
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold tracking-tight">
              Dashboard Overview
            </h1>
          </header>

          {/* Core Layout Grid Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Top Half: Primary Hero Card */}
            {children}
            {/* min-h-[320px] prevents mobile squish while flex-1 splits the container 50/50 on desktop */}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
