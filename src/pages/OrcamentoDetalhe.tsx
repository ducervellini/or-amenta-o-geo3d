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
  ChevronDown, ChevronUp, Printer, Check, ChevronRight, ChevronLeft,
  Building, FileText, DollarSign,
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
import { cn } from "@/lib/utils";

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

const STEPS = [
  { key: "oportunidade", label: "Oportunidade", icon: FileText },
  { key: "servicos", label: "Serviços", icon: Package },
  { key: "adm-local", label: "ADM Local", icon: Building },
  { key: "bdi-preco", label: "BDI & Preço", icon: DollarSign },
] as const;

type StepKey = typeof STEPS[number]["key"];

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [servicos, setServicos] = useState<OrcamentoServico[]>([]);
  const [saving, setSaving] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("oportunidade");
  const [selectedBdiId, setSelectedBdiId] = useState<string>("");

  // ── Queries ──

  const { data: oportunidade } = useQuery({
    queryKey: ["orcamento-oportunidade", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome, codigo), grupos_servicos(id, nome)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const grupoId = oportunidade?.grupo_servicos_id || null;

  const { data: grupoServicoIds } = useQuery({
    queryKey: ["orcamento-grupo-servicos", grupoId],
    queryFn: async () => {
      if (!grupoId) return [];
      const { data, error } = await (supabase.from as any)("grupos_servicos_servicos")
        .select("servico_id")
        .eq("grupo_id", grupoId);
      if (error) throw error;
      return (data as any[]).map((item: any) => item.servico_id) as string[];
    },
    enabled: !!grupoId,
  });

  const { data: composicoes } = useQuery({
    queryKey: ["orcamento-composicoes", grupoServicoIds],
    queryFn: async () => {
      if (!grupoServicoIds?.length) return [];
      const { data, error } = await (supabase.from as any)("composicoes")
        .select("id, codigo, nome, unidade, custo_unitario_total, servico_id, ordem_id")
        .eq("ativo", true)
        .in("servico_id", grupoServicoIds)
        .order("ordem_id");
      if (error) throw error;
      return data as any[];
    },
    enabled: grupoServicoIds !== undefined,
  });

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

  // All BDI profiles
  const { data: bdiProfiles } = useQuery({
    queryKey: ["orcamento-bdi-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

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

  useEffect(() => {
    if (existingOrcamento) {
      setOrcamentoId(existingOrcamento.id);
      if (existingOrcamento.bdi_id) setSelectedBdiId(existingOrcamento.bdi_id);
    }
  }, [existingOrcamento]);

  useEffect(() => {
    if (composicoes === undefined) return;

    const savedQuantities = new Map<string, number>(
      (existingOrcamento?.orcamento_itens_servico || []).map((item: any) => [
        item.composicao_id,
        Number(item.quantidade || 0),
      ])
    );

    setServicos(
      composicoes.map((comp: any) => ({
        composicao_id: comp.id,
        quantidade: savedQuantities.get(comp.id) ?? 0,
      }))
    );
  }, [composicoes, existingOrcamento]);

  // Auto-select first BDI if none selected
  useEffect(() => {
    if (!selectedBdiId && bdiProfiles?.length) {
      setSelectedBdiId(bdiProfiles[0].id);
    }
  }, [bdiProfiles, selectedBdiId]);

  const bdiData = useMemo(() => {
    if (!bdiProfiles) return null;
    return bdiProfiles.find((b: any) => b.id === selectedBdiId) || bdiProfiles[0] || null;
  }, [bdiProfiles, selectedBdiId]);

  const bdiPercentual = bdiData?.bdi_calculado || 0;
  const bdiComponentes: { nome: string; percentual: number }[] = useMemo(() => {
    if (!bdiData?.componentes) return [];
    const comp = bdiData.componentes;
    if (Array.isArray(comp)) return comp;
    return Object.entries(comp).map(([_key, val]: [string, any]) => ({
      nome: val?.label || _key,
      percentual: Number(val?.percentual ?? val ?? 0),
    }));
  }, [bdiData]);

  // ── Calculations ──

  const custoServicosPorTipo = useMemo(() => {
    const result: Record<string, number> = {};
    if (!composicaoItens || !composicoes) return result;
    for (const s of servicos) {
      if (!s.composicao_id || s.quantidade <= 0) continue;
      const itens = composicaoItens.filter((ci: any) => ci.composicao_id === s.composicao_id);
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

  const custoDeslocamentos = useMemo(() => {
    if (!mobilizacaoCustos) return 0;
    return mobilizacaoCustos.reduce((sum: number, c: any) => sum + Number(c.custo_total || 0), 0);
  }, [mobilizacaoCustos]);

  const custoMobDesmob = useMemo(() => {
    if (!mobilizacao?.mob_desmob_itens || !Array.isArray(mobilizacao.mob_desmob_itens)) return 0;
    const jornadaDiaria = Number(mobilizacao.jornada_diaria || 8);
    return mobilizacao.mob_desmob_itens.reduce((sum: number, item: any) => {
      const distancia = Number(item.distancia_km || 0);
      const kmMaxDia = Number(item.km_max_dia || 600);
      const diasViagem = kmMaxDia > 0 ? Math.ceil(distancia / kmMaxDia) : 1;
      const pernoites = Math.max(0, diasViagem - 1);
      const qVeiculos = Number(item.quantidade_veiculos || 1);
      const qPessoas = Number(item.quantidade_pessoas || 1);
      const hospPernoite = Number(item.hospedagem_pernoite || 0);
      const custoHoraPessoa = Number(item.custo_hora_pessoa || 0);
      const pedagiosIda = Number(item.pedagios_ida || 0);
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
      return sum + (custoIda * 2);
    }, 0);
  }, [mobilizacao, veiculosCadastrados]);

  const custoAdmLocal = mobilizacao?.custo_total || 0;
  const custoAdmLocalOutros = Math.max(0, custoAdmLocal - custoDeslocamentos - custoMobDesmob);
  const custoTotal = custoServicos + custoAdmLocal;
  const valorBdi = custoTotal * (bdiPercentual / 100);
  const precoTotal = custoTotal + valorBdi;

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

  const servicosValidos = servicos.filter((s) => s.composicao_id && s.quantidade > 0);
  const podesSalvar = servicosValidos.length > 0;

  const addServico = () => setServicos([...servicos, { composicao_id: "", quantidade: 1 }]);
  const removeServico = (idx: number) => setServicos(servicos.filter((_, i) => i !== idx));
  const updateServico = (idx: number, field: keyof OrcamentoServico, value: any) => {
    const updated = [...servicos];
    updated[idx] = { ...updated[idx], [field]: value };
    setServicos(updated);
  };

  // ── Step navigation ──
  const currentStepIndex = STEPS.findIndex(s => s.key === activeStep);
  const canGoNext = currentStepIndex < STEPS.length - 1;
  const canGoPrev = currentStepIndex > 0;
  const goNext = () => canGoNext && setActiveStep(STEPS[currentStepIndex + 1].key);
  const goPrev = () => canGoPrev && setActiveStep(STEPS[currentStepIndex - 1].key);

  // Step completion status
  const stepStatus = useMemo(() => ({
    oportunidade: !!oportunidade,
    servicos: servicosValidos.length > 0,
    "adm-local": !!mobilizacao,
    "bdi-preco": !!bdiData,
  }), [oportunidade, servicosValidos.length, mobilizacao, bdiData]);

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
      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Orçamento Detalhado — {oportunidade.codigo}</h1>
        <p className="text-sm text-muted-foreground">{oportunidade.descricao}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Cliente: {oportunidade.clientes?.nome || "—"} | Local: {oportunidade.cidade || ""}{oportunidade.estado ? `/${oportunidade.estado}` : ""} | Emitido em: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <hr className="mt-2" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button className="gap-2" onClick={handleSalvar} disabled={!podesSalvar || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="print:hidden">
        <div className="flex items-center justify-between bg-card border rounded-lg p-3">
          {STEPS.map((step, idx) => {
            const isActive = step.key === activeStep;
            const isCompleted = stepStatus[step.key];
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <button
                  onClick={() => setActiveStep(step.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all w-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    isActive
                      ? "bg-primary-foreground/20"
                      : isCompleted
                        ? "bg-primary/10"
                        : "bg-muted"
                  )}>
                    {isCompleted && !isActive ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}

      {/* ETAPA 1: Oportunidade */}
      {activeStep === "oportunidade" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Dados da Oportunidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                <span className="text-muted-foreground">Grupo de Serviços</span>
                <p className="font-semibold">{oportunidade.grupos_servicos?.nome || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data</span>
                <p className="font-semibold">
                  {new Date(oportunidade.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            {oportunidade.descricao && (
              <div>
                <span className="text-muted-foreground text-sm">Descrição</span>
                <p className="text-sm mt-1">{oportunidade.descricao}</p>
              </div>
            )}

            {/* Mini-resumo do que já está configurado */}
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className={cn("p-3 rounded-lg border text-center", servicosValidos.length > 0 ? "border-primary/30 bg-primary/5" : "border-dashed")}>
                <p className="text-xs text-muted-foreground">Composições</p>
                <p className="text-lg font-bold">{servicosValidos.length}</p>
                <p className="text-xs font-medium text-primary">{fmt(custoServicos)}</p>
              </div>
              <div className={cn("p-3 rounded-lg border text-center", mobilizacao ? "border-primary/30 bg-primary/5" : "border-dashed")}>
                <p className="text-xs text-muted-foreground">ADM Local</p>
                <p className="text-lg font-bold">{mobilizacao ? "✓" : "—"}</p>
                <p className="text-xs font-medium text-primary">{fmt(custoAdmLocal)}</p>
              </div>
              <div className={cn("p-3 rounded-lg border text-center", bdiData ? "border-primary/30 bg-primary/5" : "border-dashed")}>
                <p className="text-xs text-muted-foreground">BDI</p>
                <p className="text-lg font-bold">{bdiData ? fmtPct(bdiPercentual) : "—"}</p>
                <p className="text-xs font-medium text-primary">{fmt(precoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 2: Serviços (Composições) */}
      {activeStep === "servicos" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Serviços — {oportunidade.grupos_servicos?.nome || "Todos"}
            </CardTitle>
            {!grupoId && (
              <Button size="sm" className="gap-1" onClick={addServico}>
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!grupoId && servicos.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Nenhum grupo de serviços selecionado na oportunidade.</p>
                <p className="text-muted-foreground text-xs">Edite a oportunidade para vincular um grupo, ou adicione composições manualmente.</p>
                <Button variant="outline" className="gap-2" onClick={addServico}>
                  <Plus className="w-4 h-4" /> Adicionar composição
                </Button>
              </div>
            ) : servicos.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Nenhuma composição encontrada para este grupo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grupoId && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-muted-foreground">
                    Informe as quantidades de acordo com a unidade de cada serviço.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs font-medium text-muted-foreground">
                        <th className="text-left py-2 px-2">Composição</th>
                        <th className="text-left py-2 px-2 w-48">Dados de Entrada</th>
                        <th className="text-right py-2 px-2">Custo Unit.</th>
                        <th className="text-right py-2 px-2">Subtotal</th>
                        {!grupoId && <th className="w-10"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {servicos.map((s, idx) => {
                        const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
                        const subtotal = (comp?.custo_unitario_total || 0) * s.quantidade;
                        const unidade = comp?.unidade || "un";
                        return (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2">
                              {grupoId ? (
                                <div>
                                  <span className="font-medium">{comp?.codigo} — {comp?.nome || "—"}</span>
                                </div>
                              ) : (
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
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={s.quantidade}
                                  onChange={(e) => updateServico(idx, "quantidade", parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="h-9 text-sm text-right w-24"
                                />
                                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap min-w-[60px]">
                                  {unidade}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-medium">
                              {fmt(comp?.custo_unitario_total || 0)}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold">
                              {fmt(subtotal)}
                            </td>
                            {!grupoId && (
                              <td className="py-2 px-2 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeServico(idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Separator className="my-2" />

                {/* Resumo por tipo de insumo */}
                {Object.keys(custoServicosPorTipo).length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Breakdown por Insumo</p>
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
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold bg-primary/5 p-3 rounded-md border border-primary/20">
                  <span>Total Serviços</span>
                  <span className="text-primary">{fmt(custoServicos)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ETAPA 3: ADM Local */}
      {activeStep === "adm-local" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              ADM Local
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => navigate(`/mobilizacao?oportunidade=${id}`)}
            >
              <ExternalLink className="w-4 h-4" />
              {mobilizacao ? "Editar" : "Configurar"}
            </Button>
          </CardHeader>
          <CardContent>
            {mobilizacao ? (
              <div className="space-y-4">
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
                    <span className="text-muted-foreground">Custo Total</span>
                    <p className="font-semibold text-primary">{fmt(custoAdmLocal)}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <Separator />
                <div className="space-y-2">
                  {custoMobDesmob > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Route className="w-3.5 h-3.5" /> Mob / Desmob
                      </span>
                      <span className="font-medium">{fmt(custoMobDesmob)}</span>
                    </div>
                  )}
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
                  {custoAdmLocalOutros > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Package className="w-3.5 h-3.5" /> Demais custos
                      </span>
                      <span className="font-medium">{fmt(custoAdmLocalOutros)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm font-bold bg-primary/5 p-3 rounded-md border border-primary/20">
                  <span>Total ADM Local</span>
                  <span className="text-primary">{fmt(custoAdmLocal)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Building className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma configuração de ADM Local vinculada.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate(`/mobilizacao?oportunidade=${id}`)}
                >
                  <Plus className="w-4 h-4" /> Configurar ADM Local
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ETAPA 4: BDI & Preço */}
      {activeStep === "bdi-preco" && (
        <div className="space-y-6">
          {/* BDI Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Perfil de BDI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-sm">
                  <Select value={selectedBdiId} onValueChange={setSelectedBdiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil de BDI..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(bdiProfiles || []).map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nome} — {fmtPct(b.bdi_calculado)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bdiData && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    BDI: {fmtPct(bdiPercentual)}
                  </Badge>
                )}
              </div>
              {bdiComponentes.length > 0 && (
                <div className="mt-4 space-y-1 bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Componentes</p>
                  {bdiComponentes.map((comp, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{comp.nome}</span>
                      <span className="font-medium">{fmtPct(comp.percentual)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo Consolidado */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Resumo do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Subtotal Serviços */}
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

              {/* Subtotal ADM Local */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs font-semibold">SUBTOTAL 2</Badge>
                  <span className="text-sm font-semibold">ADM Local</span>
                </div>
                {mobilizacao ? (
                  <div className="space-y-2 pl-2">
                    {custoMobDesmob > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Route className="w-3.5 h-3.5" /> Mob / Desmob
                        </span>
                        <span className="font-medium">{fmt(custoMobDesmob)}</span>
                      </div>
                    )}
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
                    {custoAdmLocalOutros > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-3.5 h-3.5" /> Demais custos
                        </span>
                        <span className="font-medium">{fmt(custoAdmLocalOutros)}</span>
                      </div>
                    )}
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

              {/* Custo Direto Total */}
              <div className="flex justify-between text-sm font-bold bg-muted/50 p-3 rounded-md">
                <span>Custo Direto Total (Serviços + ADM Local)</span>
                <span>{fmt(custoTotal)}</span>
              </div>

              <Separator />

              {/* DRE / BDI */}
              {renderDRE(bdiComponentes, custoTotal, custoServicos, custoAdmLocal, precoTotal, bdiData, bdiPercentual)}

              <Separator />

              {/* Preço Final */}
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
                <Button className="gap-2" onClick={handleSalvar} disabled={!podesSalvar || saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Orçamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step Navigation ── */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          className="gap-2"
          onClick={goPrev}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <div className="text-sm text-muted-foreground">
          Etapa {currentStepIndex + 1} de {STEPS.length}
        </div>
        <Button
          variant={canGoNext ? "default" : "outline"}
          className="gap-2"
          onClick={goNext}
          disabled={!canGoNext}
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Print: show all content */}
      <div className="hidden print:block space-y-6">
        {/* Print resumo inline - reuses the BDI step content */}
        <Card>
          <CardHeader><CardTitle className="text-base">Serviços</CardTitle></CardHeader>
          <CardContent>
            {servicosValidos.map((s, idx) => {
              const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
              return (
                <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{comp?.codigo} — {comp?.nome}</span>
                  <span>{s.quantidade} × {fmt(comp?.custo_unitario_total || 0)} = {fmt((comp?.custo_unitario_total || 0) * s.quantidade)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t">
              <span>Total Serviços</span><span>{fmt(custoServicos)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between font-bold text-sm"><span>ADM Local</span><span>{fmt(custoAdmLocal)}</span></div>
            <div className="flex justify-between font-bold text-sm mt-1"><span>Custo Total</span><span>{fmt(custoTotal)}</span></div>
            <div className="flex justify-between font-bold text-sm mt-1"><span>BDI ({fmtPct(bdiPercentual)})</span><span>{fmt(valorBdi)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg"><span>Preço de Venda</span><span className="text-primary">{fmt(precoTotal)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── DRE render helper ──
function renderDRE(
  bdiComponentes: { nome: string; percentual: number }[],
  custoTotal: number,
  custoServicos: number,
  custoAdmLocal: number,
  precoTotal: number,
  bdiData: any,
  bdiPercentual: number,
) {
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
  const lucroAntesIR = valorLucro - valorRisco;
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
        <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded">
          <span>Receita Bruta (Preço de Venda)</span>
          <span>{fmt(precoTotal)}</span>
        </div>

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

        <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
          <span>= Receita Líquida</span>
          <span>{fmt(precoTotal - totalTributos)}</span>
        </div>

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

        <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
          <span>= Lucro Bruto</span>
          <span>{fmt(precoTotal - totalTributos - custoTotal)}</span>
        </div>

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

        <div className="flex justify-between text-sm font-semibold bg-muted/30 p-2 rounded mt-2">
          <span>= Lucro antes do IR</span>
          <span>{fmt(lucroAntesIR)}</span>
        </div>

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
}
