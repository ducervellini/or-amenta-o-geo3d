import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GlobalHorizontalScrollbar } from "./GlobalHorizontalScrollbar";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout-root min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={cn(
          "app-layout-content transition-all duration-300 flex flex-col min-h-screen",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <AppHeader />
        <main className="app-layout-main flex-1">
          <Outlet />
        </main>
        <GlobalHorizontalScrollbar />
      </div>
    </div>
  );
}
