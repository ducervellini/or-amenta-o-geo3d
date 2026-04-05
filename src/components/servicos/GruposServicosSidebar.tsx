import { useState } from "react";
import { Plus, Trash2, FolderOpen, ChevronRight, ChevronDown, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GruposServicosSidebar({ servicos }: { servicos: Record<string, unknown>[] }) {
  const [novoGrupo, setNovoGrupo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  const queryClient = useQueryClient();
  const { data: grupos } = useSupabaseQuery("grupos_servicos", { orderBy: "nome", ascending: true });
  const { data: vinculos } = useSupabaseQuery("grupos_servicos_servicos");
  const insertGrupo = useSupabaseInsert("grupos_servicos");
  const deleteGrupo = useSupabaseDelete("grupos_servicos");

  const updateGrupoNome = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await (supabase.from as any)("grupos_servicos")
        .update({ nome }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos_servicos"] });
      toast.success("Grupo renomeado");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const addVinculo = useMutation({
    mutationFn: async ({ grupo_id, servico_id }: { grupo_id: string; servico_id: string }) => {
      const { error } = await (supabase.from as any)("grupos_servicos_servicos")
        .insert({ grupo_id, servico_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos_servicos_servicos"] });
      toast.success("Serviço adicionado ao grupo");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeVinculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("grupos_servicos_servicos")
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos_servicos_servicos"] });
      toast.success("Serviço removido do grupo");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const handleCriarGrupo = () => {
    if (!novoGrupo.trim()) return;
    insertGrupo.mutate({ nome: novoGrupo.trim() } as any, {
      onSuccess: () => setNovoGrupo(""),
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editingNome.trim()) return;
    updateGrupoNome.mutate({ id, nome: editingNome.trim() });
  };

  const getServicosDoGrupo = (grupoId: string) => {
    const ids = (vinculos || []).filter((v) => v.grupo_id === grupoId);
    return ids.map((v) => ({
      vinculoId: String(v.id),
      servico: servicos.find((s) => s.id === v.servico_id),
    })).filter((x) => x.servico);
  };

  const getServicosDisponiveis = (grupoId: string) => {
    const idsNoGrupo = (vinculos || []).filter((v) => v.grupo_id === grupoId).map((v) => v.servico_id);
    return servicos.filter((s) => !idsNoGrupo.includes(s.id));
  };

  return (
    <div className="w-72 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-3">Grupos de Serviços</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Nome do grupo..."
            value={novoGrupo}
            onChange={(e) => setNovoGrupo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCriarGrupo()}
            className="text-xs h-8"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleCriarGrupo} disabled={!novoGrupo.trim()}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {(grupos || []).map((g) => {
          const isExpanded = expandedId === g.id;
          const isEditing = editingId === g.id;
          const servicosGrupo = getServicosDoGrupo(String(g.id));
          return (
            <div key={String(g.id)} className="border rounded-lg">
              <div
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 text-sm"
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : String(g.id))}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                {isEditing ? (
                  <Input
                    value={editingNome}
                    onChange={(e) => setEditingNome(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") handleSaveEdit(String(g.id));
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs h-6 flex-1"
                    autoFocus
                  />
                ) : (
                  <span className="truncate font-medium flex-1">{String(g.nome)}</span>
                )}
                <Badge variant="secondary" className="text-[10px] h-5">{servicosGrupo.length}</Badge>
                {isEditing ? (
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 text-primary shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(String(g.id)); }}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setEditingId(String(g.id)); setEditingNome(String(g.nome)); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); setDeletingId(String(g.id)); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {servicosGrupo.map(({ vinculoId, servico }) => (
                    <div key={vinculoId} className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
                      <span className="font-mono text-[10px] text-accent shrink-0">{servico!.ordem_id ? String(servico!.ordem_id) : "-"}</span>
                      <span className="truncate flex-1">{String(servico!.codigo)} - {String(servico!.nome)}</span>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => removeVinculo.mutate(vinculoId)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {addingTo === String(g.id) ? (
                    <select
                      className="w-full text-xs border rounded p-1 bg-background mt-1"
                      autoFocus
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addVinculo.mutate({ grupo_id: String(g.id), servico_id: e.target.value });
                        }
                      }}
                      onBlur={() => setAddingTo(null)}
                    >
                      <option value="">Selecionar serviço...</option>
                      {getServicosDisponiveis(String(g.id)).map((s) => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {s.ordem_id ? String(s.ordem_id) + " - " : ""}{String(s.codigo)} - {String(s.nome)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Button
                      variant="ghost" size="sm" className="h-6 text-xs w-full mt-1"
                      onClick={() => setAddingTo(String(g.id))}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Adicionar serviço
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {(!grupos || grupos.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum grupo criado</p>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover grupo?</AlertDialogTitle>
            <AlertDialogDescription>Os serviços não serão excluídos, apenas o agrupamento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) deleteGrupo.mutate(deletingId, { onSuccess: () => setDeletingId(null) }); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
