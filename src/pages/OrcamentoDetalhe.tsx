import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save, ExternalLink, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface OrcamentoServico {
  composicao_id: string;
  quantidade: number;
}

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [servicos, setServicos] = useState<OrcamentoServico[]>([]);
  const [saving, setSaving] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);

  // Oportunidade
  const { data: oportunidade } = useQuery({
    queryKey: ["orcamento-oportunidade", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome, codigo)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Composições disponíveis
  const { data: composicoes } = useQuery({
    queryKey: ["orcamento-composicoes"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("composicoes")
        .select("id, codigo, nome, unidade, custo_unitario_total")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data as any[];
    },
  });

  // ADM Local (mobilização) vinculada
  const { data: mobilizacao } = useQuery({
    queryKey: ["orcamento-mobilizacao", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("mobilizacoes")
        .select("*")
        .eq("oportunidade_id", id)
        .eq("ativo", true)
        .limit(1);
      if (error) throw error;
      return (data as any[])?.[0] || null;
    },
    enabled: !!id,
  });

  // BDI
  const { data: bdiData } = useQuery({
    queryKey: ["orcamento-bdi-detalhe"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data as any[])?.[0] || null;
    },
  });

  // Existing orcamento for this oportunidade
  const { data: existingOrcamento } = useQuery({
    queryKey: ["orcamento-existing", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("orcamentos")
        .select("*, orcamento_itens_servico(*)")
        .eq("oportunidade_id", id)
        .limit(1);
      if (error) throw error;
      return (data as any[])?.[0] || null;
    },
    enabled: !!id,
  });

  // Load existing data
  useEffect(() => {
    if (existingOrcamento) {
      setOrcamentoId(existingOrcamento.id);
      const itens = (existingOrcamento.orcamento_itens_servico || []).map((i: any) => ({
        composicao_id: i.composicao_id,
        quantidade: Number(i.quantidade),
      }));
      if (itens.length > 0) setServicos(itens);
    }
  }, [existingOrcamento]);

  const bdiPercentual = bdiData?.bdi_calculado || 0;

  const custoServicos = useMemo(() => {
    return servicos.reduce((total, s) => {
      const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
      return total + (comp?.custo_unitario_total || 0) * s.quantidade;
    }, 0);
  }, [servicos, composicoes]);

  const custoAdmLocal = mobilizacao?.custo_total || 0;
  const custoTotal = custoServicos + custoAdmLocal;
  const valorBdi = custoTotal * (bdiPercentual / 100);
  const precoTotal = custoTotal + valorBdi;

  // Validation: at least one service with valid composicao_id and quantidade > 0
  const servicosValidos = servicos.filter(
    (s) => s.composicao_id && s.quantidade > 0
  );
  const podesSalvar = servicosValidos.length > 0;

  const addServico = () => {
    setServicos([...servicos, { composicao_id: "", quantidade: 1 }]);
  };

  const removeServico = (idx: number) => {
    setServicos(servicos.filter((_, i) => i !== idx));
  };

  const updateServico = (idx: number, field: keyof OrcamentoServico, value: any) => {
    const updated = [...servicos];
    updated[idx] = { ...updated[idx], [field]: value };
    setServicos(updated);
  };

  const handleSalvar = async () => {
    if (!podesSalvar) {
      return toast.error("Adicione ao menos uma composição com quantidade válida");
    }
    setSaving(true);
    try {
      const orcData = {
        oportunidade_id: id,
        mobilizacao_id: mobilizacao?.id || null,
        bdi_id: bdiData?.id || null,
        custo_servicos: custoServicos,
        custo_adm_local: custoAdmLocal,
        custo_total: custoTotal,
        bdi_percentual: bdiPercentual,
        preco_total: precoTotal,
        status: "em_andamento",
      };

      let savedId = orcamentoId;

      if (orcamentoId) {
        const { error } = await (supabase.from as any)("orcamentos")
          .update(orcData)
          .eq("id", orcamentoId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from as any)("orcamentos")
          .insert(orcData)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
        setOrcamentoId(savedId);
      }

      // Sync service items: delete old, insert new
      await (supabase.from as any)("orcamento_itens_servico")
        .delete()
        .eq("orcamento_id", savedId);

      const itensToInsert = servicosValidos.map((s) => {
        const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
        return {
          orcamento_id: savedId,
          composicao_id: s.composicao_id,
          quantidade: s.quantidade,
          custo_unitario: comp?.custo_unitario_total || 0,
          custo_total: (comp?.custo_unitario_total || 0) * s.quantidade,
        };
      });

      if (itensToInsert.length > 0) {
        const { error: iErr } = await (supabase.from as any)("orcamento_itens_servico")
          .insert(itensToInsert);
        if (iErr) throw iErr;
      }

      toast.success("Orçamento salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["orcamento-existing", id] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos-oportunidades"] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!oportunidade) {
    return (
      <div className="page-container animate-fade-in">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="page-title">
              Orçamento — {oportunidade.codigo}
            </h1>
            <p className="page-subtitle">{oportunidade.descricao}</p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={handleSalvar}
          disabled={!podesSalvar || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Orçamento
        </Button>
      </div>

      {/* Oportunidade Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oportunidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Código</span>
              <p className="font-semibold">{oportunidade.codigo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente</span>
              <p className="font-semibold">{oportunidade.clientes?.nome || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Local</span>
              <p className="font-semibold">
                {oportunidade.cidade || "—"}, {oportunidade.estado || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Data</span>
              <p className="font-semibold">
                {new Date(oportunidade.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços (Composições) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Serviços (Composições)</CardTitle>
          <Button size="sm" className="gap-1" onClick={addServico}>
            <Plus className="w-4 h-4" /> Adicionar Serviço
          </Button>
        </CardHeader>
        <CardContent>
          {servicos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-2">
                Nenhum serviço adicionado.
              </p>
              <p className="text-xs text-destructive">
                É necessário adicionar ao menos uma composição para salvar o orçamento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-5">Composição</div>
                <div className="col-span-2">Unidade</div>
                <div className="col-span-1">Qtd</div>
                <div className="col-span-2">Custo Unit.</div>
                <div className="col-span-1">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
              {servicos.map((s, idx) => {
                const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
                const subtotal = (comp?.custo_unitario_total || 0) * s.quantidade;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select
                        value={s.composicao_id}
                        onValueChange={(v) => updateServico(idx, "composicao_id", v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(composicoes || []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.codigo} — {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {comp?.unidade || "—"}
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min={0}
                        value={s.quantidade}
                        onChange={(e) =>
                          updateServico(idx, "quantidade", parseFloat(e.target.value) || 0)
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2 text-sm font-medium">
                      {fmt(comp?.custo_unitario_total || 0)}
                    </div>
                    <div className="col-span-1 text-sm font-semibold">
                      {fmt(subtotal)}
                    </div>
                    <div className="col-span-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeServico(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADM Local */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ADM Local</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => navigate(`/mobilizacao?oportunidade=${id}`)}
          >
            <ExternalLink className="w-4 h-4" />
            {mobilizacao ? "Editar ADM Local" : "Configurar ADM Local"}
          </Button>
        </CardHeader>
        <CardContent>
          {mobilizacao ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Projeto</span>
                <p className="font-semibold">{mobilizacao.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dias Produtivos</span>
                <p className="font-semibold">{mobilizacao.dias_produtivos}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo/Dia</span>
                <p className="font-semibold">{fmt(mobilizacao.custo_por_dia)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Total ADM Local</span>
                <p className="font-semibold text-accent">{fmt(custoAdmLocal)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhuma configuração de ADM Local vinculada a esta oportunidade.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="border-accent/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Resumo do Orçamento</CardTitle>
          <Button
            className="gap-2"
            onClick={handleSalvar}
            disabled={!podesSalvar || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Orçamento
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo Serviços</span>
              <span className="font-medium">{fmt(custoServicos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo ADM Local</span>
              <span className="font-medium">{fmt(custoAdmLocal)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="font-medium">Custo Total</span>
              <span className="font-semibold">{fmt(custoTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BDI ({bdiPercentual.toFixed(2)}%)</span>
              <span className="font-medium">{fmt(valorBdi)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg">
              <span className="font-bold">Preço Total</span>
              <span className="font-bold text-accent">{fmt(precoTotal)}</span>
            </div>
          </div>
          {!podesSalvar && (
            <p className="text-xs text-destructive mt-4 text-center">
              Adicione ao menos uma composição válida para habilitar o salvamento.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
