import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableRow } from "@/components/ui/sortable-row";
import { useRowOrdering, OrderedItem } from "@/hooks/useRowOrdering";
import {
  DollarSign, Users, Wrench, Package, Truck, Pencil, X, Plus, Type, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OportunidadeGate } from "@/components/orcamento/OportunidadeGate";
import { VoltarAoOrcamento } from "@/components/orcamento/VoltarAoOrcamento";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIPO_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  mao_de_obra: { label: "Mão de Obra", icon: Users },
  equipamento: { label: "Equipamentos", icon: Wrench },
  material: { label: "Materiais", icon: Package },
  veiculo: { label: "Veículos", icon: Truck },
  combustivel: { label: "Combustível", icon: Truck },
};

/* ── Subtitle inline row ── */
function SubtitleRow({ item, colSpan, onEdit, onRemove }: {
  item: OrderedItem; colSpan: number;
  onEdit: (id: string, text: string) => void; onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item._subtitleText || "");
  return (
    <>
      <td colSpan={colSpan} className="py-2 px-3">
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

export default function CustosServicos() {
  return (
    <OportunidadeGate>
      {(oportunidadeId, oportunidade) => (
        <CustosServicosContent oportunidadeId={oportunidadeId} oportunidade={oportunidade} />
      )}
    </OportunidadeGate>
  );
}

export function CustosServicosContent({
  oportunidadeId,
  oportunidade,
  embedded = false,
}: {
  oportunidadeId: string;
  oportunidade: any;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const selectedOportunidadeId = oportunidadeId;
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Queries ── */

  const grupoId = oportunidade?.grupo_servicos_id || null;

  const { data: grupoServicoIds } = useQuery({
    queryKey: ["custos-grupo-servico-ids", grupoId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("grupos_servicos_servicos")
        .select("servico_id")
        .eq("grupo_id", grupoId);
      if (error) throw error;
      return (data as any[]).map((r: any) => r.servico_id) as string[];
    },
    enabled: !!grupoId,
  });

  const { data: composicoes } = useQuery({
    queryKey: ["custos-composicoes", grupoServicoIds],
    queryFn: async () => {
      if (!grupoServicoIds?.length) return [];
      const { data, error } = await (supabase.from as any)("composicoes")
        .select("id, codigo, nome, unidade, custo_unitario_total, servico_id, ordem_id")
        .eq("ativo", true)
        .in("servico_id", grupoServicoIds)
        .order("ordem_id");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!grupoServicoIds?.length,
  });

  const composicaoIds = useMemo(
    () => (composicoes || []).map((c: any) => c.id),
    [composicoes]
  );

  const { data: composicaoItens } = useQuery({
    queryKey: ["custos-composicao-itens", composicaoIds.join(",")],
    queryFn: async () => {
      if (!composicaoIds.length) return [];
      const { data, error } = await (supabase.from as any)("composicao_itens")
        .select("composicao_id, tipo_insumo, custo_total")
        .in("composicao_id", composicaoIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: composicaoIds.length > 0,
  });

  // Load existing orcamento for this oportunidade
  const { data: existingOrcamento } = useQuery({
    queryKey: ["custos-orcamento", selectedOportunidadeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("orcamentos")
        .select("*, orcamento_itens_servico(*)")
        .eq("oportunidade_id", selectedOportunidadeId)
        .limit(1);
      if (error) throw error;
      return (data as any[])?.[0] || null;
    },
    enabled: !!selectedOportunidadeId,
  });

  // Seed quantities from existing orcamento
  useEffect(() => {
    if (!existingOrcamento?.orcamento_itens_servico) return;
    const map: Record<string, number> = {};
    for (const item of existingOrcamento.orcamento_itens_servico) {
      map[item.composicao_id] = Number(item.quantidade || 0);
    }
    setQuantidades(map);
  }, [existingOrcamento]);

  // Reset when oportunidade changes
  useEffect(() => {
    if (!selectedOportunidadeId) {
      setQuantidades({});
    }
  }, [selectedOportunidadeId]);

  /* ── Row ordering ── */

  const composicoesAsRows = useMemo(
    () => (composicoes || []).map((c: any) => ({ ...c })),
    [composicoes]
  );

  const orderingKey = selectedOportunidadeId ? `custos_servicos_${selectedOportunidadeId}` : "";

  const {
    orderedItems, moveItem, insertSubtitle, removeSubtitle, editSubtitle,
  } = useRowOrdering(orderingKey, composicoesAsRows);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedItems.findIndex((i) => i._orderingId === active.id);
    const newIdx = orderedItems.findIndex((i) => i._orderingId === over.id);
    if (oldIdx !== -1 && newIdx !== -1) moveItem(oldIdx, newIdx);
  };

  /* ── Subtitle insertion ── */
  const [showSubInput, setShowSubInput] = useState(false);
  const [subText, setSubText] = useState("");

  /* ── Calculations ── */

  const custosPorComposicao = useMemo(() => {
    if (!composicaoItens) return {};
    const map: Record<string, Record<string, number>> = {};
    for (const item of composicaoItens) {
      if (!map[item.composicao_id]) map[item.composicao_id] = {};
      map[item.composicao_id][item.tipo_insumo] = (map[item.composicao_id][item.tipo_insumo] || 0) + Number(item.custo_total || 0);
    }
    return map;
  }, [composicaoItens]);

  const totalGeral = useMemo(() => {
    let total = 0;
    for (const c of composicoes || []) {
      const qty = quantidades[c.id] || 0;
      total += qty * Number(c.custo_unitario_total || 0);
    }
    return total;
  }, [composicoes, quantidades]);

  const totalPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of composicoes || []) {
      const qty = quantidades[c.id] || 0;
      if (qty <= 0) continue;
      const breakdown = custosPorComposicao[c.id] || {};
      const custoUnitTotal = Number(c.custo_unitario_total || 0);
      if (custoUnitTotal <= 0) continue;
      // proportional allocation
      const sumBreakdown = Object.values(breakdown).reduce((a, b) => a + b, 0);
      if (sumBreakdown <= 0) continue;
      for (const [tipo, val] of Object.entries(breakdown)) {
        const proportion = val / sumBreakdown;
        map[tipo] = (map[tipo] || 0) + qty * custoUnitTotal * proportion;
      }
    }
    return map;
  }, [composicoes, quantidades, custosPorComposicao]);

  // Compute subtotals for subtitle groups
  const subtotalMap = useMemo(() => {
    const map: Record<string, number> = {};
    let currentSubId: string | null = null;
    for (const item of orderedItems) {
      if (item._isSubtitle) {
        currentSubId = item._orderingId;
        map[currentSubId] = 0;
      } else if (currentSubId) {
        const qty = quantidades[String(item.id)] || 0;
        const custoUnit = Number((item as any).custo_unitario_total || 0);
        map[currentSubId] += qty * custoUnit;
      }
    }
    return map;
  }, [orderedItems, quantidades]);

  /* ── Persist ── */

  const persistQuantidades = useCallback(
    (newQtds: Record<string, number>) => {
      if (!selectedOportunidadeId || !composicoes?.length) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          // Ensure orcamento exists
          let orcId = existingOrcamento?.id;
          if (!orcId) {
            const { data: newOrc, error } = await (supabase.from as any)("orcamentos")
              .insert({ oportunidade_id: selectedOportunidadeId, status: "rascunho" })
              .select("id")
              .single();
            if (error) throw error;
            orcId = newOrc.id;
          }

          // Delete existing items
          await (supabase.from as any)("orcamento_itens_servico")
            .delete()
            .eq("orcamento_id", orcId);

          // Insert new items
          const items = composicoes.map((c: any) => ({
            orcamento_id: orcId,
            composicao_id: c.id,
            quantidade: newQtds[c.id] || 0,
            custo_unitario: Number(c.custo_unitario_total || 0),
            custo_total: (newQtds[c.id] || 0) * Number(c.custo_unitario_total || 0),
          }));

          if (items.length > 0) {
            await (supabase.from as any)("orcamento_itens_servico").insert(items);
          }

          // Update orcamento custo_servicos
          const totalServicos = items.reduce((s: number, i: any) => s + i.custo_total, 0);
          await (supabase.from as any)("orcamentos")
            .update({ custo_servicos: totalServicos, updated_at: new Date().toISOString() })
            .eq("id", orcId);

          queryClient.invalidateQueries({ queryKey: ["custos-orcamento"] });
          // Notify embedding shells (e.g. OrcamentoDetalhe) to refresh their summary
          window.dispatchEvent(new CustomEvent("orcamento:refresh", { detail: { oportunidadeId: selectedOportunidadeId } }));
        } catch (err) {
          console.error("Erro ao salvar:", err);
          toast.error("Erro ao salvar quantidades");
        }
      }, 800);
    },
    [selectedOportunidadeId, composicoes, existingOrcamento, queryClient]
  );

  const handleQtdChange = useCallback(
    (composicaoId: string, value: number) => {
      setQuantidades((prev) => {
        const next = { ...prev, [composicaoId]: value };
        persistQuantidades(next);
        return next;
      });
    },
    [persistQuantidades]
  );

  /* ── Render ── */

  const colCount = 7; // grip + código + nome + unidade + qtd + custo unit + custo total + actions

  return (
    <div className={cn("space-y-4", !embedded && "p-4 md:p-6")}>
      {!embedded && <VoltarAoOrcamento step="servicos" />}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Custos de Serviços
            </h1>
            <p className="text-sm text-muted-foreground">
              Defina quantidades e calcule custos por composição
            </p>
          </div>
        </div>
      )}

      {!embedded && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="text-xs font-bold">{oportunidade.codigo}</Badge>
              <span className="font-medium">{oportunidade.descricao}</span>
              {oportunidade.clientes?.nome && (
                <span className="text-muted-foreground">({oportunidade.clientes.nome})</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Composições */}
      {selectedOportunidadeId && !grupoId && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Esta oportunidade não possui um grupo de serviços vinculado. Edite a oportunidade para associar um grupo.
          </CardContent>
        </Card>
      )}

      {selectedOportunidadeId && grupoId && composicoes && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Composições
            </CardTitle>
            <div className="flex items-center gap-2">
              {showSubInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    className="h-8 w-48 text-sm"
                    placeholder="Nome do subtítulo..."
                    value={subText}
                    onChange={(e) => setSubText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subText.trim()) {
                        insertSubtitle(subText.trim());
                        setSubText("");
                        setShowSubInput(false);
                      }
                    }}
                  />
                  <Button size="sm" className="h-8" onClick={() => {
                    if (subText.trim()) { insertSubtitle(subText.trim()); setSubText(""); }
                    setShowSubInput(false);
                  }}>OK</Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowSubInput(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowSubInput(true)}>
                  <Type className="w-3 h-3" /> Subtítulo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedItems.map((i) => i._orderingId)} strategy={verticalListSortingStrategy}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs font-medium text-muted-foreground">
                        <th className="w-8"></th>
                        <th className="text-left py-2 px-2">Código</th>
                        <th className="text-left py-2 px-2">Nome</th>
                        <th className="text-left py-2 px-2 w-20">Unidade</th>
                        <th className="text-right py-2 px-2 w-28">Quantidade</th>
                        <th className="text-right py-2 px-2 w-32">Custo Unit.</th>
                        <th className="text-right py-2 px-2 w-36">Custo Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedItems.map((item) => {
                        if (item._isSubtitle) {
                          const sub = subtotalMap[item._orderingId];
                          return (
                            <SortableRow key={item._orderingId} id={item._orderingId}>
                              <SubtitleRow
                                item={item}
                                colSpan={colCount}
                                onEdit={editSubtitle}
                                onRemove={removeSubtitle}
                              />
                            </SortableRow>
                          );
                        }

                        const c = item as any;
                        const qty = quantidades[c.id] || 0;
                        const custoUnit = Number(c.custo_unitario_total || 0);
                        const custoTotal = qty * custoUnit;

                        return (
                          <SortableRow key={item._orderingId} id={item._orderingId}>
                            <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{c.codigo}</td>
                            <td className="py-2 px-2">{c.nome}</td>
                            <td className="py-2 px-2 text-muted-foreground">{c.unidade}</td>
                            <td className="py-2 px-2 text-right">
                              <Input
                                type="number"
                                min={0}
                                value={qty || ""}
                                onChange={(e) => handleQtdChange(c.id, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="h-8 text-sm text-right w-24 ml-auto"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-medium">{fmt(custoUnit)}</td>
                            <td className={cn("py-2 px-2 text-right font-semibold", custoTotal > 0 && "text-primary")}>
                              {fmt(custoTotal)}
                            </td>
                            <td></td>
                          </SortableRow>
                        );
                      })}

                      {/* Subtotal rows after each subtitle group */}
                      {orderedItems.length > 0 && (() => {
                        // Render inline subtotals
                        const rows: React.ReactNode[] = [];
                        let currentSubId: string | null = null;
                        let lastSubEndIdx = -1;

                        for (let i = 0; i < orderedItems.length; i++) {
                          const item = orderedItems[i];
                          if (item._isSubtitle) {
                            // If previous group had a subtitle, the subtotal was already handled inline
                            currentSubId = item._orderingId;
                          }
                        }
                        return null;
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-primary/20">
                        <td colSpan={6} className="py-3 px-2 text-right font-bold">Total Geral</td>
                        <td className="py-3 px-2 text-right font-bold text-primary text-base">{fmt(totalGeral)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </SortableContext>
              </DndContext>
            </div>

            {/* Breakdown por tipo */}
            {Object.keys(totalPorTipo).length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Breakdown por Tipo de Insumo</p>
                  {Object.entries(TIPO_LABELS).map(([tipo, { label, icon: Icon }]) => {
                    const valor = totalPorTipo[tipo] || 0;
                    if (valor <= 0) return null;
                    return (
                      <div key={tipo} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </span>
                        <span className="font-medium">{fmt(valor)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
