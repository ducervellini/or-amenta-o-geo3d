import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Truck,
  Wrench,
  Package,
  Calculator,
  FileText,
  Settings,
  ChevronDown,
  ChevronLeft,
  Layers,
  DollarSign,
  Building2,
  HardHat,
} from "lucide-react";

interface NavItem {
  label: string;
  path?: string;
  icon: React.ElementType;
  children?: { label: string; path: string }[];
}

const navigation: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    label: "Cadastros",
    icon: Package,
    children: [
      { label: "Mão de Obra", path: "/cadastros/mao-de-obra" },
      { label: "Equipamentos", path: "/cadastros/equipamentos" },
      { label: "Veículos", path: "/cadastros/veiculos" },
      { label: "Materiais", path: "/cadastros/materiais" },
    ],
  },
  { label: "Composições", path: "/composicoes", icon: Layers },
  { label: "Orçamentos", path: "/orcamentos", icon: FileText },
  { label: "BDI", path: "/bdi", icon: Calculator },
  { label: "DRE", path: "/dre", icon: DollarSign },
  { label: "Configurações", path: "/configuracoes", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const [openMenus, setOpenMenus] = useState<string[]>(["Cadastros"]);
  const location = useLocation();

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children?: { path: string }[]) =>
    children?.some((c) => location.pathname === c.path);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <HardHat className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-sidebar-foreground font-bold text-lg tracking-tight">
                GEO3D
              </span>
              <span className="block text-[10px] text-sidebar-muted uppercase tracking-widest">
                Orçamentação
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navigation.map((item) => {
          if (item.children) {
            const open = openMenus.includes(item.label) && !collapsed;
            const childActive = isChildActive(item.children);
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    childActive
                      ? "text-sidebar-primary-foreground bg-sidebar-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                {open && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "block px-3 py-2 rounded-md text-sm transition-colors",
                          isActive(child.path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive(item.path!)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>
    </aside>
  );
}
