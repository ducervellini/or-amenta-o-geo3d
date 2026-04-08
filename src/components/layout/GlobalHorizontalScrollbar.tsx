import { useCallback, useEffect, useRef, useState } from "react";

const SCROLLABLE_SELECTORS = [
  ".app-layout-main .overflow-x-auto",
  ".app-layout-main .overflow-auto",
  ".app-layout-main .overflow-scroll",
].join(", ");

type ScrollMetrics = {
  left: number;
  right: number;
  width: number;
  clientWidth: number;
  scrollWidth: number;
};

const isElementVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
};

const getVisibleArea = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));

  return visibleWidth * visibleHeight;
};

const getBestScrollableElement = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(SCROLLABLE_SELECTORS)).filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      isElementVisible(element) &&
      element.scrollWidth > element.clientWidth + 4 &&
      ["auto", "scroll", "overlay"].includes(style.overflowX)
    );
  });

  return candidates.sort((a, b) => getVisibleArea(b) - getVisibleArea(a))[0] ?? null;
};

export function GlobalHorizontalScrollbar() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const syncingFromBar = useRef(false);
  const syncingFromTarget = useRef(false);

  const updateMetrics = useCallback((element: HTMLElement | null) => {
    if (!element) {
      setMetrics(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const left = Math.max(rect.left, 0);
    const right = Math.max(window.innerWidth - Math.min(rect.right, window.innerWidth), 0);
    const width = Math.max(0, window.innerWidth - left - right);

    setMetrics({
      left,
      right,
      width,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    });

    if (barRef.current && Math.abs(barRef.current.scrollLeft - element.scrollLeft) > 1) {
      syncingFromTarget.current = true;
      barRef.current.scrollLeft = element.scrollLeft;
      requestAnimationFrame(() => {
        syncingFromTarget.current = false;
      });
    }
  }, []);

  const refreshTarget = useCallback(() => {
    const nextTarget = getBestScrollableElement();
    setTarget((current) => (current === nextTarget ? current : nextTarget));
    updateMetrics(nextTarget);
  }, [updateMetrics]);

  useEffect(() => {
    let frame = 0;

    const scheduleRefresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refreshTarget);
    };

    refreshTarget();

    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("scroll", scheduleRefresh, true);

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("scroll", scheduleRefresh, true);
    };
  }, [refreshTarget]);

  useEffect(() => {
    if (!target) return;

    const handleTargetScroll = () => {
      if (syncingFromBar.current) return;
      updateMetrics(target);
    };

    const resizeObserver = new ResizeObserver(() => updateMetrics(target));
    target.addEventListener("scroll", handleTargetScroll, { passive: true });
    resizeObserver.observe(target);

    if (target.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(target.firstElementChild);
    }

    updateMetrics(target);

    return () => {
      target.removeEventListener("scroll", handleTargetScroll);
      resizeObserver.disconnect();
    };
  }, [target, updateMetrics]);

  const handleBarScroll = () => {
    if (!target || !barRef.current || syncingFromTarget.current) return;

    syncingFromBar.current = true;
    target.scrollLeft = barRef.current.scrollLeft;

    requestAnimationFrame(() => {
      syncingFromBar.current = false;
    });
  };

  if (!target || !metrics || metrics.scrollWidth <= metrics.clientWidth + 4) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 z-40 pointer-events-none"
      style={{ left: metrics.left, right: metrics.right }}
    >
      <div className="rounded-t-md border border-border bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div
          ref={barRef}
          className="h-5 overflow-x-auto overflow-y-hidden pointer-events-auto"
          onScroll={handleBarScroll}
        >
          <div style={{ width: metrics.scrollWidth, height: 1 }} />
        </div>
      </div>
    </div>
  );
}
