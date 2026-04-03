import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={cn(
          "transition-all duration-300 flex flex-col min-h-screen",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
