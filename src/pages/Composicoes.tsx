import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export default function Composicoes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: composicoes, isLoading } = useSupabaseQuery("composicoes");
  const { data: servicos } = useSupabaseQuery("servicos");
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: modulos } = useSupabaseQuery("modulos");
  const deleteComposicao = useSupabaseDelete("composicoes");

  // Merge: composições avulsas + serviços sem composição
  const composicaoRows = (composicoes || []).map((c) => {
    const servico = servicos?.find((s) => s.id === c.servico_id);
    return {
      type: "composicao" as const,
      id: String(c.id),
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

  // Serviços que ainda não têm composição
  const servicosSemComposicao = (servicos || []).filter(
    (s) => !(composicoes || []).some((c) => c.servico_id === s.id)
  ).map((s) => ({
    type: "servico" as const,
    id: String(s.id),
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

  const filtered = allRows.filter(
    (r) =>
      r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (!deletingId) return;
    deleteComposicao.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
  };

  const handleRowClick = (row: typeof allRows[0]) => {
    if (row.type === "composicao") {
      navigate(`/composicoes/${row.id}`);
    } else {
      // Criar composição a partir do serviço
      navigate(`/composicoes/novo?servico_id=${row.id}`);
    }
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
          <ComposicoesTableContent filtered={filtered} handleRowClick={handleRowClick} getMercadoNome={getMercadoNome} getAreaNome={getAreaNome} getModuloNome={getModuloNome} navigate={navigate} setDeletingId={setDeletingId} />
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
