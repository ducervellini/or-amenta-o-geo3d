import { useEffect } from "react";

/**
 * Global column resize: attaches mousedown listeners to all <th> elements
 * inside .data-table and shadcn Table (w-full caption-bottom).
 * Drag the right edge of any header to resize.
 */
export function useGlobalColumnResize() {
  useEffect(() => {
    const EDGE_PX = 6;

    function isNearRightEdge(th: HTMLTableCellElement, clientX: number) {
      const rect = th.getBoundingClientRect();
      return clientX >= rect.right - EDGE_PX;
    }

    function onMouseDown(e: MouseEvent) {
      const th = (e.target as HTMLElement).closest("th") as HTMLTableCellElement | null;
      if (!th) return;
      if (!isNearRightEdge(th, e.clientX)) return;

      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = th.offsetWidth;

      th.style.width = `${startWidth}px`;
      th.style.minWidth = `${startWidth}px`;

      const table = th.closest("table");
      if (table) table.style.tableLayout = "fixed";

      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(40, startWidth + (ev.clientX - startX));
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
      const th = (e.target as HTMLElement).closest("th") as HTMLTableCellElement | null;
      if (!th) return;
      th.style.cursor = isNearRightEdge(th, e.clientX) ? "col-resize" : "";
    }

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);
}
