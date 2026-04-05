import { useState } from "react";
import { Search, FileText, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", className: "bg-primary/15 text-primary border-primary/30" },
  revisao: { label: "Revisão", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  finalizado: { label: "Finalizado", className: "bg-accent/15 text-accent border-accent/30 font-semibold" },
};

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: orcamentos } = useQuery({
    queryKey: ["orcamentos-salvos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("orcamentos")
        .select("*, orcamento_itens_servico(id)");
      if (error) throw error;
      return data as any[];
    },
  });

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

  const getOrcamento = (opId: string) =>
    (orcamentos || []).find((orc: any) => orc.oportunidade_id === opId);

  const getMobCusto = (opId: string) => {
    const mob = (mobilizacoes || []).find((m: any) => m.oportunidade_id === opId);
    return mob?.custo_total || 0;
  };

  const getStatus = (op: any) => {
    const orc = getOrcamento(op.id);
    if (!orc) return "rascunho";

    const temServicos = (orc.orcamento_itens_servico || []).length > 0;
    const temMobilizacao = !!(mobilizacoes || []).find((m: any) => m.oportunidade_id === op.id);
    const temBdi = !!orc.bdi_id;
    const temGrupo = !!op.grupo_servicos_id;

    if (temServicos && temMobilizacao && temBdi && temGrupo) return "finalizado";
    if (temServicos || temMobilizacao) return "em_andamento";
    return "rascunho";
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
                  const orc = getOrcamento(o.id);
                  const custoTotal = orc?.custo_total || getMobCusto(o.id);
                  const precoTotal = orc?.preco_total || (custoTotal > 0 ? custoTotal * (1 + bdiPercentual / 100) : 0);
                  const status = getStatus(o);
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
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/orcamentos/${o.id}`)}
                            title="Abrir orçamento"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/orcamentos/${o.id}`)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={async () => {
                              const { error } = await (supabase.from as any)("oportunidades")
                                .update({ ativo: false })
                                .eq("id", o.id);
                              if (error) {
                                toast.error(error.message);
                              } else {
                                toast.success("Orçamento removido");
                                queryClient.invalidateQueries({ queryKey: ["orcamentos-oportunidades"] });
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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