/**
 * Hooks de variações de serviço, templates de orçamento e parâmetros.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================================
// VARIAÇÕES DE SERVIÇO
// ============================================================================

export type ServicoVariacaoTipo = "escopo" | "complexidade";

export interface ServicoVariacao {
  id: string;
  servico_id: string;
  nome: string;
  descricao_diferenca: string | null;
  tipo: ServicoVariacaoTipo;
  composicao_id: string | null;
  multiplicador_custo: number;
  is_default: boolean;
  ordem: number;
  ativo: boolean;
}

export function useServicoVariacoes(servicoId: string | null) {
  return useQuery({
    queryKey: ["servico_variacoes", servicoId],
    enabled: !!servicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_variacoes")
        .select("*")
        .eq("servico_id", servicoId as string)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as ServicoVariacao[];
    },
  });
}

export function useTodasVariacoes() {
  return useQuery({
    queryKey: ["servico_variacoes_todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_variacoes")
        .select("*")
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as ServicoVariacao[];
    },
  });
}

export function useVariacaoMutations() {
  const qc = useQueryClient();
  const invalidate = (servicoId?: string) => {
    if (servicoId) {
      qc.invalidateQueries({ queryKey: ["servico_variacoes", servicoId] });
    }
    qc.invalidateQueries({ queryKey: ["servico_variacoes_todas"] });
  };

  const criar = useMutation({
    mutationFn: async (v: Partial<ServicoVariacao>) => {
      const { error } = await supabase.from("servico_variacoes").insert({
        servico_id: v.servico_id!,
        nome: v.nome!,
        descricao_diferenca: v.descricao_diferenca ?? null,
        tipo: v.tipo ?? "escopo",
        composicao_id: v.composicao_id ?? null,
        multiplicador_custo: v.multiplicador_custo ?? 1.0,
        is_default: v.is_default ?? false,
        ordem: v.ordem ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      invalidate(v.servico_id);
      toast.success("Variação criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServicoVariacao> }) => {
      const { error } = await supabase
        .from("servico_variacoes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Variação atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("servico_variacoes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Variação removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { criar, atualizar, remover };
}

// ============================================================================
// PARÂMETROS DO ORÇAMENTO
// ============================================================================

export interface OrcamentoParametros {
  id: string;
  orcamento_id: string;
  qtd_propriedades: number;
  extensao_km: number;
  qtd_pessoas: number;
  qtd_equipes: number;
  qtd_supervisores: number;
  dias_projeto: number;
  distancia_base_km: number;
  uf: string | null;
  municipio: string | null;
  tipo_obra: string | null;
}

export function useOrcamentoParametros(orcamentoId: string | null) {
  return useQuery({
    queryKey: ["orcamento_parametros", orcamentoId],
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_parametros")
        .select("*")
        .eq("orcamento_id", orcamentoId as string)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OrcamentoParametros | null;
    },
  });
}

export function useOrcamentoParametrosMutations(orcamentoId: string) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["orcamento_parametros", orcamentoId] });

  const salvar = useMutation({
    mutationFn: async (params: Partial<OrcamentoParametros>) => {
      const payload = {
        orcamento_id: orcamentoId,
        qtd_propriedades: params.qtd_propriedades ?? 0,
        extensao_km: params.extensao_km ?? 0,
        qtd_pessoas: params.qtd_pessoas ?? 0,
        qtd_equipes: params.qtd_equipes ?? 1,
        qtd_supervisores: params.qtd_supervisores ?? 0,
        dias_projeto: params.dias_projeto ?? 0,
        distancia_base_km: params.distancia_base_km ?? 0,
        uf: params.uf ?? null,
        municipio: params.municipio ?? null,
        tipo_obra: params.tipo_obra ?? null,
      };
      const { error } = await supabase
        .from("orcamento_parametros")
        .upsert(payload, { onConflict: "orcamento_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return { salvar };
}

// ============================================================================
// TEMPLATES DE ORÇAMENTO
// ============================================================================

export interface TemplateItemServico {
  servico_codigo: string;
  variacao_nome?: string;
  formula_quantidade: string;
  observacao?: string;
}

export interface OrcamentoTemplate {
  id: string;
  nome: string;
  tipo_obra: string;
  descricao: string | null;
  itens_servico: TemplateItemServico[];
  admin_local_template_nome: string | null;
  bdi_sugerido_id: string | null;
  parametros_padrao: Partial<OrcamentoParametros>;
  ativo: boolean;
}

export function useOrcamentoTemplates() {
  return useQuery({
    queryKey: ["orcamento_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_templates")
        .select("*")
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("tipo_obra");
      if (error) throw error;
      return (data ?? []) as unknown as OrcamentoTemplate[];
    },
  });
}

export function useTemplatesPorTipoObra(tipoObra: string | null) {
  return useQuery({
    queryKey: ["orcamento_templates", "tipo", tipoObra],
    enabled: !!tipoObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_templates")
        .select("*")
        .eq("tipo_obra", tipoObra as string)
        .is("deleted_at", null)
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []) as unknown as OrcamentoTemplate[];
    },
  });
}

export function useAplicarTemplateOrcamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orcamentoId,
      templateId,
    }: {
      orcamentoId: string;
      templateId: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "aplicar_template_orcamento" as never,
        {
          _orcamento_id: orcamentoId,
          _template_id: templateId,
        } as never
      );
      if (error) throw error;
      return data as { sucesso: boolean; itens_criados: number };
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["orcamento_itens", vars.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["orcamento", vars.orcamentoId] });
      toast.success(`Template aplicado: ${data.itens_criados} itens criados`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
