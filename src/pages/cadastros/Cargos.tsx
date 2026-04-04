import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrudFormDialog } from "@/components/crud/CrudFormDialog";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import {
  useSupabaseQuery,
  useSupabaseInsert,
  useSupabaseUpdate,
  useSupabaseDelete,
} from "@/hooks/useSupabaseCrud";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calcularCustoDetalhado,
  type Cargo,
  type Encargo,
  type Beneficio,
  type Jornada,
  type Regime,
  type HorarioAlmoco,
} from "@/lib/custo-mao-obra";

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) => `${v.toFixed(2)}%`;

export default function Cargos() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cargos, isLoading: loadingCargos } = useSupabaseQuery("cargos");
  const { data: encargos, isLoading: loadingEnc } = useSupabaseQuery("encargos_sociais");
  const { data: beneficios, isLoading: loadingBen } = useSupabaseQuery("beneficios");
  const { data: jornadas } = useSupabaseQuery("jornadas_trabalho");
  const { data: regimes } = useSupabaseQuery("regimes_operacionais");
  const { data: horarios } = useSupabaseQuery("horarios_almoco");

  const insertMutation = useSupabaseInsert("cargos");
  const updateMutation = useSupabaseUpdate("cargos");
  const deleteMutation = useSupabaseDelete("cargos");

  const isLoading = loadingCargos || loadingEnc || loadingBen;

  // Use first active jornada/regime/horário as defaults
  const jornadaPadrao = useMemo(
    () => (jornadas || []).find((j: any) => j.ativo !== false) as Jornada | null,
    [jornadas]
  );
  const regimePadrao = useMemo(
    () => (regimes || []).find((r: any) => r.ativo !== false) as Regime | null,
    [regimes]
  );
  const horarioPadrao = useMemo(
    () => (horarios || []).find((h: any) => h.ativo !== false) as HorarioAlmoco | null,
    [horarios]
  );

  const encargosAtivos = useMemo(
    () => ((encargos || []) as unknown as Encargo[]).filter((e) => e.ativo),
    [encargos]
  );
  const beneficiosAtivos = useMemo(
    () => ((beneficios || []) as unknown as Beneficio[]).filter((b) => b.ativo),
    [beneficios]
  );

  // Compute enriched rows
  const enriched = useMemo(() => {
    return ((cargos || []) as unknown as (Cargo & { id: string })[]).map((cargo) => {
      const custo = calcularCustoDetalhado(
        cargo,
        encargosAtivos,
        beneficiosAtivos,
        jornadaPadrao,
        regimePadrao,
        horarioPadrao
      );
      return { ...cargo, _custo: custo, custo_total: custo.custo_total_mensal };
    });
  }, [cargos, encargosAtivos, beneficiosAtivos, jornadaPadrao, regimePadrao, horarioPadrao]);

  const filtered = enriched.filter((row) => {
    if (!search) return true;
    return row.nome.toLowerCase().includes(search.toLowerCase());
  });

  const { sorted, sortKey, sortDirection, handleSort } = useTableSort(filtered as any);

  const handleSubmit = (values: Record<string, unknown>) => {
    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id as string, values: values as any },
        { onSuccess: () => { setFormOpen(false); setEditItem(null); } }
      );
    } else {
      insertMutation.mutate(values as any, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const formFields = [
    { name: "nome", label: "Cargo / Função", type: "text" as const, required: true, placeholder: "Engenheiro Civil Sênior" },
    {
      name: "regime_contratacao",
      label: "Regime de Contratação",
      type: "select" as const,
      options: [
        { label: "CLT (com encargos e benefícios)", value: "clt" },
        { label: "PJ (apenas salário)", value: "pj" },
      ],
      defaultValue: "clt",
    },
    { name: "salario_base", label: "Salário Base (R$)", type: "number" as const, required: true },
    {
      name: "unidade_salarial",
      label: "Tipo Salarial",
      type: "select" as const,
      options: [
        { label: "Mensal", value: "mensal" },
        { label: "Hora", value: "hora" },
        { label: "Diária", value: "diaria" },
      ],
      defaultValue: "mensal",
    },
    { name: "descricao", label: "Descrição", type: "textarea" as const },
  ];

  return (
    <TooltipProvider>
      <div className="page-container animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Cargos e Mão de Obra</h1>
            <p className="page-subtitle">
              Cadastro de cargos com custo total (encargos + benefícios + jornada + regime)
            </p>
          </div>
          <Button className="gap-2" onClick={() => { setEditItem(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Encargos Sociais</p>
            <p className="text-lg font-semibold text-foreground">
              {pct(encargosAtivos.reduce((s, e) => s + e.percentual, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{encargosAtivos.length} encargos ativos</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Benefícios Fixos</p>
            <p className="text-lg font-semibold text-foreground">
              {fmt(beneficiosAtivos.filter((b) => b.tipo === "fixo").reduce((s, b) => s + b.valor, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{beneficiosAtivos.length} benefícios ativos</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Jornada / Regime Padrão</p>
            <p className="text-lg font-semibold text-foreground">
              {jornadaPadrao ? `${jornadaPadrao.horas_por_mes}h/mês` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {regimePadrao ? `Regime ${regimePadrao.dias_trabalho}/${regimePadrao.dias_folga}` : "Sem regime"}
              {horarioPadrao ? ` · Almoço ${horarioPadrao.duracao_minutos}min` : ""}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar cargo..."
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
            <div className="text-center py-12 text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Cargo / Função" sortKey="nome" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Regime" sortKey="regime_contratacao" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Salário Base" sortKey="salario_base" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Tipo" sortKey="unidade_salarial" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Encargos" sortKey="_custo.valor_encargos" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Benefícios" sortKey="_custo.valor_beneficios_fixos" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Custo Total/Mês" sortKey="custo_total" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row: any) => {
                    const custo = row._custo;
                    const isPJ = row.regime_contratacao === "pj";
                    const regimeLabel = String(row.regime_contratacao || "clt").toUpperCase();
                    const labels: Record<string, string> = { mensal: "Mensal", hora: "Hora", diaria: "Diária" };
                    const totalBen = custo.valor_beneficios_fixos + custo.valor_beneficios_pct;

                    return (
                      <tr key={row.id}>
                        <td>
                          <span className="font-medium">{row.nome}</span>
                        </td>
                        <td>
                          <Badge variant={regimeLabel === "PJ" ? "outline" : "default"} className="text-xs">
                            {regimeLabel}
                          </Badge>
                        </td>
                        <td>{fmt(row.salario_base)}</td>
                        <td>
                          <span className="capitalize">{labels[row.unidade_salarial] || row.unidade_salarial}</span>
                        </td>
                        <td>
                          {isPJ ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 cursor-help">
                                  {fmt(custo.valor_encargos)}
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs font-medium mb-1">Encargos: {pct(custo.total_encargos_pct)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {custo.total_encargos_pct.toFixed(2)}% sobre salário mensal de {fmt(custo.salario_mensal)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                        <td>
                          {isPJ ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 cursor-help">
                                  {fmt(totalBen)}
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs font-medium mb-1">Benefícios</p>
                                <p className="text-xs text-muted-foreground">
                                  Fixos: {fmt(custo.valor_beneficios_fixos)} · Percentuais: {fmt(custo.valor_beneficios_pct)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                        <td>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 cursor-help font-semibold text-primary">
                                {fmt(custo.custo_total_mensal)}
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="text-xs space-y-1">
                                <p><strong>Composição do Custo</strong></p>
                                <p>Salário mensal: {fmt(custo.salario_mensal)}</p>
                                {!isPJ && <p>Encargos ({pct(custo.total_encargos_pct)}): {fmt(custo.valor_encargos)}</p>}
                                {!isPJ && <p>Benefícios: {fmt(custo.valor_beneficios_fixos + custo.valor_beneficios_pct)}</p>}
                                {custo.fator_regime < 1 && (
                                  <p>Fator regime: ×{custo.fator_regime.toFixed(4)}</p>
                                )}
                                <p className="font-semibold pt-1 border-t border-border">
                                  Total: {fmt(custo.custo_total_mensal)}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(row); setFormOpen(true); }}>
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

        <CrudFormDialog
          open={formOpen}
          onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}
          title={editItem ? "Editar Cargo" : "Novo Cargo"}
          fields={formFields}
          initialValues={editItem || undefined}
          onSubmit={handleSubmit}
          loading={insertMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este registro?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
