import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Loader2, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
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
  DialogDescription,
} from "@/components/ui/dialog";
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

// ── Custom Form Dialog ──────────────────────────────────────────────
function CargoFormDialog({
  open,
  onOpenChange,
  editItem,
  jornadas,
  regimes,
  horarios,
  encargos,
  beneficios,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: Record<string, unknown> | null;
  jornadas: any[];
  regimes: any[];
  horarios: any[];
  encargos: any[];
  beneficios: any[];
  onSubmit: (values: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [nome, setNome] = useState("");
  const [regimeContratacao, setRegimeContratacao] = useState("clt");
  const [salarioBase, setSalarioBase] = useState("");
  const [unidadeSalarial, setUnidadeSalarial] = useState("mensal");
  const [localTrabalho, setLocalTrabalho] = useState("campo");
  const [jornadaId, setJornadaId] = useState<string>("");
  const [regimeId, setRegimeId] = useState<string>("");
  const [horarioAlmocoId, setHorarioAlmocoId] = useState<string>("");
  const [encargosSel, setEncargosSel] = useState<string[]>([]);
  const [beneficiosSel, setBeneficiosSel] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (open) {
      if (editItem) {
        setNome(String(editItem.nome || ""));
        setRegimeContratacao(String(editItem.regime_contratacao || "clt"));
        setSalarioBase(String(editItem.salario_base || ""));
        setUnidadeSalarial(String(editItem.unidade_salarial || "mensal"));
        setLocalTrabalho(String(editItem.local_trabalho || "campo"));
        setJornadaId(String(editItem.jornada_id || ""));
        setRegimeId(String(editItem.regime_id || ""));
        setHorarioAlmocoId(String(editItem.horario_almoco_id || ""));
        setEncargosSel(Array.isArray(editItem.encargos_selecionados) ? editItem.encargos_selecionados as string[] : []);
        setBeneficiosSel(Array.isArray(editItem.beneficios_selecionados) ? editItem.beneficios_selecionados as string[] : []);
        setDescricao(String(editItem.descricao || ""));
      } else {
        setNome("");
        setRegimeContratacao("clt");
        setSalarioBase("");
        setUnidadeSalarial("mensal");
        setLocalTrabalho("campo");
        setJornadaId(jornadas.find((j: any) => j.ativo !== false)?.id || "");
        setRegimeId(regimes.find((r: any) => r.ativo !== false)?.id || "");
        setHorarioAlmocoId(horarios.find((h: any) => h.ativo !== false)?.id || "");
        // Select all active encargos/beneficios by default
        setEncargosSel(encargos.filter((e: any) => e.ativo).map((e: any) => e.id));
        setBeneficiosSel(beneficios.filter((b: any) => b.ativo).map((b: any) => b.id));
        setDescricao("");
      }
    }
  }, [open, editItem, jornadas, regimes, horarios, encargos, beneficios]);

  const toggleEncargo = (id: string) => {
    setEncargosSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleBeneficio = (id: string) => {
    setBeneficiosSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    onSubmit({
      nome,
      regime_contratacao: regimeContratacao,
      salario_base: Number(salarioBase),
      unidade_salarial: unidadeSalarial,
      local_trabalho: localTrabalho,
      jornada_id: jornadaId || null,
      regime_id: regimeId || null,
      horario_almoco_id: horarioAlmocoId || null,
      encargos_selecionados: encargosSel,
      beneficios_selecionados: beneficiosSel,
      descricao: descricao || null,
    });
  };

  const isPJ = regimeContratacao === "pj";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          <DialogDescription>Preencha os dados do cargo e selecione os parâmetros aplicáveis.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Dados Básicos ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-1">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Cargo / Função *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Engenheiro Civil Sênior" />
              </div>
              <div>
                <Label>Regime de Contratação</Label>
                <Select value={regimeContratacao} onValueChange={setRegimeContratacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">CLT (com encargos e benefícios)</SelectItem>
                    <SelectItem value="pj">PJ (apenas salário)</SelectItem>
                    <SelectItem value="estagio">Estágio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local de Trabalho</Label>
                <Select value={localTrabalho} onValueChange={setLocalTrabalho}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campo">Campo</SelectItem>
                    <SelectItem value="escritorio">Escritório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salário Base (R$) *</Label>
                <Input type="number" value={salarioBase} onChange={(e) => setSalarioBase(e.target.value)} />
              </div>
              <div>
                <Label>Tipo Salarial</Label>
                <Select value={unidadeSalarial} onValueChange={setUnidadeSalarial}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="hora">Hora</SelectItem>
                    <SelectItem value="diaria">Diária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Jornada, Regime, Almoço ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-1">Jornada e Regime</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Jornada de Trabalho</Label>
                <Select value={jornadaId} onValueChange={setJornadaId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {jornadas.filter((j: any) => j.ativo !== false).map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.nome} ({j.horas_por_mes}h/mês)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Regime Operacional</Label>
                <Select value={regimeId} onValueChange={setRegimeId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {regimes.filter((r: any) => r.ativo !== false).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nome} ({r.dias_trabalho}/{r.dias_folga})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário de Almoço</Label>
                <Select value={horarioAlmocoId} onValueChange={setHorarioAlmocoId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {horarios.filter((h: any) => h.ativo !== false).map((h: any) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.nome} ({h.duracao_minutos}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Encargos Sociais ── */}
          {!isPJ && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b pb-1">
                <h3 className="text-sm font-semibold text-foreground">Encargos Sociais</h3>
                <span className="text-xs text-muted-foreground">
                  {encargosSel.length} selecionados · {pct(encargos.filter((e: any) => encargosSel.includes(e.id)).reduce((s: number, e: any) => s + Number(e.percentual), 0))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {encargos.filter((e: any) => e.ativo).map((e: any) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors text-sm"
                  >
                    <Checkbox
                      checked={encargosSel.includes(e.id)}
                      onCheckedChange={() => toggleEncargo(e.id)}
                    />
                    <span className="flex-1 truncate">{e.nome}</span>
                    <span className="text-xs text-muted-foreground">{pct(Number(e.percentual))}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Benefícios ── */}
          {!isPJ && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b pb-1">
                <h3 className="text-sm font-semibold text-foreground">Benefícios</h3>
                <span className="text-xs text-muted-foreground">
                  {beneficiosSel.length} selecionados
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {beneficios.filter((b: any) => b.ativo).map((b: any) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors text-sm"
                  >
                    <Checkbox
                      checked={beneficiosSel.includes(b.id)}
                      onCheckedChange={() => toggleBeneficio(b.id)}
                    />
                    <span className="flex-1 truncate">{b.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.tipo === "percentual" ? `${Number(b.valor).toFixed(2)}%` : `R$ ${Number(b.valor).toFixed(2)}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Descrição ── */}
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !nome || !salarioBase}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editItem ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
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

  const allEncargos = useMemo(() => ((encargos || []) as unknown as Encargo[]), [encargos]);
  const allBeneficios = useMemo(() => ((beneficios || []) as unknown as Beneficio[]), [beneficios]);
  const allJornadas = useMemo(() => ((jornadas || []) as unknown as (Jornada & { ativo?: boolean })[]), [jornadas]);
  const allRegimes = useMemo(() => ((regimes || []) as unknown as (Regime & { ativo?: boolean })[]), [regimes]);
  const allHorarios = useMemo(() => ((horarios || []) as unknown as (HorarioAlmoco & { ativo?: boolean })[]), [horarios]);

  // Compute enriched rows with per-cargo selections
  const enriched = useMemo(() => {
    return ((cargos || []) as any[]).map((cargo) => {
      const encargosSel: string[] = Array.isArray(cargo.encargos_selecionados) ? cargo.encargos_selecionados : [];
      const beneficiosSel: string[] = Array.isArray(cargo.beneficios_selecionados) ? cargo.beneficios_selecionados : [];

      const encargosFiltered = encargosSel.length > 0
        ? allEncargos.filter((e: any) => encargosSel.includes(e.id))
        : allEncargos.filter((e) => e.ativo);

      const beneficiosFiltered = beneficiosSel.length > 0
        ? allBeneficios.filter((b: any) => beneficiosSel.includes(b.id))
        : allBeneficios.filter((b) => b.ativo);

      const jornada = cargo.jornada_id
        ? (allJornadas.find((j: any) => j.id === cargo.jornada_id) || null)
        : (allJornadas.find((j) => j.ativo !== false) || null);

      const regime = cargo.regime_id
        ? (allRegimes.find((r: any) => r.id === cargo.regime_id) || null)
        : (allRegimes.find((r) => r.ativo !== false) || null);

      const horario = cargo.horario_almoco_id
        ? (allHorarios.find((h: any) => h.id === cargo.horario_almoco_id) || null)
        : (allHorarios.find((h) => h.ativo !== false) || null);

      const custo = calcularCustoDetalhado(
        cargo as Cargo,
        encargosFiltered,
        beneficiosFiltered,
        jornada,
        regime,
        horario
      );

      return {
        ...cargo,
        _custo: custo,
        _jornada: jornada,
        _regime: regime,
        _horario: horario,
        _numEncargos: encargosFiltered.length,
        _numBeneficios: beneficiosFiltered.length,
        custo_total: custo.custo_total_mensal,
        valor_hh: jornada ? custo.custo_total_mensal / (jornada.horas_por_mes * custo.fator_regime) : 0,
      };
    });
  }, [cargos, allEncargos, allBeneficios, allJornadas, allRegimes, allHorarios]);

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
                    <SortableHeader label="Local" sortKey="local_trabalho" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Salário Base" sortKey="salario_base" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Jornada" sortKey="_jornada.nome" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Encargos" sortKey="_custo.valor_encargos" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Benefícios" sortKey="_custo.valor_beneficios_fixos" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Custo Total/Mês" sortKey="custo_total" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Fator Regime" sortKey="_custo.fator_regime" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Valor H/H" sortKey="valor_hh" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row: any) => {
                    const custo = row._custo;
                    const isPJ = row.regime_contratacao === "pj";
                    const regimeLabel = String(row.regime_contratacao || "clt").toUpperCase();
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
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {row.local_trabalho === "escritorio" ? "Escritório" : "Campo"}
                          </Badge>
                        </td>
                        <td>{fmt(Number(row.salario_base))}</td>
                        <td>
                          <span className="text-xs">
                            {row._jornada ? `${row._jornada.nome}` : "—"}
                          </span>
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
                                <p className="text-xs font-medium mb-1">Encargos: {pct(custo.total_encargos_pct)} ({row._numEncargos} itens)</p>
                                <p className="text-xs text-muted-foreground">
                                  Sobre salário mensal de {fmt(custo.salario_mensal)}
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
                                <p className="text-xs font-medium mb-1">Benefícios ({row._numBeneficios} itens)</p>
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
                                {row._jornada && <p>Jornada: {row._jornada.nome} ({row._jornada.horas_por_mes}h/mês)</p>}
                                {row._regime && <p>Regime: {row._regime.nome} ({row._regime.dias_trabalho}/{row._regime.dias_folga}) — folga remunerada</p>}
                                {row._horario && <p>Almoço: {row._horario.duracao_minutos}min</p>}
                                <p className="font-semibold pt-1 border-t border-border">
                                  Total: {fmt(custo.custo_total_mensal)}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {row._regime ? `${row._regime.dias_trabalho}/${row._regime.dias_folga} (×${(1 / custo.fator_regime).toFixed(3)})` : "—"}
                          </Badge>
                        </td>
                        <td>
                          <span className="font-medium">{fmt(row.valor_hh)}</span>
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

        <CargoFormDialog
          open={formOpen}
          onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}
          editItem={editItem}
          jornadas={jornadas || []}
          regimes={regimes || []}
          horarios={horarios || []}
          encargos={encargos || []}
          beneficios={beneficios || []}
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
