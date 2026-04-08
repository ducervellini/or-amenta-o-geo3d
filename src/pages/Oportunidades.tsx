import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Columns3, GripVertical, Type, Pencil, X, DollarSign, Building, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CrudFormDialog } from "@/components/crud/CrudFormDialog";
import { toast } from "sonner";
import { useRowOrdering, OrderedItem } from "@/hooks/useRowOrdering";
import { SortableRow } from "@/components/ui/sortable-row";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

const OPORT_COLS = [
  { key: "codigo", label: "Código" },
  { key: "descricao", label: "Descrição" },
  { key: "cliente", label: "Cliente" },
  { key: "grupo_servicos", label: "Grupo de Serviços" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

function SubtitleInlineRow({ item, colSpan, onEdit, onRemove }: {
  item: OrderedItem; colSpan: number;
  onEdit: (id: string, text: string) => void; onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item._subtitleText || "");
  return (
    <>
      <td colSpan={colSpan} className="py-2 px-4">
        {editing ? (
          <input autoFocus className="text-sm font-semibold bg-transparent border-b border-primary outline-none w-full"
            value={text} onChange={(e) => setText(e.target.value)}
            onBlur={() => { onEdit(item._orderingId, text); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onEdit(item._orderingId, text); setEditing(false); } }} />
        ) : (
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">{item._subtitleText}</span>
        )}
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="w-3 h-3" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(item._orderingId)}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </>
  );
}

export default function Oportunidades() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(OPORT_COLS.map((c) => c.key)));
  const [showSubInput, setShowSubInput] = useState(false);
  const [subText, setSubText] = useState("");
  const queryClient = useQueryClient();

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const { data: oportunidades, isLoading } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome), grupos_servicos(nome)")
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
        .select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: gruposServicos } = useQuery({
    queryKey: ["grupos-servicos-select"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("grupos_servicos")
        .select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editItem) {
        const { error } = await (supabase.from as any)("oportunidades").update(values).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Oportunidade atualizada!");
      } else {
        const { error } = await (supabase.from as any)("oportunidades").insert(values);
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
    const { error } = await (supabase.from as any)("oportunidades").update({ ativo: false }).eq("id", id);
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

  const { orderedItems, moveItem, insertSubtitle, removeSubtitle, editSubtitle } =
    useRowOrdering("oportunidades", filtered);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((i) => i._orderingId === active.id);
    const newIndex = orderedItems.findIndex((i) => i._orderingId === over.id);
    if (oldIndex !== -1 && newIndex !== -1) moveItem(oldIndex, newIndex);
  };

  const handleAddSubtitle = () => {
    if (subText.trim()) { insertSubtitle(subText.trim()); setSubText(""); setShowSubInput(false); }
  };

  const visibleColsList = OPORT_COLS.filter((c) => visibleCols.has(c.key));

  const fields = [
    { name: "codigo", label: "Código (4 dígitos)", type: "text" as const, required: true, placeholder: "0001" },
    { name: "descricao", label: "Descrição", type: "text" as const, required: true },
    { name: "cliente_id", label: "Cliente", type: "select" as const, options: (clientes || []).map((c: any) => ({ value: c.id, label: c.nome })) },
    { name: "grupo_servicos_id", label: "Grupo de Serviços", type: "select" as const, options: (gruposServicos || []).map((g: any) => ({ value: g.id, label: g.nome })) },
    { name: "cidade", label: "Cidade", type: "text" as const },
    { name: "estado", label: "Estado", type: "select" as const, options: ESTADOS_BR.map((uf) => ({ value: uf, label: uf })) },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Oportunidades</h1>
          <p className="page-subtitle">Gerenciamento de oportunidades comerciais</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" />Nova Oportunidade
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar oportunidade..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showSubInput ? (
              <div className="flex items-center gap-2">
                <input autoFocus placeholder="Texto do subtítulo..." className="text-sm px-2 py-1 bg-muted rounded border-0 outline-none focus:ring-2 focus:ring-ring"
                  value={subText} onChange={(e) => setSubText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtitle(); if (e.key === "Escape") setShowSubInput(false); }} />
                <Button size="sm" variant="outline" onClick={handleAddSubtitle}>Adicionar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSubInput(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowSubInput(true)}>
                <Type className="w-3 h-3" /> Subtítulo
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Columns3 className="w-4 h-4" /> Colunas</Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-3 space-y-2">
                {OPORT_COLS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={visibleCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                    {col.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  {visibleColsList.map((col) => <th key={col.key}>{col.label}</th>)}
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <SortableContext items={orderedItems.map((i) => i._orderingId)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={visibleCols.size + 2} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                  ) : orderedItems.length === 0 ? (
                    <tr><td colSpan={visibleCols.size + 2} className="text-center py-8 text-muted-foreground">Nenhuma oportunidade encontrada</td></tr>
                  ) : (
                    orderedItems.map((item) => (
                      <SortableRow key={item._orderingId} id={item._orderingId} isSubtitle={item._isSubtitle}>
                        {item._isSubtitle ? (
                          <SubtitleInlineRow item={item} colSpan={visibleColsList.length} onEdit={editSubtitle} onRemove={removeSubtitle} />
                        ) : (
                          <>
                            {visibleCols.has("codigo") && <td className="font-medium text-accent">{String(item.codigo)}</td>}
                            {visibleCols.has("descricao") && <td>{String(item.descricao)}</td>}
                            {visibleCols.has("cliente") && <td>{(item as any).clientes?.nome || "—"}</td>}
                            {visibleCols.has("grupo_servicos") && <td>{(item as any).grupos_servicos?.nome || "—"}</td>}
                            {visibleCols.has("cidade") && <td>{String(item.cidade || "—")}</td>}
                            {visibleCols.has("estado") && <td>{String(item.estado || "—")}</td>}
                            <td className="text-center">
                              <OportunidadeActions
                                item={item}
                                onEdit={() => { setEditItem(item); setDialogOpen(true); }}
                                onDelete={() => handleDelete(String(item.id))}
                              />
                            </td>
                          </>
                        )}
                      </SortableRow>
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      <CrudFormDialog open={dialogOpen} onOpenChange={setDialogOpen}
        title={editItem ? "Editar Oportunidade" : "Nova Oportunidade"}
        fields={fields} initialValues={editItem || {}} onSubmit={handleSave} />
    </div>
  );
}
