import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
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
  const deleteComposicao = useSupabaseDelete("composicoes");

  const filtered = (composicoes || []).filter(
    (c) =>
      String(c.nome).toLowerCase().includes(search.toLowerCase()) ||
      String(c.codigo).toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (!deletingId) return;
    deleteComposicao.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
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
          Nova Composição
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar composição..."
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
                  <th>Código</th>
                  <th>Composição</th>
                  <th>Serviço</th>
                  <th>Unidade</th>
                  <th>Custo Unitário</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma composição encontrada
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const servico = servicos?.find((s) => s.id === c.servico_id);
                    return (
                      <tr key={String(c.id)} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/composicoes/${c.id}`)}>
                        <td className="font-medium text-accent">{String(c.codigo)}</td>
                        <td className="font-medium">{String(c.nome)}</td>
                        <td>
                          {servico ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                              {String(servico.nome)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Avulsa</span>
                          )}
                        </td>
                        <td>{String(c.unidade)}</td>
                        <td className="font-semibold font-mono">
                          R$ {fmt(Number(c.custo_unitario_total) || 0)}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/composicoes/${c.id}`); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingId(String(c.id)); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
