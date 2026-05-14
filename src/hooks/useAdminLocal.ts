/**
 * useAdminLocal — hook para gerenciar admin local de um orçamento
 *
 * Carrega: categorias do catálogo, itens do orçamento, agrupados por bloco.
 * Expõe: parâmetros derivados, totais por bloco, mutations para CRUD.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type AdminLocalBloco,
  type AdminLocalEscala,
  type FrequenciaEvento,
  type CategoriaCalculo,
} from "@/lib/admin-local-calculo";

export interface AdminLocalCategoria extends CategoriaCalculo {
  id: string;
  nome: string;
  descricao: string | null;
  unidade_padrao: string;
  ordem: number;
  ativo: boolean;
  valor_referencia_data: string;
}

export interface AdminLocalItem {
  id: string;
  orcamento_id: string;
  categoria_id: string;
  categoria?: AdminLocalCategoria;
  nome_customizado: string | null;
  escala_aplicada: AdminLocalEscala;
  quantidade: number;
  quantidade_manual: boolean;
  valor_unitario: number;
  valor_unitario_manual: boolean;
  frequencia_evento: FrequenciaEvento | null;
  cargo_id: string | null;
  dedicacao_percentual: number;
  total: number;
  observacao: string | null;
  ordem: number;
}

export function useAdminLocalCategorias() {
  return useQuery({
    queryKey: ["admin_local_categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_local_categorias")
        .select("*")
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("bloco")
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as AdminLocalCategoria[];
    },
  });
}

export function useAdminLocalItens(orcamentoId: string) {
  return useQuery({
    queryKey: ["admin_local_itens", orcamentoId],
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_local_itens")
        .select("*, categoria:admin_local_categorias(*)")
        .eq("orcamento_id", orcamentoId)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as AdminLocalItem[];
    },
  });
}

export function useAdminLocalAgrupado(orcamentoId: string) {
  const { data: itens, isLoading } = useAdminLocalItens(orcamentoId);

  const agrupado = useMemo(() => {
    const grupos: Record<AdminLocalBloco, AdminLocalItem[]> = {
      mobilizacao_desmobilizacao: [],
      permanencia: [],
      supervisao: [],
    };
    const totais: Record<AdminLocalBloco | "total", number> = {
      mobilizacao_desmobilizacao: 0,
      permanencia: 0,
      supervisao: 0,
      total: 0,
    };
    (itens ?? []).forEach((item) => {
      const bloco = item.categoria?.bloco;
      if (!bloco) return;
      grupos[bloco].push(item);
      totais[bloco] += Number(item.total);
      totais.total += Number(item.total);
    });
    return { grupos, totais };
  }, [itens]);

  return { ...agrupado, isLoading };
}

export function useAdminLocalMutations(orcamentoId: string) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin_local_itens", orcamentoId] });

  const adicionarItem = useMutation({
    mutationFn: async (item: Partial<AdminLocalItem>) => {
      const { error } = await supabase
        .from("admin_local_itens")
        .insert({
          orcamento_id: orcamentoId,
          categoria_id: item.categoria_id,
          escala_aplicada: item.escala_aplicada,
          quantidade: item.quantidade ?? 0,
          valor_unitario: item.valor_unitario ?? 0,
          frequencia_evento: item.frequencia_evento ?? null,
          cargo_id: item.cargo_id ?? null,
          dedicacao_percentual: item.dedicacao_percentual ?? 100,
          observacao: item.observacao ?? null,
          ordem: item.ordem ?? 0,
        });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const atualizarItem = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AdminLocalItem>;
    }) => {
      const { error } = await supabase
        .from("admin_local_itens")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removerItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_local_itens")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { adicionarItem, atualizarItem, removerItem };
}

export function useAplicarTemplate(orcamentoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateNome: string) => {
      // 1. Buscar template
      const { data: template, error: e1 } = await supabase
        .from("admin_local_templates")
        .select("*")
        .eq("nome", templateNome)
        .is("deleted_at", null)
        .single();
      if (e1) throw e1;
      if (!template) throw new Error("Template não encontrado");

      // 2. Buscar categorias usadas no template
      const codigos = (template.itens_padrao as Array<{ categoria_codigo: string }>).map(
        (i) => i.categoria_codigo
      );
      const { data: categorias, error: e2 } = await supabase
        .from("admin_local_categorias")
        .select("*")
        .in("codigo", codigos)
        .is("deleted_at", null);
      if (e2) throw e2;

      const mapaCategorias = new Map(
        (categorias ?? []).map((c) => [
          (c as { codigo: string }).codigo,
          c as unknown as AdminLocalCategoria,
        ])
      );

      // 3. Criar itens conforme template
      const itensPayload = (
        template.itens_padrao as Array<{
          categoria_codigo: string;
          frequencia_evento?: FrequenciaEvento;
          observacao?: string;
        }>
      )
        .map((tmplItem, idx) => {
          const cat = mapaCategorias.get(tmplItem.categoria_codigo);
          if (!cat) return null;
          return {
            orcamento_id: orcamentoId,
            categoria_id: cat.id,
            escala_aplicada: cat.escala_padrao,
            quantidade: 0,
            valor_unitario: cat.valor_referencia,
            frequencia_evento:
              tmplItem.frequencia_evento ?? cat.frequencia_evento_padrao ?? null,
            dedicacao_percentual: 100,
            observacao: tmplItem.observacao ?? null,
            ordem: idx,
          };
        })
        .filter(Boolean);

      const { error: e3 } = await supabase
        .from("admin_local_itens")
        .insert(itensPayload);
      if (e3) throw e3;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin_local_itens", orcamentoId] }),
  });
}

export function useAdminCentralVigente(data?: Date) {
  const targetDate = data ?? new Date();
  const isoDate = targetDate.toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["admin_central_vigente", isoDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_admin_central_percentual" as never,
        { _data: isoDate } as never
      );
      if (error) throw error;
      return (data as number | null) ?? null;
    },
  });
}
