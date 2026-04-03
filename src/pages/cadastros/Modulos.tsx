import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseUpdate, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Modulos() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({ nome: "", descricao: "" });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [moduloAreas, setModuloAreas] = useState<Record<string, string[]>>({});
  const [areasVersion, setAreasVersion] = useState(0);
  const { data: modulos, isLoading } = useSupabaseQuery("modulos");
  
  const { data: areas } = useSupabaseQuery("areas_empresa");
  const insertMutation = useSupabaseInsert("modulos");
  const updateMutation = useSupabaseUpdate("modulos");
  const deleteMutation = useSupabaseDelete("modulos");
  const queryClient = useQueryClient();

  // Load all modulo-area relationships
  useEffect(() => {
    const loadAreas = async () => {
      const { data } = await (supabase.from as any)("modulos_areas_empresa").select("modulo_id, area_empresa_id");
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach((r: any) => {
          if (!map[r.modulo_id]) map[r.modulo_id] = [];
          map[r.modulo_id].push(r.area_empresa_id);
        });
        setModuloAreas(map);
      }
    };
    loadAreas();
  }, [modulos, areasVersion]);

  const filtered = (modulos || []).filter((row: any) =>
    !search || String(row.nome || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setFormValues({ nome: "", descricao: "" });
    setSelectedAreas([]);
    setFormOpen(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditItem(item);
    setFormValues({
      nome: String(item.nome || ""),
      descricao: String(item.descricao || ""),
    });
    setSelectedAreas(moduloAreas[item.id as string] || []);
    setFormOpen(true);
  };

  const saveAreas = async (moduloId: string) => {
    await (supabase.from as any)("modulos_areas_empresa").delete().eq("modulo_id", moduloId);
    if (selectedAreas.length > 0) {
      await (supabase.from as any)("modulos_areas_empresa").insert(
        selectedAreas.map((areaId) => ({ modulo_id: moduloId, area_empresa_id: areaId }))
      );
    }
    setAreasVersion((v) => v + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id as string, values: formValues as any },
        {
          onSuccess: async (data: any) => {
            await saveAreas(editItem.id as string);
            queryClient.invalidateQueries({ queryKey: ["modulos"] });
            setFormOpen(false);
            setEditItem(null);
          },
        }
      );
    } else {
      insertMutation.mutate(formValues as any, {
        onSuccess: async (data: any) => {
          await saveAreas(data.id);
          queryClient.invalidateQueries({ queryKey: ["modulos"] });
          setFormOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const getAreaNames = (moduloId: string) => {
    const ids = moduloAreas[moduloId] || [];
    return ids
      .map((id) => {
        const area = (areas || []).find((a: any) => a.id === id);
        return area ? String((area as any).nome) : null;
      })
      .filter(Boolean);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Departamentos</h1>
          <p className="page-subtitle">Cadastro de departamentos</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Áreas da Empresa</th>
                  <th>Áreas da Empresa</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row: any) => {
                  const mercado = (mercados || []).find((m: any) => m.id === row.mercado_id);
                  const areaNames = getAreaNames(row.id);
                  return (
                    <tr key={row.id}>
                      <td><span className="font-medium">{row.nome}</span></td>
                      <td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {mercado ? String((mercado as any).nome) : "-"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {areaNames.length > 0 ? areaNames.map((name) => (
                            <span key={name} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                              {name}
                            </span>
                          )) : <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </td>
                      <td>{row.descricao || "-"}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {row.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formValues.nome} onChange={(e) => setFormValues((v) => ({ ...v, nome: e.target.value }))} placeholder="Ex: Topografia" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mercado_id">Mercado</Label>
              <Select value={formValues.mercado_id} onValueChange={(v) => setFormValues((prev) => ({ ...prev, mercado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(mercados || []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Áreas da Empresa</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {(areas || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma área cadastrada</p>
                ) : (
                  (areas || []).map((area: any) => (
                    <div key={area.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area.id}`}
                        checked={selectedAreas.includes(area.id)}
                        onCheckedChange={() => toggleArea(area.id)}
                      />
                      <label htmlFor={`area-${area.id}`} className="text-sm cursor-pointer">{area.nome}</label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formValues.descricao} onChange={(e) => setFormValues((v) => ({ ...v, descricao: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={insertMutation.isPending || updateMutation.isPending}>
                {(insertMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
