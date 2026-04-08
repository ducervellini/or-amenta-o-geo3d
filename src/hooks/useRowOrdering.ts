import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RowOrderItem {
  id: string;
  registro_id: string | null;
  posicao: number;
  subtitulo: string | null;
}

export interface OrderedItem {
  _orderingId: string;
  _isSubtitle: boolean;
  _subtitleText?: string;
  _position: number;
  [key: string]: unknown;
}

export function useRowOrdering(tabela: string, data: Record<string, unknown>[] | undefined) {
  const { user } = useAuth();
  const [ordering, setOrdering] = useState<RowOrderItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load ordering from DB
  useEffect(() => {
    if (!user || !tabela) return;
    supabase
      .from("row_ordering")
      .select("*")
      .eq("tabela", tabela)
      .eq("user_id", user.id)
      .order("posicao", { ascending: true })
      .then(({ data: rows }) => {
        if (rows) {
          setOrdering(rows.map((r: any) => ({
            id: r.id,
            registro_id: r.registro_id,
            posicao: r.posicao,
            subtitulo: r.subtitulo,
          })));
        }
        setLoaded(true);
      });
  }, [user, tabela]);

  // Persist ordering to DB (debounced)
  const persistOrdering = useCallback((items: RowOrderItem[]) => {
    if (!user) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      // Delete old ordering for this table
      await supabase
        .from("row_ordering")
        .delete()
        .eq("tabela", tabela)
        .eq("user_id", user.id);

      if (items.length > 0) {
        const rows = items.map((item, idx) => ({
          tabela,
          registro_id: item.registro_id,
          posicao: idx,
          subtitulo: item.subtitulo,
          user_id: user.id,
        }));
        await supabase.from("row_ordering").insert(rows);
      }
    }, 500);
  }, [user, tabela]);

  // Build ordered list combining data + subtitles
  const getOrderedItems = useCallback((): OrderedItem[] => {
    if (!data) return [];
    if (!loaded || ordering.length === 0) {
      // No custom ordering: return data as-is
      return data.map((row, idx) => ({
        ...row,
        _orderingId: `row-${String(row.id)}`,
        _isSubtitle: false,
        _position: idx,
      }));
    }

    const dataMap = new Map(data.map(row => [String(row.id), row]));
    const result: OrderedItem[] = [];

    // First add items that are in the ordering
    const orderedIds = new Set<string>();
    for (const item of ordering) {
      if (item.subtitulo && !item.registro_id) {
        result.push({
          id: item.id,
          _orderingId: `sub-${item.id}`,
          _isSubtitle: true,
          _subtitleText: item.subtitulo,
          _position: result.length,
        });
      } else if (item.registro_id) {
        const row = dataMap.get(item.registro_id);
        if (row) {
          orderedIds.add(item.registro_id);
          result.push({
            ...row,
            _orderingId: `row-${item.registro_id}`,
            _isSubtitle: false,
            _position: result.length,
          });
        }
      }
    }

    // Then add any new items not in the ordering
    for (const row of data) {
      if (!orderedIds.has(String(row.id))) {
        result.push({
          ...row,
          _orderingId: `row-${String(row.id)}`,
          _isSubtitle: false,
          _position: result.length,
        });
      }
    }

    return result;
  }, [data, ordering, loaded]);

  const updateOrdering = useCallback((newItems: OrderedItem[]) => {
    const newOrdering: RowOrderItem[] = newItems.map((item, idx) => ({
      id: item._isSubtitle ? String(item.id) : `pos-${idx}`,
      registro_id: item._isSubtitle ? null : String(item.id),
      posicao: idx,
      subtitulo: item._isSubtitle ? (item._subtitleText || null) : null,
    }));
    setOrdering(newOrdering);
    persistOrdering(newOrdering);
  }, [persistOrdering]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    const items = getOrderedItems();
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return;
    const moved = items.splice(fromIndex, 1)[0];
    items.splice(toIndex, 0, moved);
    updateOrdering(items);
  }, [getOrderedItems, updateOrdering]);

  const insertSubtitle = useCallback((text: string, atIndex?: number) => {
    const items = getOrderedItems();
    const newSub: OrderedItem = {
      id: crypto.randomUUID(),
      _orderingId: `sub-${crypto.randomUUID()}`,
      _isSubtitle: true,
      _subtitleText: text,
      _position: 0,
    };
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= items.length) {
      items.splice(atIndex, 0, newSub);
    } else {
      items.push(newSub);
    }
    updateOrdering(items);
  }, [getOrderedItems, updateOrdering]);

  const removeSubtitle = useCallback((orderingId: string) => {
    const items = getOrderedItems().filter(i => i._orderingId !== orderingId);
    updateOrdering(items);
  }, [getOrderedItems, updateOrdering]);

  const editSubtitle = useCallback((orderingId: string, newText: string) => {
    const items = getOrderedItems().map(i =>
      i._orderingId === orderingId ? { ...i, _subtitleText: newText } : i
    );
    updateOrdering(items);
  }, [getOrderedItems, updateOrdering]);

  return {
    orderedItems: getOrderedItems(),
    moveItem,
    insertSubtitle,
    removeSubtitle,
    editSubtitle,
    updateOrdering,
    loaded,
  };
}
