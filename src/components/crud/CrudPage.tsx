import { useState } from "react";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrudFormDialog, FieldConfig } from "./CrudFormDialog";
import {
  useSupabaseQuery,
  useSupabaseInsert,
  useSupabaseUpdate,
  useSupabaseDelete,
} from "@/hooks/useSupabaseCrud";
import { Database } from "@/integrations/supabase/types";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
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

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface CrudPageProps<T extends TableName> {
  table: T;
  title: string;
  subtitle: string;
  columns: ColumnConfig[];
  formFields: FieldConfig[];
  searchField?: string;
  filter?: { column: string; value: unknown };
  defaultFilters?: Record<string, unknown>;
  hiddenDefaults?: Record<string, unknown>;
  onFieldChange?: (fieldName: string, value: unknown, allValues: Record<string, unknown>) => Record<string, unknown> | undefined;
}

function SortableTable({ data, columns, onEdit, onDelete }: {
  data: Record<string, unknown>[];
  columns: ColumnConfig[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const { sorted, sortKey, sortDirection, handleSort } = useTableSort(data);
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
            ))}
            <th className="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row: any) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "-")}
                </td>
              ))}
              <td className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(row.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CrudPage<T extends TableName>({
  table, title, subtitle, columns, formFields, searchField, filter, defaultFilters, hiddenDefaults,
}: CrudPageProps<T>) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useSupabaseQuery(table, { filter, filters: defaultFilters });
  const insertMutation = useSupabaseInsert(table);
  const updateMutation = useSupabaseUpdate(table);
  const deleteMutation = useSupabaseDelete(table);

  const filtered = (data || []).filter((row: any) => {
    if (!search || !searchField) return true;
    return String(row[searchField] || "").toLowerCase().includes(search.toLowerCase());
  });

  const handleSubmit = (values: Record<string, unknown>) => {
    const mergedValues = { ...hiddenDefaults, ...values };
    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id as string, values: mergedValues as any },
        { onSuccess: () => { setFormOpen(false); setEditItem(null); } }
      );
    } else {
      insertMutation.mutate(mergedValues as any, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleEdit = (item: Record<string, unknown>) => { setEditItem(item); setFormOpen(true); };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        {searchField && (
          <div className="p-4 border-b">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum registro encontrado
          </div>
        ) : (
          <SortableTable data={filtered} columns={columns} onEdit={handleEdit} onDelete={(id) => setDeleteId(id)} />
        )}
      </div>

      <CrudFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}
        title={editItem ? `Editar ${title}` : `Novo ${title}`}
        fields={formFields}
        initialValues={editItem || undefined}
        onSubmit={handleSubmit}
        loading={insertMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
