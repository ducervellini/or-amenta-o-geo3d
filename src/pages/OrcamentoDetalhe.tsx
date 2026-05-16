import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Trash2, Save, ExternalLink, Loader2,
  Users, Wrench, Package, Truck, Route, Calculator, TrendingUp, Target,
  ChevronDown, ChevronUp, Printer, Check, ChevronRight, ChevronLeft,
  Building, FileText, DollarSign, FileDown, Calendar,
} from "lucide-react";
import { gerarRelatorioDocx, type DadosRelatorioDocx } from "@/lib/relatorio-exequibilidade-docx";
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
import { cn, addMonthsISO } from "@/lib/utils";
import { calcularStatusOrcamento } from "@/lib/orcamento-status";
import { CronogramaPanel } from "@/components/orcamento/CronogramaPanel";
import { MobilizacaoContent } from "@/pages/Mobilizacao";
import { CustosServicosContent } from "@/pages/CustosServicos";

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
  { key: "cronograma", label: "Cronograma", icon: Calendar },
  { key: "bdi-preco", label: "BDI & Preço", icon: DollarSign },
] as const;

type StepKey = typeof STEPS[number]["key"];

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [servicos, setServicos] = useState<OrcamentoServico[]>([]);
  const [saving, setSaving] = useState(false);
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const stepFromUrl = (searchParams.get("step") as StepKey) || "oportunidade";
  const activeStep: StepKey = STEPS.some(s => s.key === stepFromUrl) ? stepFromUrl : "oportunidade";
  const setActiveStep = (step: StepKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("step", step);
    setSearchParams(next, { replace: true });
  };
  const [selectedBdiId, setSelectedBdiId] = useState<string>("");
  const [precoAlvo, setPrecoAlvo] = useState<string>("");
  const [ajusteAtivo, setAjusteAtivo] = useState(false);

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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: servicosCadastro } = useQuery({
    queryKey: ["orcamento-servicos-cadastro", grupoServicoIds],
    queryFn: async () => {
      if (!grupoServicoIds?.length) return [];
      const { data, error } = await (supabase.from as any)("servicos")
        .select("id, produtividade_padrao, unidade_tempo_produtividade")
        .in("id", grupoServicoIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!grupoServicoIds?.length,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const composicaoIdsStable = useMemo(() => {
    const ids = servicos.map(s => s.composicao_id).filter(Boolean);
    return Array.from(new Set(ids)).sort();
  }, [servicos]);

  const { data: composicaoItens } = useQuery({
    queryKey: ["orcamento-composicao-itens", composicaoIdsStable],
    queryFn: async () => {
      if (composicaoIdsStable.length === 0) return [];
      const { data, error } = await (supabase.from as any)("composicao_itens")
        .select("composicao_id, tipo_insumo, descricao, custo_unitario, quantidade, coeficiente, custo_total, unidade, parametros")
        .in("composicao_id", composicaoIdsStable);
      if (error) throw error;
      return data as any[];
    },
    enabled: composicaoIdsStable.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    placeholderData: keepPreviousData,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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

  const bdiComponentes: { nome: string; percentual: number; categoria?: string }[] = useMemo(() => {
    if (!bdiData?.componentes) return [];
    const comp = bdiData.componentes;
    if (Array.isArray(comp)) return comp;
    return Object.entries(comp).map(([_key, val]: [string, any]) => ({
      nome: val?.label || _key,
      percentual: Number(val?.percentual ?? val ?? 0),
      categoria: val?.categoria || undefined,
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

  // Recalculate price from BDI components using the same inverse formula as BdiDre
  const { precoTotal, bdiPercentual, lucroEfetivoPct } = useMemo(() => {
    if (!bdiComponentes.length || custoTotal <= 0) {
      const fallbackBdi = bdiData?.bdi_calculado || 0;
      const vBdi = custoTotal * (fallbackBdi / 100);
      return { precoTotal: custoTotal + vBdi, bdiPercentual: fallbackBdi, lucroEfetivoPct: 0 };
    }

    const cat = categorizarComponentes(bdiComponentes);
    const totalDespSobreCDPct = cat.despesasPct + cat.riscoPct + cat.comissaoPct;
    const totalDespValor = custoTotal * (totalDespSobreCDPct / 100);

    // Se ajuste ativo, back-calculate lucro para bater preço alvo
    const precoAlvoNum = ajusteAtivo ? parseFloat(precoAlvo) : 0;
    if (ajusteAtivo && precoAlvoNum > 0 && precoAlvoNum > custoTotal) {
      // Preço = (CD + Desp) / (1 - trib% - ir% - lucro%)
      // lucro% = 1 - trib% - ir% - (CD + Desp) / Preço
      const lucroCalc = (1 - (cat.tributosPct / 100) - (cat.irPct / 100) - (custoTotal + totalDespValor) / precoAlvoNum) * 100;
      const bdiValor = precoAlvoNum - custoTotal;
      const bdiPct = custoTotal > 0 ? (bdiValor / custoTotal) * 100 : 0;
      return { precoTotal: precoAlvoNum, bdiPercentual: bdiPct, lucroEfetivoPct: Math.max(0, lucroCalc) };
    }

    const denominador = 1 - (cat.tributosPct / 100) - (cat.irPct / 100) - (cat.lucroPct / 100);
    const preco = denominador > 0 ? (custoTotal + totalDespValor) / denominador : custoTotal;
    const bdiValor = preco - custoTotal;
    const bdiPct = custoTotal > 0 ? (bdiValor / custoTotal) * 100 : 0;

    return { precoTotal: preco, bdiPercentual: bdiPct, lucroEfetivoPct: cat.lucroPct };
  }, [bdiComponentes, custoTotal, bdiData, ajusteAtivo, precoAlvo]);

  const valorBdi = precoTotal - custoTotal;

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

  // Status / progresso unificado (mesma fonte usada na lista de Orçamentos)
  const progresso = useMemo(() => calcularStatusOrcamento({
    oportunidade,
    temServicos: servicosValidos.length > 0,
    temMobilizacao: !!mobilizacao,
    temBdi: !!bdiData,
  }), [oportunidade, servicosValidos.length, mobilizacao, bdiData]);
  const stepStatus = progresso.etapas;

  const handleGerarRelatorio = async () => {
    const dadosRelatorio: DadosRelatorioDocx = {
      oportunidade: {
        codigo: oportunidade.codigo,
        descricao: oportunidade.descricao,
        cliente: oportunidade.clientes?.nome || "—",
        cidade: oportunidade.cidade || "—",
        estado: oportunidade.estado || "—",
        grupoServicos: oportunidade.grupos_servicos?.nome || "—",
      },
      servicos: servicosValidos.map(s => {
        const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
        const svc = (servicosCadastro || []).find((sv: any) => sv.id === comp?.servico_id);
        return {
          codigo: comp?.codigo || "",
          nome: comp?.nome || "",
          quantidade: s.quantidade,
          unidade: comp?.unidade || "un",
          custoUnitario: comp?.custo_unitario_total || 0,
          subtotal: (comp?.custo_unitario_total || 0) * s.quantidade,
          produtividadePadrao: svc?.produtividade_padrao ?? null,
          unidadeTempoProdutividade: svc?.unidade_tempo_produtividade || "dia",
        };
      }),
      custoServicosPorTipo,
      custoServicos,
      custoAdmLocal,
      custoTotal,
      bdiPercentual,
      precoTotal,
      valorBdi,
      bdiComponentes,
      bdiNome: bdiData?.nome || "BDI",
      mobilizacao: mobilizacao ? {
        nome: mobilizacao.nome,
        diasProdutivos: mobilizacao.dias_produtivos,
        diasImprodutivos: mobilizacao.dias_improdutivos,
        custoPorDia: mobilizacao.custo_por_dia,
        distanciaBaseProjeto: mobilizacao.distancia_base_projeto,
        distanciaMediaDiaria: mobilizacao.distancia_media_diaria,
        diasChuva: mobilizacao.dias_chuva_mes,
        fatorImprodutividade: mobilizacao.fator_improdutividade,
        duracaoMeses: mobilizacao.duracao_meses,
        jornadaDiaria: mobilizacao.jornada_diaria,
        diasTrabalho: mobilizacao.dias_trabalho,
        regimeTrabalho: `${mobilizacao.dias_trabalho || 22} dias/mês, ${mobilizacao.jornada_diaria || 8}h/dia`,
        dataInicio: mobilizacao.data_inicio,
        dataFim: addMonthsISO(
          mobilizacao.data_inicio as string | null,
          Number(mobilizacao.duracao_meses || 0),
          ""
        ) || null,
        municipio: mobilizacao.municipio || undefined,
        estado: mobilizacao.estado || undefined,
        baseEndereco: mobilizacao.base_endereco || undefined,
        latitude: mobilizacao.latitude,
        longitude: mobilizacao.longitude,
        baseLatitude: mobilizacao.base_latitude,
        baseLongitude: mobilizacao.base_longitude,
        municipiosRota: Array.isArray(mobilizacao.municipios_considerados)
          ? mobilizacao.municipios_considerados as any[]
          : [],
        pluviometria: (() => {
          const pl: any = mobilizacao.pluviometria_dados;
          if (!pl) return null;
          return {
            estacao: pl.estacao?.nome,
            municipio_estacao: pl.estacao?.municipio,
            uf_estacao: pl.estacao?.uf,
            distancia_estacao_km: pl.estacao?.distancia_km,
            anos_analisados: Array.isArray(pl.anos_analisados) ? pl.anos_analisados.length : undefined,
            precipitacao_total_mm: pl.resumo?.precipitacao_total_mm,
            media_dias_chuva_mes: pl.resumo?.media_dias_chuva_mes,
            mensal: Array.isArray(pl.mensal) ? pl.mensal.map((m: any) => ({
              mes: m.mes,
              precipitacao_media: Number(m.precipitacao_media || 0),
              dias_chuva_media: Number(m.dias_chuva_media || 0),
            })) : undefined,
          };
        })(),
      } : null,
      deslocamentosPorCategoria,
      custoDeslocamentos,
      custoMobDesmob,
      deslocamentosItens: (mobilizacaoCustos || []).map((c: any) => {
        let obs: any = {};
        try { obs = JSON.parse(c.observacoes || "{}"); } catch { /* ignore */ }
        const veic = obs.veiculo_id ? (veiculosCadastrados as any[])?.find((v: any) => v.id === obs.veiculo_id) : null;
        const duracao = Number(mobilizacao?.duracao_meses || 1);
        return {
          categoria: c.categoria,
          descricao: c.descricao || undefined,
          valor_unitario: Number(c.valor_unitario || 0),
          quantidade: Number(c.quantidade || 1),
          frequencia: c.frequencia || "mensal",
          custo_total: Number(c.custo_total || 0),
          custo_mensal: duracao > 0 ? Number(c.custo_total || 0) / duracao : undefined,
          veiculo_nome: veic?.nome,
          tipo_hospedagem: obs.tipo_hospedagem,
          tipo_veiculo: obs.tipo_veiculo,
          km_dia: obs.km_dia,
          meses_hospedagem: obs.meses_hospedagem,
        };
      }),
      mobDesmobItens: (() => {
        if (!mobilizacao?.mob_desmob_itens || !Array.isArray(mobilizacao.mob_desmob_itens)) return [];
        const jornadaDiaria = Number(mobilizacao.jornada_diaria || 8);
        return mobilizacao.mob_desmob_itens.map((item: any) => {
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
          let veicNome = "";
          if (item.veiculo_id && veiculosCadastrados) {
            const veic = (veiculosCadastrados as any[])?.find((v: any) => v.id === item.veiculo_id);
            if (veic) {
              veicNome = veic.nome;
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
          return {
            municipio_saida: item.municipio_saida || "",
            estado_saida: item.estado_saida || "",
            veiculo_nome: veicNome,
            distancia_km: distancia,
            km_max_dia: kmMaxDia,
            dias_viagem: diasViagem,
            pernoites,
            quantidade_pessoas: qPessoas,
            quantidade_veiculos: qVeiculos,
            hospedagem_pernoite: hospPernoite,
            pedagios_ida: pedagiosIda,
            custo_hora_pessoa: custoHoraPessoa,
            custo_combustivel_ida: custoCombustivelIda,
            custo_pernoite_ida: custoPernoiteIda,
            custo_horas_pessoas_ida: custoHorasPessoasIda,
            custo_ida: custoIda,
            custo_total: custoIda * 2,
          };
        });
      })(),
      composicaoItens: (composicaoItens || []).map((ci: any) => {
        const comp = (composicoes || []).find((c: any) => c.id === ci.composicao_id);
        return {
          composicaoId: ci.composicao_id,
          composicaoCodigo: comp?.codigo || "",
          tipoInsumo: ci.tipo_insumo,
          descricao: ci.descricao || "",
          custoUnitario: ci.custo_unitario || 0,
          quantidade: ci.quantidade || 1,
          coeficiente: ci.coeficiente || 1,
          custoTotal: ci.custo_total || 0,
          unidade: ci.unidade || "un",
          parametros: ci.parametros || {},
        };
      }),
      numEquipes: 4,
    };

    try {
      const blob = await gerarRelatorioDocx(dadosRelatorio);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Exequibilidade_${oportunidade.codigo}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório de Exequibilidade (.docx) gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar relatório: " + e.message);
    }
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
          <Button variant="outline" className="gap-2" onClick={handleGerarRelatorio} disabled={servicosValidos.length === 0}>
            <FileDown className="w-4 h-4" /> Gerar Relatório de Exequibilidade
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          {activeStep === "servicos" && (
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/custos-servicos?oportunidade=${id}&from=orcamento`)}>
              <ExternalLink className="w-4 h-4" /> Abrir em página cheia
            </Button>
          )}
          {activeStep === "adm-local" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/mobilizacao?oportunidade=${id}&from=orcamento`)}>
              <ExternalLink className="w-4 h-4" /> Abrir em página cheia
            </Button>
          )}
          <Button className="gap-2" onClick={handleSalvar} disabled={!podesSalvar || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Orçamento
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

      {/* Banner de progresso + próximo passo */}
      {progresso.proximoPasso && progresso.proximoPasso !== activeStep && (
        <div className="print:hidden bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-medium text-primary">Próximo passo:</span>{" "}
            <span className="text-muted-foreground">{progresso.pendencias[0]}</span>
            <span className="text-xs text-muted-foreground ml-3">({progresso.percentual}% concluído)</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => setActiveStep(progresso.proximoPasso!)}
          >
            Ir para próxima etapa <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

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

      {/* ETAPA 2: Serviços (editor inline) */}
      {activeStep === "servicos" && (
        <div className="space-y-4">
          {servicosValidos.length > 0 && (
            <Card>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Resumo de Serviços
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/custos-servicos?oportunidade=${id}&from=orcamento`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir em página cheia
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Composições</span>
                    <p className="font-semibold">{servicosValidos.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Total Serviços</span>
                    <p className="font-semibold text-primary">{fmt(custoServicos)}</p>
                  </div>
                  {Object.entries(custoServicosPorTipo).slice(0, 2).map(([tipo, valor]) => {
                    const meta = TIPO_INSUMO_LABELS[tipo as keyof typeof TIPO_INSUMO_LABELS];
                    if (!meta || valor <= 0) return null;
                    return (
                      <div key={tipo}>
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <meta.icon className="w-3 h-3" /> {meta.label}
                        </span>
                        <p className="font-semibold">{fmt(valor)}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          <CustosServicosContent oportunidadeId={id!} oportunidade={oportunidade} embedded />
        </div>
      )}

      {/* ETAPA 3: ADM Local (editor inline) */}
      {activeStep === "adm-local" && (
        <div className="space-y-4">
          {mobilizacao && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  Resumo ADM Local
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Dias Produtivos</span>
                    <p className="font-semibold">{mobilizacao.dias_produtivos}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Custo/Dia</span>
                    <p className="font-semibold">{fmt(mobilizacao.custo_por_dia)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Mob/Desmob</span>
                    <p className="font-semibold">{fmt(custoMobDesmob)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Total ADM Local</span>
                    <p className="font-bold text-primary">{fmt(custoAdmLocal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <MobilizacaoContent initialOportunidadeId={id!} embedded />
        </div>
      )}

      {/* ETAPA 4: Cronograma (campo × escritório) */}
      {activeStep === "cronograma" && (
        <CronogramaPanel orcamentoId={orcamentoId} oportunidadeId={id!} />
      )}

      {/* ETAPA 5: BDI & Preço */}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate(`/bdi-dre?oportunidade=${id}&from=orcamento`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Editor completo BDI/DRE
                </Button>
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

              {/* Ajuste por Valor Final */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Target className="w-4 h-4 text-primary" />
                    Ajustar Lucro pelo Valor Final
                  </div>
                  <Button
                    variant={ajusteAtivo ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAjusteAtivo(!ajusteAtivo);
                      if (ajusteAtivo) setPrecoAlvo("");
                    }}
                  >
                    {ajusteAtivo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
                {ajusteAtivo && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground whitespace-nowrap">Preço Alvo (R$):</label>
                      <Input
                        type="number"
                        step="0.01"
                        className="max-w-xs"
                        placeholder="Ex: 8778500.00"
                        value={precoAlvo}
                        onChange={(e) => setPrecoAlvo(e.target.value)}
                      />
                    </div>
                    {parseFloat(precoAlvo) > 0 && (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-card rounded-md border p-2">
                          <p className="text-xs text-muted-foreground">Lucro Efetivo</p>
                          <p className="text-sm font-bold text-primary">{fmtPct(lucroEfetivoPct)}</p>
                        </div>
                        <div className="bg-card rounded-md border p-2">
                          <p className="text-xs text-muted-foreground">BDI Ajustado</p>
                          <p className="text-sm font-bold">{fmtPct(bdiPercentual)}</p>
                        </div>
                        <div className="bg-card rounded-md border p-2">
                          <p className="text-xs text-muted-foreground">Preço Final</p>
                          <p className="text-sm font-bold">{fmt(precoTotal)}</p>
                        </div>
                      </div>
                    )}
                    {parseFloat(precoAlvo) > 0 && lucroEfetivoPct <= 0 && (
                      <p className="text-xs text-destructive">⚠ Valor alvo resulta em margem negativa. Aumente o preço ou reduza custos.</p>
                    )}
                  </div>
                )}
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

      {/* Print: complete report with all tabs */}
      <div className="hidden print:block print-report space-y-4">

        {/* ── Section 1: Oportunidade ── */}
        <div className="print-section">
          <h2 className="print-section-title">1. Dados da Oportunidade</h2>
          <table className="print-table">
            <tbody>
              <tr><td className="print-label">Código</td><td>{oportunidade.codigo}</td></tr>
              <tr><td className="print-label">Descrição</td><td>{oportunidade.descricao}</td></tr>
              <tr><td className="print-label">Cliente</td><td>{oportunidade.clientes?.nome || "—"}</td></tr>
              <tr><td className="print-label">Local</td><td>{oportunidade.cidade || "—"}{oportunidade.estado ? ` / ${oportunidade.estado}` : ""}</td></tr>
              <tr><td className="print-label">Grupo de Serviços</td><td>{oportunidade.grupos_servicos?.nome || "—"}</td></tr>
            </tbody>
          </table>
        </div>

        {/* ── Section 2: Serviços ── */}
        <div className="print-section print-break-before">
          <h2 className="print-section-title">2. Serviços (Composições)</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th className="text-left">Composição</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">Custo Unit.</th>
                <th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {servicosValidos.map((s, idx) => {
                const comp = (composicoes || []).find((c: any) => c.id === s.composicao_id);
                const subtotal = (comp?.custo_unitario_total || 0) * s.quantidade;
                return (
                  <tr key={idx}>
                    <td>{comp?.codigo} — {comp?.nome}</td>
                    <td className="text-right">{s.quantidade} {comp?.unidade || "un"}</td>
                    <td className="text-right">{fmt(comp?.custo_unitario_total || 0)}</td>
                    <td className="text-right font-semibold">{fmt(subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="print-total-row">
                <td colSpan={3} className="text-right font-bold">Total Serviços</td>
                <td className="text-right font-bold">{fmt(custoServicos)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Breakdown por insumo */}
          {Object.keys(custoServicosPorTipo).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-1">Breakdown por Insumo</p>
              <table className="print-table print-table-sm">
                <tbody>
                  {Object.entries(TIPO_INSUMO_LABELS).map(([tipo, { label }]) => {
                    const valor = custoServicosPorTipo[tipo] || 0;
                    if (valor <= 0) return null;
                    return (
                      <tr key={tipo}>
                        <td>{label}</td>
                        <td className="text-right">{fmt(valor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Section 3: ADM Local ── */}
        <div className="print-section">
          <h2 className="print-section-title">3. ADM Local</h2>
          {mobilizacao ? (
            <div>
              <table className="print-table print-table-sm">
                <tbody>
                  <tr><td className="print-label">Projeto</td><td>{mobilizacao.nome}</td></tr>
                  <tr><td className="print-label">Dias Produtivos</td><td>{mobilizacao.dias_produtivos}</td></tr>
                  <tr><td className="print-label">Custo/Dia</td><td>{fmt(mobilizacao.custo_por_dia)}</td></tr>
                </tbody>
              </table>
              <table className="print-table print-table-sm mt-2">
                <tbody>
                  {custoMobDesmob > 0 && (
                    <tr><td>Mob / Desmob</td><td className="text-right">{fmt(custoMobDesmob)}</td></tr>
                  )}
                  {Object.entries(deslocamentosPorCategoria).map(([cat, valor]) => {
                    if (valor <= 0) return null;
                    return <tr key={cat}><td>{CATEGORIAS_DESL_LABELS[cat] || cat}</td><td className="text-right">{fmt(valor)}</td></tr>;
                  })}
                  {custoAdmLocalOutros > 0 && (
                    <tr><td>Demais custos</td><td className="text-right">{fmt(custoAdmLocalOutros)}</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="print-total-row">
                    <td className="font-bold">Total ADM Local</td>
                    <td className="text-right font-bold">{fmt(custoAdmLocal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ADM Local configurado.</p>
          )}
        </div>

        {/* ── Section 4: BDI & Preço ── */}
        <div className="print-section print-break-before">
          <h2 className="print-section-title">4. BDI & Preço de Venda</h2>

          {/* Perfil BDI */}
          {bdiData && (
            <div className="mb-3">
              <p className="text-xs font-semibold mb-1">Perfil: {bdiData.nome} — BDI: {fmtPct(bdiPercentual)}</p>
              {bdiComponentes.length > 0 && (
                <table className="print-table print-table-sm">
                  <thead><tr><th className="text-left">Componente</th><th className="text-right">%</th></tr></thead>
                  <tbody>
                    {bdiComponentes.map((comp, i) => (
                      <tr key={i}><td>{comp.nome}</td><td className="text-right">{fmtPct(comp.percentual)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Resumo consolidado */}
          <table className="print-table">
            <tbody>
              <tr><td>Subtotal Serviços</td><td className="text-right">{fmt(custoServicos)}</td></tr>
              <tr><td>Subtotal ADM Local</td><td className="text-right">{fmt(custoAdmLocal)}</td></tr>
              <tr className="print-total-row"><td className="font-bold">Custo Direto Total</td><td className="text-right font-bold">{fmt(custoTotal)}</td></tr>
              <tr><td>BDI ({fmtPct(bdiPercentual)})</td><td className="text-right">{fmt(valorBdi)}</td></tr>
            </tbody>
            <tfoot>
              <tr className="print-total-row" style={{ fontSize: "14px" }}>
                <td className="font-bold">Preço de Venda</td>
                <td className="text-right font-bold">{fmt(precoTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* DRE */}
          <div className="mt-4">
            {renderDRE(bdiComponentes, custoTotal, custoServicos, custoAdmLocal, precoTotal, bdiData, bdiPercentual)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared categorization used by BOTH pricing formula and DRE ──
type BdiComp = { nome: string; percentual: number; categoria?: string };

function categorizarComponentes(componentes: BdiComp[]) {
  const tributosReceita: BdiComp[] = [];
  const impostosLucro: BdiComp[] = [];
  const despesasIndiretas: BdiComp[] = [];
  let lucroComp: BdiComp | null = null;
  let riscoComp: BdiComp | null = null;
  let despesasPct = 0, riscoPct = 0, comissaoPct = 0, lucroPct = 0, tributosPct = 0, irPct = 0;

  for (const comp of componentes) {
    const cat = comp.categoria?.toLowerCase() || "";
    const nomeUpper = comp.nome.toUpperCase();

    if (cat === "lucro" || (!cat && nomeUpper.includes("LUCRO"))) {
      lucroPct += comp.percentual;
      lucroComp = comp;
    } else if (cat === "risco" || (!cat && nomeUpper.includes("RISCO"))) {
      riscoPct += comp.percentual;
      riscoComp = comp;
    } else if (cat === "comissao" || (!cat && nomeUpper.includes("COMISS"))) {
      comissaoPct += comp.percentual;
      despesasIndiretas.push(comp);
    } else if (cat === "ir" || (!cat && (nomeUpper.includes("IRPJ") || nomeUpper.includes("CSLL") || nomeUpper.includes("IMPOSTO DE RENDA") || nomeUpper.includes("CONTRIBUIÇÃO SOCIAL")))) {
      irPct += comp.percentual;
      impostosLucro.push(comp);
    } else if (cat === "tributo" || (!cat && (["ISS", "PIS", "COFINS", "CPRB", "ICMS"].some(t => nomeUpper.includes(t)) || nomeUpper.includes("TRIBUT")))) {
      tributosPct += comp.percentual;
      tributosReceita.push(comp);
    } else {
      despesasPct += comp.percentual;
      despesasIndiretas.push(comp);
    }
  }

  // Fallback: if no IR components found, add defaults to BOTH pricing and DRE
  if (impostosLucro.length === 0) {
    impostosLucro.push({ nome: "IRPJ (Lucro Presumido)", percentual: 4.80 });
    impostosLucro.push({ nome: "CSLL (Lucro Presumido)", percentual: 2.88 });
    irPct += 4.80 + 2.88;
  }

  return {
    tributosReceita, impostosLucro, despesasIndiretas,
    lucroComp, riscoComp,
    despesasPct, riscoPct, comissaoPct, lucroPct, tributosPct, irPct,
  };
}

// ── DRE render helper ──
function renderDRE(
  bdiComponentes: BdiComp[],
  custoTotal: number,
  custoServicos: number,
  custoAdmLocal: number,
  precoTotal: number,
  bdiData: any,
  bdiPercentual: number,
) {
  const { tributosReceita, impostosLucro, despesasIndiretas, lucroComp, riscoComp } = categorizarComponentes(bdiComponentes);

  const totalTributosPct = tributosReceita.reduce((s, c) => s + c.percentual, 0);
  const totalTributos = precoTotal * (totalTributosPct / 100);
  const totalDespIndPct = despesasIndiretas.reduce((s, c) => s + c.percentual, 0);
  const totalDespInd = custoTotal * (totalDespIndPct / 100);
  const valorRisco = riscoComp ? custoTotal * (riscoComp.percentual / 100) : 0;
  const totalImpostosLucroPct = impostosLucro.reduce((s, c) => s + c.percentual, 0);
  const totalImpostosLucro = precoTotal * (totalImpostosLucroPct / 100);
  const lucroLiquido = precoTotal - totalTributos - custoTotal - totalDespInd - valorRisco - totalImpostosLucro;
  const lucroAntesIR = lucroLiquido + totalImpostosLucro;

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
                  <span className="font-medium w-28 text-right text-destructive">-{fmt(precoTotal * (comp.percentual / 100))}</span>
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
