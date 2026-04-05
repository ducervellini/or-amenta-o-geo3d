import { useState, useMemo } from "react";
import { Plus, Trash2, FolderOpen, ChevronRight, ChevronDown, X, Pencil, Check, Copy } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GruposServicos() {
  const [novoGrupo, setNovoGrupo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  const queryClient = useQueryClient();
  const { data: grupos } = useSupabaseQuery("grupos_servicos", { orderBy: "nome", ascending: true });
  const { data: vinculos } = useSupabaseQuery("grupos_servicos_servicos");
  const { data: servicos } = useSupabaseQuery("servicos", { orderBy: "ordem_id", ascending: true });
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: modulos } = useSupabaseQuery("modulos");
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

  const copyGrupo = useMutation({
    mutationFn: async (grupoId: string) => {
      const grupo = grupos?.find((g) => g.id === grupoId);
      if (!grupo) throw new Error("Grupo não encontrado");

      const { data: novoGrupoData, error: insertError } = await (supabase.from as any)("grupos_servicos")
        .insert({ nome: `${String(grupo.nome)} (cópia)` })
        .select()
        .single();
      if (insertError) throw insertError;

      const vinculosGrupo = (vinculos || []).filter((v) => v.grupo_id === grupoId);
      if (vinculosGrupo.length > 0) {
        const novosVinculos = vinculosGrupo.map((v) => ({
          grupo_id: novoGrupoData.id,
          servico_id: v.servico_id,
        }));
        const { error: vinculoError } = await (supabase.from as any)("grupos_servicos_servicos")
          .insert(novosVinculos);
        if (vinculoError) throw vinculoError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos_servicos"] });
      queryClient.invalidateQueries({ queryKey: ["grupos_servicos_servicos"] });
      toast.success("Grupo copiado com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao copiar: " + e.message),
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
      servico: (servicos || []).find((s) => s.id === v.servico_id),
    })).filter((x) => x.servico);
  };

  const getServicosDisponiveis = (grupoId: string) => {
    const idsNoGrupo = (vinculos || []).filter((v) => v.grupo_id === grupoId).map((v) => v.servico_id);
    return (servicos || []).filter((s) => !idsNoGrupo.includes(s.id));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Grupos de Serviços</h1>
        <p className="text-muted-foreground text-sm">Organize serviços em grupos para facilitar a composição de orçamentos</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Criar novo grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Nome do grupo..."
              value={novoGrupo}
              onChange={(e) => setNovoGrupo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarGrupo()}
            />
            <Button onClick={handleCriarGrupo} disabled={!novoGrupo.trim()}>
              <Plus className="w-4 h-4 mr-2" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {(grupos || []).map((g) => {
          const isExpanded = expandedId === g.id;
          const isEditing = editingId === g.id;
          const servicosGrupo = getServicosDoGrupo(String(g.id));

          return (
            <Card key={String(g.id)}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : String(g.id))}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                <FolderOpen className="w-4 h-4 text-accent shrink-0" />

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
                    className="h-8 max-w-xs"
                    autoFocus
                  />
                ) : (
                  <span className="font-medium flex-1">{String(g.nome)}</span>
                )}

                <Badge variant="secondary">{servicosGrupo.length} serviço{servicosGrupo.length !== 1 ? "s" : ""}</Badge>

                {isEditing ? (
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-primary"
                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(String(g.id)); }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setEditingId(String(g.id)); setEditingNome(String(g.nome)); }}
                      title="Editar nome"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); copyGrupo.mutate(String(g.id)); }}
                      title="Copiar grupo"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(String(g.id)); }}
                      title="Remover grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              {isExpanded && (
                <GrupoServicosTable
                  servicosGrupo={servicosGrupo}
                  servicosDisponiveis={getServicosDisponiveis(String(g.id))}
                  grupoId={String(g.id)}
                  addingTo={addingTo}
                  setAddingTo={setAddingTo}
                  onAddVinculo={(servicoId) => addVinculo.mutate({ grupo_id: String(g.id), servico_id: servicoId })}
                  onRemoveVinculo={(vinculoId) => removeVinculo.mutate(vinculoId)}
                  mercados={mercados}
                  areasEmpresa={areasEmpresa}
                  modulos={modulos}
                />
              )}
            </Card>
          );
        })}

        {(!grupos || grupos.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Nenhum grupo criado. Crie o primeiro grupo acima.
            </CardContent>
          </Card>
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

interface GrupoServicosTableProps {
  servicosGrupo: { vinculoId: string; servico: Record<string, unknown> | undefined }[];
  servicosDisponiveis: Record<string, unknown>[];
  grupoId: string;
  addingTo: string | null;
  setAddingTo: (id: string | null) => void;
  onAddVinculo: (servicoId: string) => void;
  onRemoveVinculo: (vinculoId: string) => void;
  mercados?: Record<string, unknown>[] | null;
  areasEmpresa?: Record<string, unknown>[] | null;
  modulos?: Record<string, unknown>[] | null;
}

function GrupoServicosTable({
  servicosGrupo, servicosDisponiveis, grupoId,
  addingTo, setAddingTo, onAddVinculo, onRemoveVinculo,
  mercados, areasEmpresa, modulos,
}: GrupoServicosTableProps) {
  const tableData = useMemo(() =>
    servicosGrupo.filter((x) => x.servico).map(({ vinculoId, servico }) => ({
      vinculoId,
      ordem_id: String(servico!.ordem_id || ""),
      codigo: String(servico!.codigo || ""),
      nome: String(servico!.nome || ""),
      mercado_id: String(servico!.mercado_id || ""),
      area_empresa_id: String(servico!.area_empresa_id || ""),
      modulo_id: String(servico!.modulo_id || ""),
      unidade_medicao: String(servico!.unidade_medicao || ""),
    })),
    [servicosGrupo]
  );

  const { sorted, sortKey, sortDirection, handleSort } = useTableSort(tableData, "ordem_id");
  const colKeys = ["ordem_id", "codigo", "nome", "mercado_id", "area_empresa_id", "modulo_id", "unidade_medicao"];
  const { getHeaderProps } = useColumnResize(colKeys);

  const getMercadoNome = (id: string) => {
    const m = (mercados || []).find((m) => m.id === id);
    return m ? String(m.nome) : "-";
  };
  const getAreaNome = (id: string) => {
    const a = (areasEmpresa || []).find((a) => a.id === id);
    return a ? String(a.nome) : "-";
  };
  const getModuloNome = (id: string) => {
    const d = (modulos || []).find((d) => d.id === id);
    return d ? String(d.nome) : "-";
  };

  return (
    <div className="border-t">
      {sorted.length === 0 ? (
        <div className="px-4 py-4 text-sm text-muted-foreground">Nenhum serviço neste grupo</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {[
                { label: "ID", key: "ordem_id" },
                { label: "Código", key: "codigo" },
                { label: "Nome", key: "nome" },
                { label: "Mercado", key: "mercado_id" },
                { label: "Área", key: "area_empresa_id" },
                { label: "Departamento", key: "modulo_id" },
                { label: "Unidade", key: "unidade_medicao" },
              ].map((col) => {
                const hp = getHeaderProps(col.key);
                return (
                  <SortableHeader key={col.key} label={col.label} sortKey={col.key} currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} style={hp.style} onResizeStart={hp.onResizeStart} />
                );
              })}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.vinculoId}>
                <TableCell className="font-mono text-xs font-semibold">{row.ordem_id || "-"}</TableCell>
                <TableCell className="font-medium text-accent">{row.codigo}</TableCell>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell className="text-sm">{getMercadoNome(row.mercado_id)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {getAreaNome(row.area_empresa_id)}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{getModuloNome(row.modulo_id)}</TableCell>
                <TableCell className="text-sm">{row.unidade_medicao || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveVinculo(row.vinculoId)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="px-4 pb-3 pt-2">
        {addingTo === grupoId ? (
          <select
            className="w-full max-w-md text-sm border rounded p-2 bg-background"
            autoFocus
            value=""
            onChange={(e) => { if (e.target.value) onAddVinculo(e.target.value); }}
            onBlur={() => setAddingTo(null)}
          >
            <option value="">Selecionar serviço...</option>
            {servicosDisponiveis.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {s.ordem_id ? String(s.ordem_id) + " - " : ""}{String(s.codigo)} — {String(s.nome)}
              </option>
            ))}
          </select>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAddingTo(grupoId)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar serviço
          </Button>
        )}
      </div>
    </div>
  );
}
