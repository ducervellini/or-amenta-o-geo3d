import { useState, useCallback, useRef } from "react";

export function useColumnResize(columnKeys: string[], defaultWidths?: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths || {});
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest("th");
    const startWidth = th ? th.getBoundingClientRect().width : 120;
    resizing.current = { key, startX: e.clientX, startWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const diff = ev.clientX - resizing.current.startX;
      const newWidth = Math.max(50, resizing.current.startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizing.current!.key]: newWidth }));
    };

    const onMouseUp = () => {
      resizing.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const getHeaderProps = useCallback(
    (key: string) => ({
      style: columnWidths[key] ? { width: columnWidths[key], minWidth: columnWidths[key] } : undefined,
      onResizeStart: (e: React.MouseEvent) => onResizeStart(key, e),
    }),
    [columnWidths, onResizeStart]
  );

  return { columnWidths, getHeaderProps };
}
