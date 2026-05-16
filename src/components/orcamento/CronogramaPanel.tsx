import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Save, Loader2, GripVertical, Info, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { cn, safeNumber } from "@/lib/utils";
import {
  calcularCronograma,
  type CronogramaServicoInput,
  type CronogramaResultado,
} from "@/lib/cronograma-calculo";

interface Props {
  orcamentoId: string | null;
  oportunidadeId: string;
}

interface Row {
  composicaoId: string;
  numEquipes: number;
  dataInicioOverride: string | null;
  ordem: number;
}

export function CronogramaPanel({ orcamentoId, oportunidadeId }: Props) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState(false);

  // Itens de serviço do orçamento (composições selecionadas)
  const { data: itensServico } = useQuery({
    queryKey: ["cronograma-itens-servico", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data, error } = await (supabase.from as any)("orcamento_itens_servico")
        .select("composicao_id, quantidade")
        .eq("orcamento_id", orcamentoId);
      if (error) throw error;
      return data as { composicao_id: string; quantidade: number }[];
    },
    enabled: !!orcamentoId,
    staleTime: 30_000,
  });

  const composicaoIds = useMemo(
    () => (itensServico || []).map((i) => i.composicao_id),
    [itensServico],
  );

  const { data: composicoes } = useQuery({
    queryKey: ["cronograma-composicoes", composicaoIds],
    queryFn: async () => {
      if (!composicaoIds.length) return [];
      const { data, error } = await (supabase.from as any)("composicoes")
        .select("id, codigo, nome, unidade, ordem_id, servico_id")
        .in("id", composicaoIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: composicaoIds.length > 0,
    staleTime: 30_000,
  });

  const { data: servicosCadastro } = useQuery({
    queryKey: ["cronograma-servicos-cadastro", composicoes?.map((c: any) => c.servico_id).join(",")],
    queryFn: async () => {
      const ids = (composicoes || []).map((c: any) => c.servico_id).filter(Boolean);
      if (!ids.length) return [];
      const { data, error } = await (supabase.from as any)("servicos")
        .select("id, produtividade_padrao, unidade_tempo_produtividade")
        .in("id", ids);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!composicoes?.length,
    staleTime: 30_000,
  });

  const { data: composicaoItens } = useQuery({
    queryKey: ["cronograma-composicao-itens", composicaoIds],
    queryFn: async () => {
      if (!composicaoIds.length) return [];
      const { data, error } = await (supabase.from as any)("composicao_itens")
        .select("composicao_id, tipo_insumo, insumo_id, quantidade, coeficiente")
        .in("composicao_id", composicaoIds)
        .eq("tipo_insumo", "mao_de_obra");
      if (error) throw error;
      return data as any[];
    },
    enabled: composicaoIds.length > 0,
    staleTime: 30_000,
  });

  const cargoIds = useMemo(
    () => Array.from(new Set((composicaoItens || []).map((ci: any) => ci.insumo_id).filter(Boolean))),
    [composicaoItens],
  );

  const { data: cargos } = useQuery({
    queryKey: ["cronograma-cargos", cargoIds],
    queryFn: async () => {
      if (!cargoIds.length) return [];
      const { data, error } = await (supabase.from as any)("cargos")
        .select("id, local_trabalho")
        .in("id", cargoIds);
      if (error) throw error;
      return data as { id: string; local_trabalho: string }[];
    },
    enabled: cargoIds.length > 0,
    staleTime: 30_000,
  });

  const { data: mobilizacao } = useQuery({
    queryKey: ["cronograma-mobilizacao", oportunidadeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("mobilizacoes")
        .select("id, data_inicio, jornada_diaria, dias_trabalho, fator_improdutividade, duracao_meses")
        .eq("oportunidade_id", oportunidadeId)
        .eq("ativo", true)
        .limit(1);
      if (error) throw error;
      return (data as any[])?.[0] || null;
    },
    enabled: !!oportunidadeId,
    staleTime: 30_000,
  });

  // Cronograma persistido
  const { data: cronogramaPersistido } = useQuery({
    queryKey: ["cronograma-itens", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data, error } = await (supabase.from as any)("orcamento_cronograma_itens")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .eq("ativo", true);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orcamentoId,
    staleTime: 30_000,
  });

  // Inicializa rows quando os dados chegam
  useEffect(() => {
    if (!composicoes) return;
    const persistMap = new Map<string, any>(
      (cronogramaPersistido || []).map((p: any) => [p.composicao_id, p]),
    );
    const next: Record<string, Row> = {};
    composicoes.forEach((c: any, idx: number) => {
      const p = persistMap.get(c.id);
      next[c.id] = {
        composicaoId: c.id,
        numEquipes: p?.num_equipes ?? 1,
        dataInicioOverride: p?.data_inicio_override ?? null,
        ordem: p?.ordem ?? idx,
      };
    });
    setRows(next);
  }, [composicoes, cronogramaPersistido]);

  // Horas de mão de obra por composição × local (campo/escritório)
  const horasPorComposicao = useMemo(() => {
    const map = new Map<string, { campo: number; escritorio: number }>();
    if (!composicaoItens || !cargos) return map;
    const localById = new Map<string, string>(cargos.map((c) => [c.id, c.local_trabalho || "campo"]));
    for (const ci of composicaoItens) {
      const h = safeNumber(ci.coeficiente, 1) * safeNumber(ci.quantidade, 1);
      const local = localById.get(ci.insumo_id) || "campo";
      const cur = map.get(ci.composicao_id) || { campo: 0, escritorio: 0 };
      if (local === "escritorio") cur.escritorio += h;
      else cur.campo += h;
      map.set(ci.composicao_id, cur);
    }
    return map;
  }, [composicaoItens, cargos]);

  const cronograma: CronogramaResultado | null = useMemo(() => {
    if (!composicoes?.length || !mobilizacao || !itensServico) return null;
    const qtdMap = new Map<string, number>(itensServico.map((i) => [i.composicao_id, i.quantidade]));
    const inputs: CronogramaServicoInput[] = composicoes
      .filter((c: any) => (qtdMap.get(c.id) || 0) > 0)
      .map((c: any) => {
        const svc = (servicosCadastro || []).find((s: any) => s.id === c.servico_id);
        const horas = horasPorComposicao.get(c.id) || { campo: 0, escritorio: 0 };
        const row = rows[c.id];
        return {
          composicaoId: c.id,
          composicaoCodigo: c.codigo,
          composicaoNome: c.nome,
          unidade: c.unidade,
          quantidade: qtdMap.get(c.id) || 0,
          produtividadePadrao: svc?.produtividade_padrao ?? null,
          unidadeTempoProdutividade: svc?.unidade_tempo_produtividade ?? "dia",
          horasCampo: horas.campo,
          horasEscritorio: horas.escritorio,
          numEquipes: row?.numEquipes ?? 1,
          dataInicioOverride: row?.dataInicioOverride ?? null,
          ordem: row?.ordem ?? 0,
        };
      });
    return calcularCronograma(inputs, {
      dataInicioProjeto: mobilizacao.data_inicio || new Date().toISOString().split("T")[0],
      jornadaDiaria: safeNumber(mobilizacao.jornada_diaria, 8),
      diasUteisMes: safeNumber(mobilizacao.dias_trabalho, 22),
      fatorImprodutividade: safeNumber(mobilizacao.fator_improdutividade, 0),
    });
  }, [composicoes, mobilizacao, itensServico, servicosCadastro, horasPorComposicao, rows]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSalvar = async () => {
    if (!orcamentoId) {
      toast.error("Salve o orçamento primeiro (aba Serviços).");
      return;
    }
    setSaving(true);
    try {
      // Estratégia simples: deleta os existentes e insere os atuais
      await (supabase.from as any)("orcamento_cronograma_itens")
        .delete()
        .eq("orcamento_id", orcamentoId);

      const toInsert = Object.values(rows).map((r) => ({
        orcamento_id: orcamentoId,
        composicao_id: r.composicaoId,
        num_equipes: r.numEquipes,
        data_inicio_override: r.dataInicioOverride,
        ordem: r.ordem,
      }));
      if (toInsert.length) {
        const { error } = await (supabase.from as any)("orcamento_cronograma_itens").insert(toInsert);
        if (error) throw error;
      }
      toast.success("Cronograma salvo.");
      queryClient.invalidateQueries({ queryKey: ["cronograma-itens", orcamentoId] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicarMobilizacao = async () => {
    if (!mobilizacao?.id || !cronograma) return;
    if (cronograma.duracaoMeses <= 0) {
      toast.error("Cronograma sem duração calculada.");
      return;
    }
    try {
      const { error } = await (supabase.from as any)("mobilizacoes")
        .update({ duracao_meses: cronograma.duracaoMeses })
        .eq("id", mobilizacao.id);
      if (error) throw error;
      toast.success(`Duração da Mobilização atualizada para ${cronograma.duracaoMeses} meses.`);
      queryClient.invalidateQueries({ queryKey: ["cronograma-mobilizacao", oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-mobilizacao"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // ───── Render ─────

  if (!orcamentoId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Salve o orçamento (aba Serviços) para configurar o cronograma.
        </CardContent>
      </Card>
    );
  }

  if (!mobilizacao) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Configure a Mobilização (data de início e jornada) antes do cronograma.
        </CardContent>
      </Card>
    );
  }

  if (!cronograma || !cronograma.itens.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Adicione composições com quantidade na aba Serviços para gerar o cronograma.
        </CardContent>
      </Card>
    );
  }

  const inicioTs = new Date(cronograma.inicioGeral).getTime();
  const fimTs = new Date(cronograma.fimGeral).getTime();
  const range = Math.max(1, fimTs - inicioTs);

  const divergenciaMobilizacao = mobilizacao.duracao_meses !== cronograma.duracaoMeses;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Cronograma de Execução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Início</div>
              <div className="font-semibold">{new Date(cronograma.inicioGeral).toLocaleDateString("pt-BR")}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Fim</div>
              <div className="font-semibold">{new Date(cronograma.fimGeral).toLocaleDateString("pt-BR")}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Duração</div>
              <div className="font-semibold">{cronograma.duracaoDias} dias · {cronograma.duracaoMeses} meses</div>
            </div>
            <div className={cn("rounded-md border p-3", divergenciaMobilizacao && "border-amber-400 bg-amber-50 dark:bg-amber-950/30")}>
              <div className="text-xs text-muted-foreground">Mobilização</div>
              <div className="font-semibold">{mobilizacao.duracao_meses} meses</div>
              {divergenciaMobilizacao && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-2 h-7 text-xs"
                  onClick={handleAplicarMobilizacao}
                >
                  <ArrowDownToLine className="w-3 h-3" /> Aplicar
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Sequencial pela ordem dos serviços. Campo (azul) e Escritório (âmbar) ocorrem em paralelo dentro de cada serviço.
            Edite "Equipes" ou "Início" para customizar.
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-sm">Serviços do Cronograma</CardTitle>
          <Button onClick={handleSalvar} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar Cronograma
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y">
                <tr className="text-xs">
                  <th className="text-left px-3 py-2 font-semibold">#</th>
                  <th className="text-left px-3 py-2 font-semibold">Serviço</th>
                  <th className="text-right px-3 py-2 font-semibold">Qtd</th>
                  <th className="text-center px-3 py-2 font-semibold">Equipes</th>
                  <th className="text-right px-3 py-2 font-semibold">Dias úteis</th>
                  <th className="text-right px-3 py-2 font-semibold">Dias corridos</th>
                  <th className="text-center px-3 py-2 font-semibold">Início</th>
                  <th className="text-center px-3 py-2 font-semibold">Fim</th>
                  <th className="text-center px-3 py-2 font-semibold w-[35%]">Linha do tempo</th>
                </tr>
              </thead>
              <tbody>
                {cronograma.itens.map((it, idx) => {
                  const startTs = new Date(it.dataInicio).getTime();
                  const endTs = new Date(it.dataFim).getTime();
                  const leftPct = ((startTs - inicioTs) / range) * 100;
                  const widthPct = Math.max(1.5, ((endTs - startTs) / range) * 100);
                  const row = rows[it.composicaoId];
                  return (
                    <tr key={it.composicaoId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3 h-3 opacity-50" />
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs">{it.composicaoCodigo}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{it.composicaoNome}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {it.quantidade} {it.unidade}
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-7 w-16 text-center text-xs"
                          value={row?.numEquipes ?? 1}
                          onChange={(e) =>
                            updateRow(it.composicaoId, { numEquipes: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{it.diasBrutos}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-semibold">{it.diasEfetivos}</td>
                      <td className="px-2 py-1">
                        <Input
                          type="date"
                          className={cn("h-7 w-32 text-xs", it.inicioOverride && "border-primary")}
                          value={it.dataInicio}
                          onChange={(e) =>
                            updateRow(it.composicaoId, { dataInicioOverride: e.target.value || null })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-xs tabular-nums">
                        {new Date(it.dataFim).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative h-8 bg-muted/30 rounded">
                          <div
                            className="absolute h-3.5 top-0.5 bg-primary/70 rounded-sm"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct * it.propCampo}%`,
                            }}
                            title={`Campo: ${(it.propCampo * 100).toFixed(0)}%`}
                          />
                          <div
                            className="absolute h-3.5 bottom-0.5 bg-amber-500/70 rounded-sm"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct * it.propEscritorio}%`,
                            }}
                            title={`Escritório: ${(it.propEscritorio * 100).toFixed(0)}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                          <span>Campo {(it.propCampo * 100).toFixed(0)}%</span>
                          <span>Escritório {(it.propEscritorio * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Separator />
          <div className="px-4 py-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary/70 rounded-sm" /> Campo
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-amber-500/70 rounded-sm" /> Escritório
            </div>
            <Badge variant="outline" className="text-[10px] ml-auto">
              Improdutividade aplicada: {((mobilizacao.fator_improdutividade || 0) * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
