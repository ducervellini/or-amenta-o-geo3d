import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CrudFormDialog } from "@/components/crud/CrudFormDialog";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function Oportunidades() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: oportunidades, isLoading } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editItem) {
        const { error } = await (supabase.from as any)("oportunidades")
          .update(values)
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Oportunidade atualizada!");
      } else {
        const { error } = await (supabase.from as any)("oportunidades")
          .insert(values);
        if (error) throw error;
        toast.success("Oportunidade criada!");
      }
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      setDialogOpen(false);
      setEditItem(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("oportunidades")
      .update({ ativo: false })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Oportunidade removida!");
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    }
  };

  const filtered = (oportunidades || []).filter(
    (o: any) =>
      o.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const fields = [
    { name: "codigo", label: "Código (4 dígitos)", type: "text" as const, required: true, placeholder: "0001" },
    { name: "descricao", label: "Descrição", type: "text" as const, required: true },
    {
      name: "cliente_id",
      label: "Cliente",
      type: "select" as const,
      options: (clientes || []).map((c: any) => ({ value: c.id, label: c.nome })),
    },
    { name: "cidade", label: "Cidade", type: "text" as const },
    {
      name: "estado",
      label: "Estado",
      type: "select" as const,
      options: ESTADOS_BR.map((uf) => ({ value: uf, label: uf })),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Oportunidades</h1>
          <p className="page-subtitle">Gerenciamento de oportunidades comerciais</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" />
          Nova Oportunidade
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar oportunidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Cidade</th>
                <th>Estado</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma oportunidade encontrada</td></tr>
              ) : (
                filtered.map((o: any) => (
                  <tr key={o.id}>
                    <td className="font-medium text-accent">{o.codigo}</td>
                    <td>{o.descricao}</td>
                    <td>{o.clientes?.nome || "—"}</td>
                    <td>{o.cidade || "—"}</td>
                    <td>{o.estado || "—"}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(o); setDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CrudFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editItem ? "Editar Oportunidade" : "Nova Oportunidade"}
        fields={fields}
        initialValues={editItem || {}}
        onSubmit={handleSave}
      />
    </div>
  );
}
