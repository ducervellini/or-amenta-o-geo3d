import { useState } from "react";
import { Plus, Search, Edit, Trash2, Loader2, Columns3, ChevronUp, ChevronDown, Type, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CrudFormDialog, FieldConfig } from "./CrudFormDialog";
import {
  useSupabaseQuery,
  useSupabaseInsert,
  useSupabaseUpdate,
  useSupabaseDelete,
} from "@/hooks/useSupabaseCrud";
import { Database } from "@/integrations/supabase/types";
import { SortableHeader, useTableSort } from "@/components/ui/sortable-header";
import { useRowOrdering, OrderedItem } from "@/hooks/useRowOrdering";
import { SortableRow } from "@/components/ui/sortable-row";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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

function SubtitleRow({
  item,
  colSpan,
  onEdit,
  onRemove,
}: {
  item: OrderedItem;
  colSpan: number;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item._subtitleText || "");

  return (
    <>
      <td colSpan={colSpan} className="py-2 px-4">
        {editing ? (
          <input
            autoFocus
            className="text-sm font-semibold bg-transparent border-b border-primary outline-none w-full"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { onEdit(item._orderingId, text); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onEdit(item._orderingId, text); setEditing(false); } }}
          />
        ) : (
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">
            {item._subtitleText}
          </span>
        )}
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(item._orderingId)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </>
  );
}

function OrderableTable({
  data,
  columns,
  onEdit,
  onDelete,
  visibleCols,
  tableName,
}: {
  data: Record<string, unknown>[];
  columns: ColumnConfig[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  visibleCols: Set<string>;
  tableName: string;
}) {
  const visible = columns.filter((c) => visibleCols.has(c.key));
  const { orderedItems, moveItem, insertSubtitle, removeSubtitle, editSubtitle, updateOrdering } =
    useRowOrdering(tableName, data);

  const [showSubInput, setShowSubInput] = useState(false);
  const [subText, setSubText] = useState("");

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
    if (subText.trim()) {
      insertSubtitle(subText.trim());
      setSubText("");
      setShowSubInput(false);
    }
  };

  const totalColSpan = visible.length + 1; // +1 for grip col

  return (
    <div>
      <div className="px-4 py-2 border-b flex items-center gap-2 sticky top-0 z-10 bg-card">
        {showSubInput ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              placeholder="Texto do subtítulo..."
              className="text-sm px-2 py-1 bg-muted rounded border-0 outline-none focus:ring-2 focus:ring-ring"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtitle(); if (e.key === "Escape") setShowSubInput(false); }}
            />
            <Button size="sm" variant="outline" onClick={handleAddSubtitle}>Adicionar</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSubInput(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowSubInput(true)}>
            <Type className="w-3 h-3" /> Inserir subtítulo
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                {visible.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <SortableContext items={orderedItems.map((i) => i._orderingId)} strategy={verticalListSortingStrategy}>
              <tbody>
                {orderedItems.map((item, idx) => (
                  <SortableRow key={item._orderingId} id={item._orderingId} isSubtitle={item._isSubtitle}>
                    {item._isSubtitle ? (
                      <SubtitleRow item={item} colSpan={totalColSpan} onEdit={editSubtitle} onRemove={removeSubtitle} />
                    ) : (
                      <>
                        {visible.map((col) => (
                          <td key={col.key}>
                            {col.render ? col.render(item[col.key], item as Record<string, unknown>) : String(item[col.key] ?? "-")}
                          </td>
                        ))}
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item as Record<string, unknown>)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(String(item.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </SortableRow>
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

export function CrudPage<T extends TableName>({
  table, title, subtitle, columns, formFields, searchField, filter, defaultFilters, hiddenDefaults, onFieldChange,
}: CrudPageProps<T>) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(columns.map((c) => c.key)));

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

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
        <div className="p-4 border-b flex items-center gap-3">
          {searchField && (
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
          )}
          <div className="ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns3 className="w-4 h-4" /> Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-3 space-y-2">
                {columns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={visibleCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                    {col.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
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
          <OrderableTable
            data={filtered}
            columns={columns}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
            visibleCols={visibleCols}
            tableName={table}
          />
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
        onFieldChange={onFieldChange}
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
