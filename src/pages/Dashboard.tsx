import { FileText, Layers, TrendingUp, Clock, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Orçamentos Ativos", value: "12", icon: FileText, change: "+3 este mês", color: "text-accent" },
  { label: "Composições", value: "148", icon: Layers, change: "24 novas", color: "text-info" },
  { label: "Valor Total", value: "R$ 4.2M", icon: TrendingUp, change: "+18%", color: "text-success" },
  { label: "Pendentes", value: "5", icon: Clock, change: "2 urgentes", color: "text-warning" },
];

const recentBudgets = [
  { id: "ORC-2026-001", client: "Prefeitura Municipal", desc: "Pavimentação Av. Central", value: "R$ 1.250.000", status: "Em andamento" },
  { id: "ORC-2026-002", client: "Construtora ABC", desc: "Terraplanagem Lote 14", value: "R$ 890.000", status: "Revisão" },
  { id: "ORC-2026-003", client: "DNIT", desc: "Sondagem BR-101 km 42-58", value: "R$ 2.100.000", status: "Finalizado" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral dos orçamentos e composições</p>
        </div>
        <Button onClick={() => navigate("/orcamentos")} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={cn("w-5 h-5", stat.color)} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Recent budgets */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Orçamentos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBudgets.map((b) => (
                <tr key={b.id} className="cursor-pointer">
                  <td className="font-medium text-accent">{b.id}</td>
                  <td>{b.client}</td>
                  <td>{b.desc}</td>
                  <td className="font-medium">{b.value}</td>
                  <td>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        b.status === "Finalizado"
                          ? "bg-success/10 text-success"
                          : b.status === "Revisão"
                          ? "bg-warning/10 text-warning"
                          : "bg-info/10 text-info"
                      )}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
