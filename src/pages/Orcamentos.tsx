import { useState } from "react";
import { Search, FileText, Edit, Trash2, GripVertical, Type, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useRowOrdering, OrderedItem } from "@/hooks/useRowOrdering";
import { SortableRow } from "@/components/ui/sortable-row";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { calcularStatusOrcamento, ORCAMENTO_STATUS_LABEL } from "@/lib/orcamento-status";

const statusClass: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/15 text-primary border-primary/30",
  finalizado: "bg-accent/15 text-accent border-accent/30 font-semibold",
};

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

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [subText, setSubText] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: oportunidades, isLoading } = useQuery({
    queryKey: ["orcamentos-oportunidades"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("*, clientes(nome)").eq("ativo", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: orcamentos } = useQuery({
    queryKey: ["orcamentos-salvos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("orcamentos").select("*, orcamento_itens_servico(id)");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: mobilizacoes } = useQuery({
    queryKey: ["orcamentos-mobilizacoes"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("mobilizacoes").select("id, oportunidade_id, custo_total").eq("ativo", true);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: bdis } = useQuery({
    queryKey: ["orcamentos-bdi"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi").select("bdi_calculado").eq("ativo", true).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data as any[];
    },
  });

  const bdiPercentual = bdis?.[0]?.bdi_calculado || 0;

  const getOrcamento = (opId: string) => (orcamentos || []).find((orc: any) => orc.oportunidade_id === opId);
  const getMobCusto = (opId: string) => {
    const mob = (mobilizacoes || []).find((m: any) => m.oportunidade_id === opId);
    return mob?.custo_total || 0;
  };

  const getStatus = (op: any) => {
    const orc = getOrcamento(op.id);
    return calcularStatusOrcamento({
      oportunidade: op,
      temServicos: !!orc && (orc.orcamento_itens_servico || []).length > 0,
      temMobilizacao: !!(mobilizacoes || []).find((m: any) => m.oportunidade_id === op.id),
      temBdi: !!orc?.bdi_id,
    });
  };

  const filtered = (oportunidades || []).filter(
    (o: any) =>
      o.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const { orderedItems, moveItem, insertSubtitle, removeSubtitle, editSubtitle } =
    useRowOrdering("orcamentos", filtered);

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

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Selecione uma oportunidade para montar o orçamento</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar por código, descrição ou cliente..." value={search}
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
          </div>
        </div>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Custo Total</th>
                  <th>BDI</th>
                  <th>Preço Total</th>
                  <th>Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <SortableContext items={orderedItems.map((i) => i._orderingId)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                  ) : orderedItems.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma oportunidade encontrada</td></tr>
                  ) : (
                    orderedItems.map((item) => {
                      if (item._isSubtitle) {
                        return (
                          <SortableRow key={item._orderingId} id={item._orderingId} isSubtitle>
                            <SubtitleInlineRow item={item} colSpan={8} onEdit={editSubtitle} onRemove={removeSubtitle} />
                          </SortableRow>
                        );
                      }
                      const o = item as any;
                      const orc = getOrcamento(String(o.id));
                      const custoTotal = orc?.custo_total || getMobCusto(String(o.id));
                      const precoTotal = orc?.preco_total || (custoTotal > 0 ? custoTotal * (1 + bdiPercentual / 100) : 0);
                      const statusInfo = getStatus(o);

                      return (
                        <SortableRow key={item._orderingId} id={item._orderingId}>
                          <td className="font-medium text-accent cursor-pointer" onClick={() => navigate(`/orcamentos/${o.id}`)}>{o.codigo}</td>
                          <td className="font-medium max-w-[200px] truncate cursor-pointer" onClick={() => navigate(`/orcamentos/${o.id}`)}>{o.descricao}</td>
                          <td>{o.clientes?.nome || "—"}</td>
                          <td className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="font-semibold">{fmt(custoTotal)}</td>
                          <td className="text-muted-foreground">{bdiPercentual.toFixed(2)}%</td>
                          <td className="font-semibold text-accent">{fmt(precoTotal)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={statusClass[statusInfo.status]}>
                                {ORCAMENTO_STATUS_LABEL[statusInfo.status]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{statusInfo.percentual}%</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/orcamentos/${o.id}`)} title="Abrir"><FileText className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                                const { error } = await (supabase.from as any)("oportunidades").update({ ativo: false }).eq("id", o.id);
                                if (error) toast.error(error.message);
                                else { toast.success("Orçamento removido"); queryClient.invalidateQueries({ queryKey: ["orcamentos-oportunidades"] }); }
                              }} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </SortableRow>
                      );
                    })
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
