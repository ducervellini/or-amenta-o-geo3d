import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoGeo3d from "@/assets/logo_GEO3D.png";
import {
  LayoutDashboard,
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
  HardHat,
  Users,
  Globe,
  FolderTree,
  Briefcase,
  Clock,
  Calendar,
  Coffee,
  Fuel,
  Building,
  Building2,
  Landmark,
  Receipt,
  TrendingUp,
  PieChart,
  BarChart3,
} from "lucide-react";

interface NavItem {
  label: string;
  path?: string;
  icon: React.ElementType;
  children?: { label: string; path: string; icon?: React.ElementType }[];
}

const navigation: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    label: "Hierarquia",
    icon: FolderTree,
    children: [
      { label: "Mercados", path: "/cadastros/mercados" },
      { label: "Áreas da Empresa", path: "/cadastros/areas-empresa" },
      { label: "Departamentos", path: "/cadastros/departamentos" },
      { label: "Clientes", path: "/cadastros/clientes" },
      { label: "Serviços", path: "/cadastros/servicos" },
    ],
  },
  {
    label: "Mão de Obra",
    icon: Users,
    children: [
      { label: "Cargos e Salários", path: "/cadastros/cargos", icon: Calculator },
      { label: "Encargos Sociais", path: "/cadastros/encargos-sociais" },
      { label: "Benefícios", path: "/cadastros/beneficios" },
      { label: "Jornadas", path: "/cadastros/jornadas" },
      { label: "Regimes Operacionais", path: "/cadastros/regimes" },
      { label: "Horários Almoço", path: "/cadastros/horarios-almoco" },
    ],
  },
  {
    label: "Insumos",
    icon: Package,
    children: [
      { label: "Equipamentos", path: "/cadastros/equipamentos" },
      { label: "Veículos", path: "/cadastros/veiculos" },
      { label: "Materiais", path: "/cadastros/materiais" },
      { label: "Combustíveis", path: "/cadastros/combustiveis" },
    ],
  },
  { label: "Composições", path: "/composicoes", icon: Layers },
  {
    label: "ADM Local",
    icon: Building,
    children: [
      { label: "Oportunidades", path: "/oportunidades", icon: Briefcase },
      { label: "Mobilização", path: "/mobilizacao", icon: Truck },
    ],
  },
  { label: "Orçamentos", path: "/orcamentos", icon: FileText },
  {
    label: "Parâmetros",
    icon: Settings,
    children: [
      { label: "Admin. Local", path: "/parametros/admin-local" },
      { label: "Admin. Central", path: "/parametros/admin-central" },
      { label: "Financiamento", path: "/parametros/financiamento" },
      { label: "Tributos", path: "/parametros/tributos" },
      { label: "Margem de Lucro", path: "/parametros/margem" },
    ],
  },
  { label: "BDI", path: "/bdi", icon: Calculator },
  { label: "DRE", path: "/dre", icon: DollarSign },
  { label: "Configurações", path: "/configuracoes", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const [openMenus, setOpenMenus] = useState<string[]>(["Hierarquia"]);
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
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoGeo3d} alt="GEO3D" className={cn("h-7 object-contain", collapsed ? "h-6" : "h-7")} />
          {!collapsed && (
            <span className="block text-[10px] text-sidebar-muted uppercase tracking-widest">Orçamentação</span>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navigation.map((item) => {
          if (item.children) {
            const open = openMenus.includes(item.label) && !collapsed;
            const childActive = isChildActive(item.children);
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    childActive
                      ? "text-sidebar-primary-foreground bg-sidebar-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-xs font-medium">{item.label}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
                    </>
                  )}
                </button>
                {open && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                          isActive(child.path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {child.icon && <child.icon className="w-4 h-4 shrink-0" />}
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
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(item.path!)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
