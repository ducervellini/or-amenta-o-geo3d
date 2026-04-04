import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Trash2, Save, ExternalLink, Loader2,
  Users, Wrench, Package, Truck, Route, Calculator, TrendingUp,
  ChevronDown, ChevronUp, Printer,
} from "lucide-react";
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

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${Number(v).toFixed(2)}%`;

const TIPO_INSUMO_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  mao_de_obra: { label: "Mão de Obra", icon: Users },
  equipamento: { label: "Equipamentos", icon: Wrench },
  veiculo: { label: "Veículos", icon: Truck },
  material: { label: "Materiais", icon: Package },
  combustivel: { label: "Combustível", icon: Truck },
};

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [servicos, setServicos] = useState<OrcamentoServico[]>([]);
  const [saving, setSaving] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const [resumoExpandido, setResumoExpandido] = useState(true);

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

  // Composição itens (para breakdown por tipo de insumo)
  const { data: composicaoItens } = useQuery({
    queryKey: ["orcamento-composicao-itens", servicos.map(s => s.composicao_id).filter(Boolean).join(",")],
    queryFn: async () => {
      const ids = servicos.map(s => s.composicao_id).filter(Boolean);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase.from as any)("composicao_itens")
        .select("composicao_id, tipo_insumo, custo_total")
        .in("composicao_id", ids);
      if (error) throw error;
      return data as any[];
    },
    enabled: servicos.some(s => s.composicao_id),
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

  // Custos deslocamento da mobilização
  const { data: mobilizacaoCustos } = useQuery({
    queryKey: ["orcamento-mobilizacao-custos", mobilizacao?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("mobilizacao_custos")
        .select("*")
        .eq("mobilizacao_id", mobilizacao.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!mobilizacao?.id,
  });

  // Veículos cadastrados (para cálculo mob/desmob)
  const { data: veiculosCadastrados } = useQuery({
    queryKey: ["orcamento-veiculos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("veiculos")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data as any[];
    },
  });


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
  const bdiComponentes: { nome: string; percentual: number }[] = useMemo(() => {
    if (!bdiData?.componentes) return [];
    const comp = bdiData.componentes;
    if (Array.isArray(comp)) return comp;
    // Object format: { "AC": { label, descricao, percentual }, ... }
    return Object.entries(comp).map(([_key, val]: [string, any]) => ({
      nome: val?.label || _key,
      percentual: Number(val?.percentual ?? val ?? 0),
    }));
  }, [bdiData]);

  // ── Custo dos serviços por tipo de insumo ──
  const custoServicosPorTipo = useMemo(() => {
    const result: Record<string, number> = {};
    if (!composicaoItens || !composicoes) return result;
    for (const s of servicos) {
      if (!s.composicao_id || s.quantidade <= 0) continue;
      const comp = composicoes.find((c: any) => c.id === s.composicao_id);
      if (!comp) continue;
      // Get items for this composição
      const itens = composicaoItens.filter((ci: any) => ci.composicao_id === s.composicao_id);
      // Calculate proportion of each tipo_insumo in the composição total
      const totalComposicao = itens.reduce((sum: number, ci: any) => sum + Number(ci.custo_total || 0), 0);
      if (totalComposicao <= 0) continue;
      for (const ci of itens) {
        const tipo = ci.tipo_insumo || "outros";
        const custoItem = Number(ci.custo_total || 0) * s.quantidade;
        result[tipo] = (result[tipo] || 0) + custoItem;
      }
    }
    return result;
  }, [servicos, composicoes, composicaoItens]);

  const custoServicos = useMemo(() => {
    return servicos.reduce((total, s) => {
      const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
      return total + (comp?.custo_unitario_total || 0) * s.quantidade;
    }, 0);
  }, [servicos, composicoes]);

  // ── ADM Local breakdown ──
  const custoDeslocamentos = useMemo(() => {
    if (!mobilizacaoCustos) return 0;
    return mobilizacaoCustos.reduce((sum: number, c: any) => sum + Number(c.custo_total || 0), 0);
  }, [mobilizacaoCustos]);

  const custoMobDesmob = useMemo(() => {
    if (!mobilizacao?.mob_desmob_itens || !Array.isArray(mobilizacao.mob_desmob_itens)) return 0;
    const jornadaDiaria = Number(mobilizacao.jornada_diaria || 8);
    return mobilizacao.mob_desmob_itens.reduce((sum: number, item: any) => {
      // Replicate calcularMobDesmobItem logic from Mobilizacao.tsx
      const distancia = Number(item.distancia_km || 0);
      const kmMaxDia = Number(item.km_max_dia || 600);
      const diasViagem = kmMaxDia > 0 ? Math.ceil(distancia / kmMaxDia) : 1;
      const pernoites = Math.max(0, diasViagem - 1);
      const qVeiculos = Number(item.quantidade_veiculos || 1);
      const qPessoas = Number(item.quantidade_pessoas || 1);
      const hospPernoite = Number(item.hospedagem_pernoite || 0);
      const custoHoraPessoa = Number(item.custo_hora_pessoa || 0);
      const pedagiosIda = Number(item.pedagios_ida || 0);

      // Combustível: estimate from veiculos table if available
      let custoCombKm = 0;
      if (item.veiculo_id && veiculosCadastrados) {
        const veic = (veiculosCadastrados as any[])?.find((v: any) => v.id === item.veiculo_id);
        if (veic) {
          const mediaKmL = Number(veic.media_km_l || 0);
          const precoComb = Number(veic.combustivel_preco_litro || 0);
          const consumoKm = Number(veic.combustivel_consumo_km || 0);
          custoCombKm = consumoKm > 0
            ? precoComb * consumoKm
            : (mediaKmL > 0 ? precoComb / mediaKmL : 0);
        }
      }

      const custoCombustivelIda = custoCombKm * distancia * qVeiculos;
      const custoPernoiteIda = pernoites * hospPernoite * qPessoas;
      const custoHorasPessoasIda = diasViagem * jornadaDiaria * custoHoraPessoa * qPessoas;
      const custoIda = custoCombustivelIda + custoPernoiteIda + pedagiosIda + custoHorasPessoasIda;
      return sum + (custoIda * 2); // ida + volta
    }, 0);
  }, [mobilizacao, veiculosCadastrados]);

  const custoAdmLocal = mobilizacao?.custo_total || 0;
  const custoAdmLocalOutros = Math.max(0, custoAdmLocal - custoDeslocamentos - custoMobDesmob);

  const custoTotal = custoServicos + custoAdmLocal;
  const valorBdi = custoTotal * (bdiPercentual / 100);
  const precoTotal = custoTotal + valorBdi;

  // Deslocamentos por categoria
  const deslocamentosPorCategoria = useMemo(() => {
    if (!mobilizacaoCustos) return {};
    const result: Record<string, number> = {};
    for (const c of mobilizacaoCustos) {
      const cat = c.categoria || "outros";
      result[cat] = (result[cat] || 0) + Number(c.custo_total || 0);
    }
    return result;
  }, [mobilizacaoCustos]);

  const CATEGORIAS_DESL_LABELS: Record<string, string> = {
    hospedagem: "Hospedagem",
    combustivel: "Veículo + Combustível",
    pedagios: "Pedágios",
    passagens: "Passagens",
    diversos: "Diversos",
  };

  // Validation
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

      // Sync service items
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
                <p className="font-semibold text-primary">{fmt(custoAdmLocal)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhuma configuração de ADM Local vinculada a esta oportunidade.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Resumo Detalhado ── */}
      <Card className="border-primary/30">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setResumoExpandido(!resumoExpandido)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Resumo do Orçamento
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">{fmt(precoTotal)}</span>
              {resumoExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CardHeader>
        {resumoExpandido && (
          <CardContent className="space-y-5">
            {/* ── SUBTOTAL 1: Serviços ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs font-semibold">SUBTOTAL 1</Badge>
                <span className="text-sm font-semibold">Serviços</span>
              </div>
              <div className="space-y-2 pl-2">
                {Object.entries(TIPO_INSUMO_LABELS).map(([tipo, { label, icon: Icon }]) => {
                  const valor = custoServicosPorTipo[tipo] || 0;
                  if (valor <= 0) return null;
                  return (
                    <div key={tipo} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </span>
                      <span className="font-medium">{fmt(valor)}</span>
                    </div>
                  );
                })}
                {custoServicos > 0 && Object.keys(custoServicosPorTipo).length === 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Composições</span>
                    <span className="font-medium">{fmt(custoServicos)}</span>
                  </div>
                )}
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-semibold pl-2">
                <span>Subtotal Serviços</span>
                <span>{fmt(custoServicos)}</span>
              </div>
            </div>

            <Separator />

            {/* ── SUBTOTAL 2: ADM Local ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs font-semibold">SUBTOTAL 2</Badge>
                <span className="text-sm font-semibold">ADM Local</span>
              </div>
              {mobilizacao ? (
                <div className="space-y-2 pl-2">
                  {/* Mob/Desmob */}
                  {custoMobDesmob > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Route className="w-3.5 h-3.5" /> Mobilização / Desmobilização
                      </span>
                      <span className="font-medium">{fmt(custoMobDesmob)}</span>
                    </div>
                  )}
                  {/* Deslocamentos por categoria */}
                  {Object.entries(deslocamentosPorCategoria).map(([cat, valor]) => {
                    if (valor <= 0) return null;
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Truck className="w-3.5 h-3.5" /> {CATEGORIAS_DESL_LABELS[cat] || cat}
                        </span>
                        <span className="font-medium">{fmt(valor)}</span>
                      </div>
                    );
                  })}
                  {/* Outros custos ADM (se houver diferença) */}
                  {custoAdmLocalOutros > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Package className="w-3.5 h-3.5" /> Demais custos
                      </span>
                      <span className="font-medium">{fmt(custoAdmLocalOutros)}</span>
                    </div>
                  )}
                  {/* Se sem breakdown, mostra total direto */}
                  {custoDeslocamentos <= 0 && custoMobDesmob <= 0 && custoAdmLocal > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Custo ADM Local</span>
                      <span className="font-medium">{fmt(custoAdmLocal)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-2">Nenhum ADM Local configurado</p>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-semibold pl-2">
                <span>Subtotal ADM Local</span>
                <span>{fmt(custoAdmLocal)}</span>
              </div>
            </div>

            <Separator />

            {/* ── Custo Direto Total ── */}
            <div className="flex justify-between text-sm font-bold bg-muted/50 p-3 rounded-md">
              <span>Custo Direto Total (Serviços + ADM Local)</span>
              <span>{fmt(custoTotal)}</span>
            </div>

            <Separator />

            {/* ── DRE / BDI Detalhado ── */}
            {(() => {
              // Categorize BDI components for DRE
              const tributosReceita: typeof bdiComponentes = [];
              const impostosLucro: typeof bdiComponentes = [];
              const despesasIndiretas: typeof bdiComponentes = [];
              let lucroComp: typeof bdiComponentes[0] | null = null;
              let riscoComp: typeof bdiComponentes[0] | null = null;

              for (const comp of bdiComponentes) {
                const nomeUpper = comp.nome.toUpperCase();
                if (nomeUpper.includes("LUCRO")) {
                  lucroComp = comp;
                } else if (nomeUpper.includes("RISCO")) {
                  riscoComp = comp;
                } else if (
                  nomeUpper.includes("IRPJ") || nomeUpper.includes("IR ") || nomeUpper.includes("IMPOSTO DE RENDA") ||
                  nomeUpper.includes("CSLL") || nomeUpper.includes("CONTRIBUIÇÃO SOCIAL")
                ) {
                  impostosLucro.push(comp);
                } else if (
                  ["ISS", "PIS", "COFINS", "CPRB", "ICMS"].some(t => nomeUpper.includes(t)) ||
                  nomeUpper.includes("TRIBUT") || nomeUpper.includes("IMPOSTO") || nomeUpper.includes("CONTRIBUI")
                ) {
                  tributosReceita.push(comp);
                } else {
                  despesasIndiretas.push(comp);
                }
              }

              // Se não houver IRPJ/CSLL nos componentes do BDI, adicionar padrões presumido lucro
              if (impostosLucro.length === 0) {
                impostosLucro.push({ nome: "IRPJ (Lucro Presumido)", percentual: 4.80 });
                impostosLucro.push({ nome: "CSLL (Lucro Presumido)", percentual: 2.88 });
              }

              const totalTributosPct = tributosReceita.reduce((s, c) => s + c.percentual, 0);
              const totalTributos = custoTotal * (totalTributosPct / 100);
              const totalDespIndPct = despesasIndiretas.reduce((s, c) => s + c.percentual, 0);
              const totalDespInd = custoTotal * (totalDespIndPct / 100);
              const valorLucro = lucroComp ? custoTotal * (lucroComp.percentual / 100) : 0;
              const valorRisco = riscoComp ? custoTotal * (riscoComp.percentual / 100) : 0;

              // Lucro antes do IR
              const lucroAntesIR = valorLucro - valorRisco;

              // Impostos sobre o lucro (aplicados sobre o preço de venda)
              const totalImpostosLucroPct = impostosLucro.reduce((s, c) => s + c.percentual, 0);
              const totalImpostosLucro = precoTotal * (totalImpostosLucroPct / 100);

              const lucroLiquido = lucroAntesIR - totalImpostosLucro;

              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs font-semibold">DRE + BDI</Badge>
                    <span className="text-sm font-semibold">
                      Demonstrativo de Resultado — {bdiData?.nome || "BDI"} ({fmtPct(bdiPercentual)})
                    </span>
                  </div>

                  <div className="space-y-1 pl-2">
                    {/* Receita Bruta = Preço de Venda */}
                    <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded">
                      <span>Receita Bruta (Preço de Venda)</span>
                      <span>{fmt(precoTotal)}</span>
                    </div>

                    {/* (-) Tributos sobre Receita */}
                    {tributosReceita.length > 0 && (
                      <div className="pt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 pl-1">(-) Tributos sobre Receita</div>
                        {tributosReceita.map((comp, i) => (
                          <div key={i} className="flex items-center justify-between text-sm pl-3 py-0.5">
                            <span className="text-muted-foreground">{comp.nome}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground w-16 text-right">{fmtPct(comp.percentual)}</span>
                              <span className="font-medium w-28 text-right text-destructive">-{fmt(custoTotal * (comp.percentual / 100))}</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-medium pl-3 pt-1 border-t border-dashed mt-1">
                          <span>Total Tributos s/ Receita</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs w-16 text-right">{fmtPct(totalTributosPct)}</span>
                            <span className="w-28 text-right text-destructive">-{fmt(totalTributos)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* = Receita Líquida */}
                    <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
                      <span>= Receita Líquida</span>
                      <span>{fmt(precoTotal - totalTributos)}</span>
                    </div>

                    {/* (-) Custos Diretos */}
                    <div className="pt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1 pl-1">(-) Custos Diretos</div>
                      <div className="flex items-center justify-between text-sm pl-3 py-0.5">
                        <span className="text-muted-foreground">Serviços (Subtotal 1)</span>
                        <span className="font-medium w-28 text-right text-destructive">-{fmt(custoServicos)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pl-3 py-0.5">
                        <span className="text-muted-foreground">ADM Local (Subtotal 2)</span>
                        <span className="font-medium w-28 text-right text-destructive">-{fmt(custoAdmLocal)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pl-3 pt-1 border-t border-dashed mt-1">
                        <span>Total Custos Diretos</span>
                        <span className="w-28 text-right text-destructive">-{fmt(custoTotal)}</span>
                      </div>
                    </div>

                    {/* = Lucro Bruto */}
                    <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
                      <span>= Lucro Bruto</span>
                      <span>{fmt(precoTotal - totalTributos - custoTotal)}</span>
                    </div>

                    {/* (-) Despesas Indiretas */}
                    {(despesasIndiretas.length > 0 || riscoComp) && (
                      <div className="pt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 pl-1">(-) Despesas Indiretas</div>
                        {despesasIndiretas.map((comp, i) => (
                          <div key={i} className="flex items-center justify-between text-sm pl-3 py-0.5">
                            <span className="text-muted-foreground">{comp.nome}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground w-16 text-right">{fmtPct(comp.percentual)}</span>
                              <span className="font-medium w-28 text-right text-destructive">-{fmt(custoTotal * (comp.percentual / 100))}</span>
                            </div>
                          </div>
                        ))}
                        {riscoComp && (
                          <div className="flex items-center justify-between text-sm pl-3 py-0.5">
                            <span className="text-muted-foreground">{riscoComp.nome}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground w-16 text-right">{fmtPct(riscoComp.percentual)}</span>
                              <span className="font-medium w-28 text-right text-destructive">-{fmt(valorRisco)}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-medium pl-3 pt-1 border-t border-dashed mt-1">
                          <span>Total Despesas Indiretas</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs w-16 text-right">{fmtPct(totalDespIndPct + (riscoComp?.percentual || 0))}</span>
                            <span className="w-28 text-right text-destructive">-{fmt(totalDespInd + valorRisco)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* = Lucro antes do IR */}
                    <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
                      <span>= Lucro antes do IR</span>
                      <span>{fmt(lucroAntesIR)}</span>
                    </div>

                    {/* (-) Impostos sobre o Lucro */}
                    <div className="pt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1 pl-1">(-) Impostos sobre o Lucro</div>
                      {impostosLucro.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between text-sm pl-3 py-0.5">
                          <span className="text-muted-foreground">{comp.nome}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground w-16 text-right">{fmtPct(comp.percentual)}</span>
                            <span className="font-medium w-28 text-right text-destructive">-{fmt(precoTotal * (comp.percentual / 100))}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-medium pl-3 pt-1 border-t border-dashed mt-1">
                        <span>Total IR + CSLL</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs w-16 text-right">{fmtPct(totalImpostosLucroPct)}</span>
                          <span className="w-28 text-right text-destructive">-{fmt(totalImpostosLucro)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* = Lucro Líquido */}
                    <div className="flex justify-between items-center text-base font-bold p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Lucro Líquido (após IR)
                      </span>
                      <div className="text-right">
                        <span className={`text-lg ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                          {fmt(lucroLiquido)}
                        </span>
                        {precoTotal > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {((lucroLiquido / precoTotal) * 100).toFixed(2)}% da receita
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Separator />

            {/* ── Preço Final ── */}
            <div className="flex justify-between items-center text-lg font-bold bg-primary/10 p-4 rounded-lg">
              <span>Preço de Venda</span>
              <span className="text-primary text-xl">{fmt(precoTotal)}</span>
            </div>

            {!podesSalvar && (
              <p className="text-xs text-destructive text-center">
                Adicione ao menos uma composição válida para habilitar o salvamento.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button
                className="gap-2"
                onClick={handleSalvar}
                disabled={!podesSalvar || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Orçamento
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
