import { useState } from "react";
import { Search, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  em_andamento: { label: "Em andamento", variant: "default" },
  revisao: { label: "Revisão", variant: "outline" },
  finalizado: { label: "Finalizado", variant: "default" },
};

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: oportunidades, isLoading } = useQuery({
    queryKey: ["orcamentos-oportunidades"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch mobilizacoes (ADM Local costs) linked to oportunidades
  const { data: mobilizacoes } = useQuery({
    queryKey: ["orcamentos-mobilizacoes"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("mobilizacoes")
        .select("id, oportunidade_id, custo_total")
        .eq("ativo", true);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch BDI params
  const { data: bdis } = useQuery({
    queryKey: ["orcamentos-bdi"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi")
        .select("bdi_calculado")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data as any[];
    },
  });

  const bdiPercentual = bdis?.[0]?.bdi_calculado || 0;

  const getMobCusto = (opId: string) => {
    const mob = (mobilizacoes || []).find((m: any) => m.oportunidade_id === opId);
    return mob?.custo_total || 0;
  };

  const filtered = (oportunidades || []).filter(
    (o: any) =>
      o.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">
            Selecione uma oportunidade para montar o orçamento
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Custo Total</th>
                <th>BDI</th>
                <th>Preço Total</th>
                <th>Status</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma oportunidade encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((o: any) => {
                  const custoAdmLocal = getMobCusto(o.id);
                  const custoTotal = custoAdmLocal;
                  const precoTotal = custoTotal > 0 ? custoTotal * (1 + bdiPercentual / 100) : 0;
                  const status = custoTotal > 0 ? "em_andamento" : "rascunho";
                  const cfg = statusConfig[status] || statusConfig.rascunho;

                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/orcamentos/${o.id}`)}
                    >
                      <td className="font-medium text-accent">{o.codigo}</td>
                      <td className="font-medium max-w-[200px] truncate">{o.descricao}</td>
                      <td>{o.clientes?.nome || "—"}</td>
                      <td className="text-muted-foreground text-sm">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="font-semibold">{fmt(custoTotal)}</td>
                      <td className="text-muted-foreground">{bdiPercentual.toFixed(2)}%</td>
                      <td className="font-semibold text-accent">{fmt(precoTotal)}</td>
                      <td>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/orcamentos/${o.id}`)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
