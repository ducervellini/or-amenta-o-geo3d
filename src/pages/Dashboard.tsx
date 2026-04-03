import { useMemo } from "react";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, Layers, Users, BarChart3, Package, Wrench, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const COLORS = ["hsl(210, 80%, 55%)", "hsl(40, 85%, 55%)", "hsl(150, 60%, 45%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)", "hsl(190, 70%, 45%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: composicoes } = useSupabaseQuery("composicoes");
  const { data: servicos } = useSupabaseQuery("servicos");
  const { data: equipamentos } = useSupabaseQuery("equipamentos");
  const { data: veiculos } = useSupabaseQuery("veiculos");
  const { data: materiais } = useSupabaseQuery("materiais");
  const { data: cargos } = useSupabaseQuery("cargos");

  const stats = useMemo(() => {
    const totalComposicoes = composicoes?.length || 0;
    const custoTotal = (composicoes || []).reduce((s, c) => s + (Number(c.custo_unitario_total) || 0), 0);
    const totalServicos = servicos?.length || 0;
    const totalEquipamentos = (equipamentos?.length || 0) + (veiculos?.length || 0);
    const totalCargos = cargos?.length || 0;
    const totalMateriais = materiais?.length || 0;
    return { totalComposicoes, custoTotal, totalServicos, totalEquipamentos, totalCargos, totalMateriais };
  }, [composicoes, servicos, equipamentos, veiculos, cargos, materiais]);

  const topComposicoes = useMemo(() => {
    return (composicoes || [])
      .filter((c) => Number(c.custo_unitario_total) > 0)
      .sort((a, b) => Number(b.custo_unitario_total) - Number(a.custo_unitario_total))
      .slice(0, 5);
  }, [composicoes]);

  const chartData = useMemo(() => {
    return topComposicoes.map((c) => ({
      nome: String(c.nome).substring(0, 25),
      custo: Number(c.custo_unitario_total) || 0,
    }));
  }, [topComposicoes]);

  const cadastrosData = [
    { name: "Cargos", value: stats.totalCargos },
    { name: "Equip./Veíc.", value: stats.totalEquipamentos },
    { name: "Materiais", value: stats.totalMateriais },
    { name: "Serviços", value: stats.totalServicos },
  ].filter((d) => d.value > 0);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Dashboard Executivo</h1>
          <p className="page-subtitle">Visão geral do sistema de orçamentação</p>
        </div>
        <Button onClick={() => navigate("/composicoes/novo")} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Composição
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard icon={Layers} label="Composições" value={stats.totalComposicoes} />
        <KpiCard icon={DollarSign} label="Custo Total" value={`R$ ${fmt(stats.custoTotal)}`} />
        <KpiCard icon={BarChart3} label="Serviços" value={stats.totalServicos} />
        <KpiCard icon={Users} label="Cargos" value={stats.totalCargos} />
        <KpiCard icon={Wrench} label="Equip./Veíc." value={stats.totalEquipamentos} />
        <KpiCard icon={Package} label="Materiais" value={stats.totalMateriais} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top composições */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Top Composições por Custo</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="nome" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `R$ ${fmt(value)}`} />
                <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Nenhuma composição com custo cadastrado</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Cadastros</h3>
          {cadastrosData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie data={cadastrosData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {cadastrosData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {cadastrosData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Nenhum cadastro realizado</div>
          )}
        </div>
      </div>

      {/* Recent composições table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Composições Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Custo Unitário</th>
              </tr>
            </thead>
            <tbody>
              {(composicoes || []).length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-sm">Nenhuma composição cadastrada</td></tr>
              ) : (
                (composicoes || []).slice(0, 10).map((c) => (
                  <tr key={String(c.id)} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/composicoes/${c.id}`)}>
                    <td className="font-medium text-accent">{String(c.codigo)}</td>
                    <td className="font-medium">{String(c.nome)}</td>
                    <td>{String(c.unidade)}</td>
                    <td className="font-mono font-semibold">R$ {fmt(Number(c.custo_unitario_total) || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono font-bold text-lg truncate">{value}</div>
    </div>
  );
}
