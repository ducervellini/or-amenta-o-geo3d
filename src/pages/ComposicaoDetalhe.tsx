import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseUpdate, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Edit, Trash2, Users, Wrench, Truck, Package,
  ChevronDown, ChevronUp, Save, BarChart3, History, Layers, Shield,
} from "lucide-react";
import { ComposicaoItemForm } from "@/components/composicao/ComposicaoItemForm";
import { ResumoComposicao } from "@/components/composicao/ResumoComposicao";
import { MemoriaCalculo } from "@/components/composicao/MemoriaCalculo";
import { PainelBDI } from "@/components/composicao/PainelBDI";
import { MetricasServicoForm } from "@/components/composicao/MetricasServicoForm";
import { HistoricoRevisoes } from "@/components/composicao/HistoricoRevisoes";
import { GerenciadorCenarios } from "@/components/composicao/GerenciadorCenarios";
import { ControleStatus } from "@/components/composicao/ControleStatus";
import { TrilhaAuditoria } from "@/components/composicao/TrilhaAuditoria";
import { registrarAuditoria } from "@/lib/audit";
import {
  calcularMaoDeObra, calcularEquipamento, calcularVeiculo, calcularMaterial,
  calcularResumo,
  type ParametrosMaoDeObra, type ParametrosEquipamento, type ParametrosVeiculo, type ParametrosMaterial,
  getDefaultParamsMaoDeObra, getDefaultParamsEquipamento, getDefaultParamsVeiculo, getDefaultParamsMaterial,
} from "@/lib/composicao-calculo";
import { type ResultadoBDI } from "@/lib/bdi-calculo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TipoInsumo = "mao_de_obra" | "equipamento" | "material";

const tipoIcons: Record<string, React.ElementType> = {
  mao_de_obra: Users, equipamento: Wrench, material: Package, combustivel: Package,
};
const tipoLabels: Record<string, string> = {
  mao_de_obra: "Mão de Obra", equipamento: "Equipamento", material: "Material", combustivel: "Material",
};
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

function ItensTable({ itens, tipoIcons, tipoLabels, fmt, resumo, onEdit, onDelete }: {
  itens: any[];
  tipoIcons: Record<string, React.ElementType>;
  tipoLabels: Record<string, string>;
  fmt: (n: number) => string;
  resumo: { custo_direto: number };
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}) {
  const flatData = itens.map((item) => {
    const params = (item.parametros || {}) as Record<string, unknown>;
    const periodoLabel = params.periodo ? String(params.periodo) : "-";
    const produtividade = Number(params.produtividade) || Number(item.quantidade) || 1;
    return {
      ...item,
      _tipo_label: tipoLabels[String(item.tipo_insumo)] || String(item.tipo_insumo),
      _custo_unitario: item.resultado.custo_unitario,
      _custo_total: item.resultado.custo_total,
      _periodo: periodoLabel,
      _produtividade: produtividade,
    };
  });
  const { sorted, sortKey, sortDirection, handleSort } = useTableSort(flatData);
  const cols = [
    { key: "tipo_insumo", label: "Tipo" },
    { key: "descricao", label: "Descrição" },
    { key: "_produtividade", label: "Qtd" },
    { key: "unidade", label: "Unidade" },
    { key: "_periodo", label: "Duração" },
    { key: "coeficiente", label: "Coef. (h)" },
    { key: "_custo_unitario", label: "Custo Unit." },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
            ))}
            <th className="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item: any) => {
            const Icon = tipoIcons[String(item.tipo_insumo)] || Package;
            return (
              <tr key={String(item.id)} className="hover:bg-muted/50">
                <td>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    <Icon className="w-3 h-3" />
                    {item._tipo_label}
                  </span>
                </td>
                <td className="font-medium text-sm">{String(item.descricao) || "Sem descrição"}</td>
                <td className="font-mono text-sm">{fmt(item._produtividade)}</td>
                <td className="text-sm">{String(item.unidade || "un")}</td>
                <td className="text-sm">{item._periodo}</td>
                <td className="font-mono text-sm">{fmt(Number(item.coeficiente))}</td>
                <td className="font-mono text-sm">R$ {fmt(item._custo_unitario)}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(String(item.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 font-semibold bg-muted/30">
            <td colSpan={6} className="text-right text-sm">Total da Composição</td>
            <td className="font-mono text-sm">R$ {fmt(resumo.custo_direto)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ComposicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "novo";

  const { data: servicos } = useSupabaseQuery("servicos");
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: departamentos } = useSupabaseQuery("modulos");
  const { data: composicoesExistentes } = useSupabaseQuery("composicoes");

  // Composition header
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [servicoId, setServicoId] = useState("_none_");
  const [status, setStatus] = useState("rascunho");
  const [travado, setTravado] = useState(false);

  // Auto-filled from service
  const [mercadoNome, setMercadoNome] = useState("");
  const [areaNome, setAreaNome] = useState("");
  const [departamentoNome, setDepartamentoNome] = useState("");

  // Productivity
  const [produtividadeValor, setProdutividadeValor] = useState<number>(0);
  const [produtividadeUnidade, setProdutividadeUnidade] = useState("un");
  const [produtividadeTempo, setProdutividadeTempo] = useState("dia");

  // Service metrics
  const [tipoGeometria, setTipoGeometria] = useState("");
  const [metricas, setMetricas] = useState<Record<string, unknown>>({});

  // Items
  const [itens, setItens] = useState<Record<string, unknown>[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // BDI result
  const [resultadoBDI, setResultadoBDI] = useState<ResultadoBDI | null>(null);

  // Dialogs
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [tipoNovo, setTipoNovo] = useState<TipoInsumo>("mao_de_obra");

  // Active sidebar tab
  const [sidebarTab, setSidebarTab] = useState("resumo");

  const insertComposicao = useSupabaseInsert("composicoes");
  const updateComposicao = useSupabaseUpdate("composicoes");
  const insertItem = useSupabaseInsert("composicao_itens");
  const updateItem = useSupabaseUpdate("composicao_itens");
  const deleteItem = useSupabaseDelete("composicao_itens");

  // Load existing composition
  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        const { data: comp } = await (supabase.from as any)("composicoes").select("*").eq("id", id).single();
        if (comp) {
          setCodigo(comp.codigo);
          setNome(comp.nome);
          setDescricao(comp.descricao || "");
          setUnidade(comp.unidade);
          setServicoId(comp.servico_id || "_none_");
          setStatus(comp.status || "rascunho");
          setTravado(comp.travado || false);
        }
        const { data: items } = await (supabase.from as any)("composicao_itens").select("*").eq("composicao_id", id).order("created_at");
        if (items) setItens(items);
      })();
    }
  }, [id, isNew]);

  // Helper to generate 3-char abbreviation
  const abrev = (str: string) => {
    if (!str) return "XXX";
    return str.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
  };

  // Auto-generate code based on service hierarchy
  const gerarCodigo = (mercNome: string, areNome: string, deptNome: string) => {
    const prefix = `COMP-${abrev(mercNome)}-${abrev(areNome)}-${abrev(deptNome)}-`;
    const existentes = (composicoesExistentes || [])
      .filter((c) => String(c.codigo).startsWith(prefix))
      .map((c) => {
        const num = parseInt(String(c.codigo).replace(prefix, ""), 10);
        return isNaN(num) ? 0 : num;
      });
    const proximo = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
    return `${prefix}${String(proximo).padStart(3, "0")}`;
  };

  // Load service geometry type and auto-fill when service changes
  useEffect(() => {
    if (servicoId && servicoId !== "_none_") {
      const servico = servicos?.find((s) => String(s.id) === servicoId);
      if (servico) {
        setTipoGeometria(String(servico.tipo_geometria || ""));
        const premissas = (servico.premissas_padrao as Record<string, unknown>) || {};
        setMetricas(premissas);

        // Set unit from service
        setUnidade(String(servico.unidade_medicao || "un"));
        setNome(String(servico.nome || ""));

        // Auto-fill mercado, area, departamento
        const merc = mercados?.find((m) => String(m.id) === String(servico.mercado_id));
        const area = areasEmpresa?.find((a) => String(a.id) === String(servico.area_empresa_id));
        const dept = departamentos?.find((d) => String(d.id) === String(servico.modulo_id));

        const mercNome = merc ? String(merc.nome) : "";
        const areNome = area ? String(area.nome) : "";
        const deptNome = dept ? String(dept.nome) : "";

        setMercadoNome(mercNome);
        setAreaNome(areNome);
        setDepartamentoNome(deptNome);

        // Auto-fill productivity from service
        if (servico.produtividade_padrao) {
          setProdutividadeValor(Number(servico.produtividade_padrao));
          setProdutividadeUnidade(String(servico.unidade_medicao || "un"));
          setProdutividadeTempo(String(servico.unidade_tempo_produtividade || "dia"));
        }

        // Auto-generate code only for new compositions
        if (isNew) {
          setCodigo(gerarCodigo(mercNome, areNome, deptNome));
        }
      }
    } else {
      setTipoGeometria("");
      setMercadoNome("");
      setAreaNome("");
      setDepartamentoNome("");
    }
  }, [servicoId, servicos, mercados, areasEmpresa, departamentos, composicoesExistentes]);

  type ItemComCalculo = Record<string, unknown> & { resultado: { custo_unitario: number; custo_total: number; memoria: import("@/lib/composicao-calculo").MemoriaCalculo[] } };

  const itensComCalculo: ItemComCalculo[] = useMemo(() => {
    return itens.map((item): ItemComCalculo => {
      const tipo = String(item.tipo_insumo);
      const params = (item.parametros || {}) as Record<string, unknown>;
      const coef = Number(item.coeficiente) || 1;
      try {
        if (tipo === "mao_de_obra") return { ...item, resultado: calcularMaoDeObra({ ...getDefaultParamsMaoDeObra(), ...params } as ParametrosMaoDeObra, 1, coef) };
        if (tipo === "equipamento") return { ...item, resultado: calcularEquipamento({ ...getDefaultParamsEquipamento(), ...params } as ParametrosEquipamento, 1, coef) };
        if (tipo === "veiculo") return { ...item, resultado: calcularMaterial({ ...getDefaultParamsMaterial(), ...params } as ParametrosMaterial, 1, coef) };
        return { ...item, resultado: calcularMaterial({ ...getDefaultParamsMaterial(), ...params } as ParametrosMaterial, 1, coef) };
      } catch {
        return { ...item, resultado: { custo_unitario: Number(item.custo_unitario) || 0, custo_total: Number(item.custo_total) || 0, memoria: [] } };
      }
    });
  }, [itens]);

  const resumo = useMemo(() => {
    return calcularResumo(itensComCalculo.map((i) => ({
      tipo_insumo: String(i.tipo_insumo),
      custo_total: i.resultado.custo_unitario, // soma dos custos unitários
    })));
  }, [itensComCalculo]);

  const handleSaveHeader = async () => {
    if (!codigo) { toast.error("Informe um código para a composição"); return; }
    if (servicoId === "_none_" && !nome) { toast.error("Informe um nome para a composição avulsa"); return; }
    if (travado) { toast.error("Orçamento travado — não é possível editar"); return; }
    const values = {
      codigo, nome, descricao, unidade,
      servico_id: servicoId === "_none_" ? null : servicoId,
      custo_unitario_total: resumo.custo_direto,
    };
    if (isNew) {
      insertComposicao.mutate(values, {
        onSuccess: (data: Record<string, unknown>) => {
          registrarAuditoria("composicoes", String(data.id), "criar", null, values);
          navigate(`/composicoes/${data.id}`, { replace: true });
        },
      });
    } else {
      updateComposicao.mutate({ id: id!, values }, {
        onSuccess: () => { registrarAuditoria("composicoes", id!, "editar", null, values); },
      });
    }
  };

  const handleSaveItem = async (values: Record<string, unknown>) => {
    if (isNew) { toast.error("Salve a composição primeiro"); return; }
    if (editingItem) {
      updateItem.mutate({ id: String(editingItem.id), values }, {
        onSuccess: () => {
          setItens((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...values } : i)));
          setShowItemForm(false);
          setEditingItem(null);
          updateTotalComposicao();
        },
      });
    } else {
      insertItem.mutate({ ...values, composicao_id: id }, {
        onSuccess: (data: Record<string, unknown>) => {
          setItens((prev) => [...prev, data]);
          setShowItemForm(false);
          updateTotalComposicao();
        },
      });
    }
  };

  const handleDeleteItem = () => {
    if (!deletingItemId) return;
    deleteItem.mutate(deletingItemId, {
      onSuccess: () => {
        setItens((prev) => prev.filter((i) => i.id !== deletingItemId));
        setDeletingItemId(null);
        updateTotalComposicao();
      },
    });
  };

  const updateTotalComposicao = () => {
    if (!isNew && id) {
      setTimeout(() => {
        const total = itensComCalculo.reduce((s, i) => s + i.resultado.custo_unitario, 0);
        updateComposicao.mutate({ id: id!, values: { custo_unitario_total: total } });
      }, 500);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof itensComCalculo> = {
      mao_de_obra: [], equipamento: [], material: [],
    };
    itensComCalculo.forEach((i) => {
      const tipo = String(i.tipo_insumo);
      if (tipo in groups) groups[tipo].push(i);
      else groups.material.push(i);
    });
    return groups;
  }, [itensComCalculo]);

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/composicoes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{isNew ? "Nova Composição" : nome || "Composição"}</h1>
          <p className="page-subtitle">Composição analítica de custos unitários</p>
        </div>
        {!isNew && resultadoBDI && (
          <div className="hidden md:flex items-center gap-4 text-right">
            <div>
              <div className="text-xs text-muted-foreground">Custo Direto</div>
              <div className="font-mono font-semibold text-sm">R$ {fmt(resumo.custo_direto)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">BDI</div>
              <div className="font-mono font-semibold text-sm text-accent">{resultadoBDI.bdi_percentual.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Preço Final</div>
              <div className="font-mono font-bold text-lg text-primary">R$ {fmt(resultadoBDI.preco_final_bdi)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info card */}
          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados da Composição</h3>

            {/* 1. Service selection (primary) */}
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select value={servicoId} onValueChange={setServicoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Avulsa (sem serviço)</SelectItem>
                  {(servicos || []).map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      {String(s.codigo)} - {String(s.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Avulsa: editable fields / Serviço: auto-filled read-only */}
            {servicoId === "_none_" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Código *</Label>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="AVU-001" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da composição" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mercado</Label>
                    <Select value={mercadoNome || "_none_"} onValueChange={(v) => setMercadoNome(v === "_none_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">—</SelectItem>
                        {(mercados || []).map((m) => (
                          <SelectItem key={String(m.id)} value={String(m.nome)}>{String(m.nome)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Área da Empresa</Label>
                    <Select value={areaNome || "_none_"} onValueChange={(v) => setAreaNome(v === "_none_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">—</SelectItem>
                        {(areasEmpresa || []).map((a) => (
                          <SelectItem key={String(a.id)} value={String(a.nome)}>{String(a.nome)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Select value={departamentoNome || "_none_"} onValueChange={(v) => setDepartamentoNome(v === "_none_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">—</SelectItem>
                        {(departamentos || []).map((d) => (
                          <SelectItem key={String(d.id)} value={String(d.nome)}>{String(d.nome)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Mercado</Label>
                  <Input value={mercadoNome || "—"} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Área da Empresa</Label>
                  <Input value={areaNome || "—"} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Departamento</Label>
                  <Input value={departamentoNome || "—"} disabled className="bg-muted" />
                </div>
              </div>
            )}

            {/* Code (auto for service, manual for avulsa) and Unit */}
            <div className="grid grid-cols-2 gap-3">
              {servicoId !== "_none_" && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Código</Label>
                  <Input value={codigo} disabled className="bg-muted font-mono" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ha","m","km","km²","m²","un","pt","h","dia","mês","propriedades","unidades","pontos","cadastros","imóveis","amostras","torres","marcos","vértices","bandeiras","plantas","travessias","seções","piquetes","relatórios","laudos"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSaveHeader} className="gap-2" disabled={insertComposicao.isPending || updateComposicao.isPending}>
              <Save className="w-4 h-4" />
              {isNew ? "Criar Composição" : "Salvar"}
            </Button>
          </div>


          {/* Items */}
          {!isNew && (
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens da Composição</h3>
                <div className="flex items-center gap-2">
                  <Select value="" onValueChange={(tipo) => { setTipoNovo(tipo as TipoInsumo); setEditingItem(null); setShowItemForm(true); }}>
                    <SelectTrigger className="w-auto gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Item</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mao_de_obra"><div className="flex items-center gap-2"><Users className="w-4 h-4" />Mão de Obra</div></SelectItem>
                      <SelectItem value="equipamento"><div className="flex items-center gap-2"><Wrench className="w-4 h-4" />Equipamento</div></SelectItem>
                      <SelectItem value="material"><div className="flex items-center gap-2"><Package className="w-4 h-4" />Material</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {itensComCalculo.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhum item adicionado. Use o botão acima para adicionar mão de obra, equipamentos ou materiais.
                </div>
              ) : (
                <ItensTable itens={itensComCalculo} tipoIcons={tipoIcons} tipoLabels={tipoLabels} fmt={fmt} resumo={resumo}
                  onEdit={(item) => { setEditingItem(item); setTipoNovo(String(item.tipo_insumo) as TipoInsumo); setShowItemForm(true); }}
                  onDelete={(id) => setDeletingItemId(id)}
                />
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {!isNew && (
            <ControleStatus
              composicaoId={id!}
              status={status}
              travado={travado}
              onStatusChange={(s, t) => { setStatus(s); setTravado(t); }}
            />
          )}

          <Tabs value={sidebarTab} onValueChange={setSidebarTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resumo">Custos</TabsTrigger>
              <TabsTrigger value="bdi" className="gap-1"><BarChart3 className="w-3.5 h-3.5" />BDI</TabsTrigger>
              <TabsTrigger value="historico" className="gap-1"><History className="w-3.5 h-3.5" />Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-4 pt-2">
              <ResumoComposicao resumo={resumo} />
              {!isNew && itensComCalculo.length > 0 && (
                <div className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custo Unitário</h3>
                  <div className="text-center">
                    <div className="text-3xl font-mono font-bold text-primary">R$ {fmt(resumo.custo_direto)}</div>
                    <div className="text-xs text-muted-foreground mt-1">por {unidade}</div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bdi" className="pt-2">
              <PainelBDI custoDireto={resumo.custo_direto} onBdiCalculado={setResultadoBDI} />
            </TabsContent>

            <TabsContent value="historico" className="space-y-4 pt-2">
              {!isNew && id && (
                <>
                  <HistoricoRevisoes
                    composicaoId={id}
                    dadosAtuais={{ ...resumo, itens: itens.length, status }}
                  />
                  <GerenciadorCenarios
                    composicaoId={id}
                    dadosAtuais={{ ...resumo, itens: itens.length, status }}
                  />
                  <TrilhaAuditoria registroId={id} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Item Form Dialog */}
      <ComposicaoItemForm
        open={showItemForm}
        onOpenChange={setShowItemForm}
        tipoInicial={tipoNovo}
        initialValues={editingItem || undefined}
        onSubmit={handleSaveItem}
        loading={insertItem.isPending || updateItem.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
