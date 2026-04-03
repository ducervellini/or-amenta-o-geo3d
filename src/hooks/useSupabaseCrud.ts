import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;

export function useSupabaseQuery<T extends TableName>(
  table: T,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    filter?: { column: string; value: unknown };
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: [table, options?.filter],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      let query = supabase
        .from(table)
        .select("*")
        .order(options?.orderBy || "created_at", {
          ascending: options?.ascending ?? false,
        });

      if (options?.filter) {
        query = query.eq(options.filter.column as string, options.filter.value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Tables[T]["Row"][];
    },
  });
}

export function useSupabaseInsert<T extends TableName>(table: T) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Tables[T]["Insert"]) => {
      const { data, error } = await supabase
        .from(table)
        .insert(values as any)
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

export function useSupabaseUpdate<T extends TableName>(table: T) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Tables[T]["Update"] }) => {
      const { data, error } = await supabase
        .from(table)
        .update(values as any)
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

export function useSupabaseDelete<T extends TableName>(table: T) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
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
