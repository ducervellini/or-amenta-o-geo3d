import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Loader2, ChevronRight, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

type RowData = {
  type: "composicao" | "servico";
  id: string;
  ordem_id: string;
  codigo: string;
  nome: string;
  mercado_id: unknown;
  area_empresa_id: unknown;
  modulo_id: unknown;
  descricao: unknown;
  unidade: string;
  custo_unitario_total: number;
  servico_id: unknown;
  isAvulsa: boolean;
  grupo_nome?: string;
};

function ServiceRow({ row, navigate, setDeletingId, getMercadoNome, getAreaNome, getModuloNome }: {
  row: RowData;
  navigate: (path: string) => void;
  setDeletingId: (id: string) => void;
  getMercadoNome: (id: string | null | undefined) => string;
  getAreaNome: (id: string | null | undefined) => string;
  getModuloNome: (id: string | null | undefined) => string;
}) {
  const handleClick = () => {
    if (row.type === "composicao") navigate(`/composicoes/${row.id}`);
    else navigate(`/composicoes/novo?servico_id=${row.id}`);
  };

  return (
    <tr className="cursor-pointer hover:bg-muted/50" onClick={handleClick}>
      <td></td>
      <td className="font-mono text-xs font-semibold">{row.ordem_id || "-"}</td>
      <td className="text-sm text-muted-foreground">{row.grupo_nome || "-"}</td>
      <td className="font-medium text-accent">{row.codigo}</td>
      <td className="font-medium">{row.nome}</td>
      <td className="text-sm">{getMercadoNome(row.mercado_id as string | null)}</td>
      <td>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
          {getAreaNome(row.area_empresa_id as string | null)}
        </span>
      </td>
      <td className="text-sm">{getModuloNome(row.modulo_id as string | null)}</td>
      <td className="text-sm text-muted-foreground max-w-[200px] truncate">{row.descricao ? String(row.descricao) : "-"}</td>
      <td className="text-sm">{row.unidade}</td>
      <td className="font-semibold font-mono">
        {row.type === "composicao" ? `R$ ${fmt(row.custo_unitario_total)}` : <span className="text-xs text-muted-foreground italic">Sem composição</span>}
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          {row.type === "composicao" ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/composicoes/${row.id}`); }}><Eye className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/composicoes/${row.id}`); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingId(row.id); }}><Trash2 className="w-4 h-4" /></Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/composicoes/novo?servico_id=${row.id}`); }}>
              <Plus className="w-3 h-3 mr-1" />Criar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Composicoes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: composicoes, isLoading } = useSupabaseQuery("composicoes");
  const { data: servicos } = useSupabaseQuery("servicos");
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: modulos } = useSupabaseQuery("modulos");
  const { data: grupos } = useSupabaseQuery("grupos_servicos", { orderBy: "nome", ascending: true });
  const { data: vinculos } = useSupabaseQuery("grupos_servicos_servicos");
  const deleteComposicao = useSupabaseDelete("composicoes");

  const composicaoRows = (composicoes || []).map((c) => {
    const servico = servicos?.find((s) => s.id === c.servico_id);
    return {
      type: "composicao" as const,
      id: String(c.id),
      ordem_id: servico ? String((servico as any).ordem_id || "") : String((c as any).ordem_id || ""),
      codigo: servico ? String(servico.codigo) : String(c.codigo),
      nome: servico ? String(servico.nome) : String(c.nome),
      mercado_id: servico?.mercado_id,
      area_empresa_id: servico?.area_empresa_id,
      modulo_id: servico?.modulo_id,
      descricao: servico ? servico.descricao : c.descricao,
      unidade: servico ? String(servico.unidade_medicao) : String(c.unidade),
      custo_unitario_total: Number(c.custo_unitario_total) || 0,
      servico_id: c.servico_id,
      isAvulsa: !c.servico_id,
    };
  });

  const servicosSemComposicao = (servicos || []).filter(
    (s) => !(composicoes || []).some((c) => c.servico_id === s.id)
  ).map((s) => ({
    type: "servico" as const,
    id: String(s.id),
    ordem_id: String((s as any).ordem_id || ""),
    codigo: String(s.codigo),
    nome: String(s.nome),
    mercado_id: s.mercado_id,
    area_empresa_id: s.area_empresa_id,
    modulo_id: s.modulo_id,
    descricao: s.descricao,
    unidade: String(s.unidade_medicao),
    custo_unitario_total: 0,
    servico_id: String(s.id),
    isAvulsa: false,
  }));

  const allRows = [...composicaoRows, ...servicosSemComposicao];
  const { sorted: sortedAllRows, sortKey, sortDirection, handleSort } = useTableSort<RowData>(allRows);

  // Fixed activity order
  const ORDEM_ATIVIDADES = ["cadastro", "p&m", "avaliação", "negociação", "jurídico", "regularização"];
  const getOrdemIndex = (nome: string) => {
    const idx = ORDEM_ATIVIDADES.findIndex((a) => nome.toLowerCase().startsWith(a));
    return idx === -1 ? ORDEM_ATIVIDADES.length : idx;
  };

  // Build group structure
  const grupoRows = (grupos || []).sort((a, b) => getOrdemIndex(String(a.nome)) - getOrdemIndex(String(b.nome))).map((g) => {
    const servicoIds = (vinculos || []).filter((v) => v.grupo_id === g.id).map((v) => String(v.servico_id));
    const rows = sortedAllRows.filter((r) => {
      const sId = r.type === "composicao" ? String(r.servico_id || "") : r.id;
      return servicoIds.includes(sId);
    });
    return { grupo: g, rows, servicoIds };
  });

  // Services not in any group (avulsas)
  const allGroupedServiceIds = new Set(
    (vinculos || []).map((v) => String(v.servico_id))
  );
  const avulsaRows = sortedAllRows.filter((r) => {
    if (r.isAvulsa) return true; // composições avulsas always show
    const sId = r.type === "composicao" ? String(r.servico_id || "") : r.id;
    return !allGroupedServiceIds.has(sId);
  });

  const matchesSearch = (r: RowData) =>
    r.nome.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo.toLowerCase().includes(search.toLowerCase());

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteComposicao.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
  };

  const getMercadoNome = (id: string | null | undefined) => {
    if (!id) return "-";
    const m = mercados?.find((m) => m.id === id);
    return m ? String(m.nome) : "-";
  };
  const getAreaNome = (id: string | null | undefined) => {
    if (!id) return "-";
    const a = areasEmpresa?.find((a) => a.id === id);
    return a ? String(a.nome) : "-";
  };
  const getModuloNome = (id: string | null | undefined) => {
    if (!id) return "-";
    const d = modulos?.find((d) => d.id === id);
    return d ? String(d.nome) : "-";
  };

  const cols = [
    { key: "expand", label: "" },
    { key: "ordem_id", label: "ID" },
    { key: "grupo_nome", label: "Grupo" },
    { key: "codigo", label: "Código" },
    { key: "nome", label: "Nome" },
    { key: "mercado_id", label: "Mercado" },
    { key: "area_empresa_id", label: "Área da Empresa" },
    { key: "modulo_id", label: "Departamento" },
    { key: "descricao", label: "Descrição" },
    { key: "unidade", label: "Unidade" },
    { key: "custo_unitario_total", label: "Custo Unitário" },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Composições de Serviço</h1>
          <p className="page-subtitle">Composições analíticas de custos unitários</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/composicoes/novo")}>
          <Plus className="w-4 h-4" />
          Nova Composição Avulsa
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
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
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  {cols.slice(1).map((col) => (
                    <SortableHeader
                      key={col.key}
                      label={col.label}
                      sortKey={col.key}
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* Groups */}
                {grupoRows.map(({ grupo, rows }) => {
                  const filteredRows = search ? rows.filter(matchesSearch) : rows;
                  if (search && filteredRows.length === 0) return null;
                  const isExpanded = expandedGroups.has(String(grupo.id));
                  const custoTotal = rows.reduce((sum, r) => sum + (r.type === "composicao" ? r.custo_unitario_total : 0), 0);

                  return (
                    <React.Fragment key={String(grupo.id)}>
                      <tr
                        className="bg-muted/30 hover:bg-muted/50 cursor-pointer font-medium"
                        onClick={() => toggleGroup(String(grupo.id))}
                      >
                        <td className="w-10">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-accent" />
                            <span className="text-accent font-semibold">{String(grupo.nome)}</span>
                          </div>
                        </td>
                        <td colSpan={7} className="text-sm text-muted-foreground">
                          {rows.length} serviço{rows.length !== 1 ? "s" : ""}
                        </td>
                        <td className="font-semibold font-mono">
                          {custoTotal > 0 ? `R$ ${fmt(custoTotal)}` : "-"}
                        </td>
                        <td></td>
                      </tr>
                      {isExpanded && (search ? filteredRows : rows).map((row) => (
                        <ServiceRow
                          key={`${row.type}-${row.id}`}
                          row={{ ...row, grupo_nome: String(grupo.nome) }}
                          navigate={navigate}
                          setDeletingId={setDeletingId}
                          getMercadoNome={getMercadoNome}
                          getAreaNome={getAreaNome}
                          getModuloNome={getModuloNome}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Ungrouped / avulsa rows */}
                {avulsaRows.filter(matchesSearch).length > 0 && grupoRows.length > 0 && (
                  <tr className="bg-muted/20">
                    <td colSpan={12} className="text-xs font-semibold text-muted-foreground py-2">
                      Sem grupo
                    </td>
                  </tr>
                )}
                {avulsaRows.filter(matchesSearch).map((row) => (
                  <ServiceRow
                    key={`${row.type}-${row.id}`}
                    row={row}
                    navigate={navigate}
                    setDeletingId={setDeletingId}
                    getMercadoNome={getMercadoNome}
                    getAreaNome={getAreaNome}
                    getModuloNome={getModuloNome}
                  />
                ))}

                {grupoRows.length === 0 && avulsaRows.filter(matchesSearch).length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma composição encontrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover composição?</AlertDialogTitle>
            <AlertDialogDescription>Todos os itens da composição serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
