/**
 * Hooks de benchmark histórico
 *
 * Lê das views criadas no Sprint 5B:
 *   - v_orcamentos_benchmark (lista plana com filtros)
 *   - v_benchmark_distribuicao_tipo_obra (estatísticas agregadas)
 *   - buscar_orcamentos_similares (RPC)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BenchmarkOrcamento {
  orcamento_id: string;
  descricao: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  status_orcamento: string;
  estagio_pipeline: string | null;
  valor_previsto: number | null;
  tipo_obra_oportunidade: string | null;
  tipo_obra_parametros: string | null;
  qtd_propriedades: number | null;
  extensao_km: number | null;
  qtd_pessoas: number | null;
  qtd_equipes: number | null;
  dias_projeto: number | null;
  distancia_base_km: number | null;
  uf: string | null;
  municipio: string | null;
  custo_servicos: number;
  custo_admin_local: number;
  preco_total: number;
  bdi_percentual: number;
  preco_por_unidade: number;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkDistribuicao {
  tipo_obra: string;
  total_orcamentos: number;
  ganhos: number;
  perdidos: number;
  preco_medio: number | null;
  preco_p25: number | null;
  preco_mediana: number | null;
  preco_p75: number | null;
  preco_min: number | null;
  preco_max: number | null;
  prazo_medio_dias: number | null;
  qtd_propriedades_media: number | null;
  extensao_km_media: number | null;
}

export interface BenchmarkFiltros {
  tipo_obra?: string;
  estagio?: string;
  uf?: string;
  cliente_id?: string;
  ano_de?: number;
  ano_ate?: number;
}

export function useBenchmarkOrcamentos(filtros: BenchmarkFiltros = {}) {
  return useQuery({
    queryKey: ["benchmark_orcamentos", filtros],
    queryFn: async () => {
      let q = supabase
        .from("v_orcamentos_benchmark" as never)
        .select("*");

      if (filtros.tipo_obra) {
        q = (q as never as { or: (s: string) => typeof q }).or(
          `tipo_obra_parametros.eq.${filtros.tipo_obra},tipo_obra_oportunidade.eq.${filtros.tipo_obra}`
        );
      }
      if (filtros.estagio) {
        q = (q as never as { eq: (c: string, v: string) => typeof q }).eq(
          "estagio_pipeline",
          filtros.estagio
        );
      }
      if (filtros.uf) {
        q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("uf", filtros.uf);
      }
      if (filtros.cliente_id) {
        q = (q as never as { eq: (c: string, v: string) => typeof q }).eq(
          "cliente_id",
          filtros.cliente_id
        );
      }
      if (filtros.ano_de) {
        q = (q as never as { gte: (c: string, v: string) => typeof q }).gte(
          "created_at",
          `${filtros.ano_de}-01-01`
        );
      }
      if (filtros.ano_ate) {
        q = (q as never as { lte: (c: string, v: string) => typeof q }).lte(
          "created_at",
          `${filtros.ano_ate}-12-31`
        );
      }

      const { data, error } = await (
        q as never as {
          order: (
            c: string,
            o: { ascending: boolean }
          ) => Promise<{ data: unknown; error: unknown }>;
        }
      ).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BenchmarkOrcamento[];
    },
  });
}

export function useBenchmarkDistribuicao() {
  return useQuery({
    queryKey: ["benchmark_distribuicao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_benchmark_distribuicao_tipo_obra" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as BenchmarkDistribuicao[];
    },
  });
}

export interface OrcamentoSimilar {
  orcamento_id: string;
  cliente_nome: string;
  tipo_obra: string;
  qtd_propriedades: number;
  extensao_km: number;
  dias_projeto: number;
  custo_total: number;
  preco_por_unidade: number;
  status_orcamento: string;
  estagio_pipeline: string;
  similaridade_score: number;
}

export function useOrcamentosSimilares(orcamentoId: string | null, limit = 5) {
  return useQuery({
    queryKey: ["orcamentos_similares", orcamentoId, limit],
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "buscar_orcamentos_similares" as never,
        {
          _orcamento_id: orcamentoId,
          _limit: limit,
        } as never
      );
      if (error) throw error;
      return (data ?? []) as unknown as OrcamentoSimilar[];
    },
  });
}
