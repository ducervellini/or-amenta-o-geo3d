import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSupabaseQuery(
  table: string,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    filter?: { column: string; value: unknown };
    filters?: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: [table, options?.filter, options?.filters],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      let query = (supabase.from as any)(table)
        .select("*")
        .order(options?.orderBy || "created_at", {
          ascending: options?.ascending ?? false,
        });

      if (options?.filter) {
        query = query.eq(options.filter.column, options.filter.value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });
}

export function useSupabaseInsert(table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data, error } = await (supabase.from as any)(table)
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Registro criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar registro: " + error.message);
    },
  });
}

export function useSupabaseUpdate(table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { data, error } = await (supabase.from as any)(table)
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Registro atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useSupabaseDelete(table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Registro removido");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });
}
