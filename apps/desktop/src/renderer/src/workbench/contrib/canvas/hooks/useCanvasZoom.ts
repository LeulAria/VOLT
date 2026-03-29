import { useLayoutEffect, useRef, type RefObject } from "react";
import { zoom, zoomIdentity, select, type D3ZoomEvent } from "d3";
import { useTileStore, type CanvasTransform } from "../store/useTileStore";
import { useTabStore } from "../store/useTabStore";

export default function useCanvasZoom(
  canvasRootRef: RefObject<HTMLDivElement | null>,
  worldRef: RefObject<HTMLDivElement | null>,
  gridRef: RefObject<{
    draw: (transform: CanvasTransform, viewport: { width: number; height: number }) => void;
  } | null>,
  zoomHudRef: RefObject<{ show: (k: number) => void } | null>,
  transformRef: React.MutableRefObject<CanvasTransform>,
  onTransform: (transform: CanvasTransform) => void,
) {
  const zoomBehaviorRef = useRef<ReturnType<typeof zoom<HTMLDivElement, unknown>> | null>(null);

  useLayoutEffect(() => {
    const canvasEl = canvasRootRef.current;
    if (!canvasEl) return;

    const applyTransform = (x: number, y: number, k: number) => {
      transformRef.current = { x, y, k };

      if (worldRef.current) {
        const rx = Math.round(x * 2) / 2;
        const ry = Math.round(y * 2) / 2;
        worldRef.current.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${k})`;
      }

      if (gridRef.current) {
        gridRef.current.draw(
          { x, y, k },
          {
            width: canvasEl.clientWidth || window.innerWidth,
            height: canvasEl.clientHeight || window.innerHeight,
          },
        );
      }

      if (zoomHudRef.current) {
        zoomHudRef.current.show(k);
      }

      onTransform({ x, y, k });
    };

    // D3 zoom: only handles middle-click drag for panning
    // Wheel and touch are handled manually below for correct trackpad/gesture behavior
    const zoomBehavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.3, 2.0])
      .filter((event: Event) => {
        // Middle-click drag only — wheel and touch handled manually
        if (event.type === "mousedown" && (event as MouseEvent).button === 1) return true;
        return false;
      })
      .on("zoom", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        const { x, y, k } = event.transform;
        applyTransform(x, y, k);
      })
      .on("end", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        const { x, y, k } = event.transform;
        useTileStore.getState().setTransform({ x, y, k });
      });

    zoomBehaviorRef.current = zoomBehavior;

    const selection = select(canvasEl);
    selection.call(zoomBehavior);

    // Restore saved transform — use worldCenter for drift-free restore when
    // viewport size differs from when the transform was saved.
    const { transform: storedTransform, worldCenter } = useTileStore.getState();
    let initial: { x: number; y: number; k: number };
    if (storedTransform.k > 0 && worldCenter) {
      const k = storedTransform.k;
      const vw = canvasEl.clientWidth || window.innerWidth;
      const vh = canvasEl.clientHeight || window.innerHeight;
      initial = { x: vw / 2 - worldCenter.cx * k, y: vh / 2 - worldCenter.cy * k, k };
    } else if (storedTransform.k > 0) {
      initial = storedTransform;
    } else {
      initial = { x: 0, y: 0, k: 0.65 };
    }
    transformRef.current = initial;
    zoomBehavior.transform(
      selection,
      zoomIdentity.translate(initial.x, initial.y).scale(initial.k),
    );

    // Initial grid draw
    if (gridRef.current) {
      gridRef.current.draw(initial, {
        width: canvasEl.clientWidth || window.innerWidth,
        height: canvasEl.clientHeight || window.innerHeight,
      });
    }

    // Prevent browser handling of touch gestures
    canvasEl.style.touchAction = "none";

    // ─── WHEEL HANDLER (trackpad + mouse) ───
    // ctrlKey/metaKey + wheel = ZOOM (trackpad pinch sends this)
    // plain wheel = PAN (trackpad two-finger scroll sends this)
    //
    // Registered on `window` in CAPTURE phase so it fires before any child
    // handler (e.g. xterm.js viewport scroll). For focused tiles we bail out
    // and let xterm handle scroll normally; for everything else we claim the
    // event for canvas zoom / pan.
    const handleWheel = (e: WheelEvent) => {
      // Only intercept wheel events when the canvas tab is active
      if (useTabStore.getState().activeTabId !== "canvas") return;

      // Let side panels and their content scroll freely
      if ((e.target as HTMLElement)?.closest?.("[data-tile-side-panel]")) return;

      // Let any overlay/dialog that manages its own scroll handle wheel events
      if ((e.target as HTMLElement)?.closest?.("[data-canvas-scroll-exempt]")) return;

      // Ignore events outside our canvas
      const rect = canvasEl.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        return;

      // If cursor is over a focused tile with Cmd/Ctrl → always allow zoom
      // If cursor is over a focused tile without Cmd/Ctrl → allow pan/scroll
      // (No early return - let all wheel events through for canvas panning/zooming)
      // (No early return - let all wheel events through for canvas panning/zooming)

      // Canvas zoom / pan
      e.preventDefault();
      e.stopImmediatePropagation();

      if (e.ctrlKey || e.metaKey) {
        const scaleFactor = Math.pow(2, -e.deltaY * 0.01);
        zoomBehavior.scaleBy(selection, scaleFactor, [e.clientX, e.clientY] as any);
      } else {
        const speed = 2.5;
        const dx = (e.shiftKey ? -e.deltaY : -e.deltaX) * speed;
        const dy = (e.shiftKey ? 0 : -e.deltaY) * speed;
        zoomBehavior.translateBy(selection, dx, dy);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    // ─── TOUCH HANDLERS: simultaneous 2-finger pan + pinch zoom ───
    let prevTouches: { x1: number; y1: number; x2: number; y2: number } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (useTabStore.getState().activeTabId !== "canvas") return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const [t1, t2] = e.touches;
        prevTouches = {
          x1: t1.clientX,
          y1: t1.clientY,
          x2: t2.clientX,
          y2: t2.clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (useTabStore.getState().activeTabId !== "canvas") return;
      if (e.touches.length !== 2 || !prevTouches) return;
      e.preventDefault();

      const [t1, t2] = e.touches;
      const cur = {
        x1: t1.clientX,
        y1: t1.clientY,
        x2: t2.clientX,
        y2: t2.clientY,
      };

      // Previous state
      const prevDx = prevTouches.x2 - prevTouches.x1;
      const prevDy = prevTouches.y2 - prevTouches.y1;
      const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      const prevMidX = (prevTouches.x1 + prevTouches.x2) / 2;
      const prevMidY = (prevTouches.y1 + prevTouches.y2) / 2;

      // Current state
      const curDx = cur.x2 - cur.x1;
      const curDy = cur.y2 - cur.y1;
      const curDist = Math.sqrt(curDx * curDx + curDy * curDy);
      const curMidX = (cur.x1 + cur.x2) / 2;
      const curMidY = (cur.y1 + cur.y2) / 2;

      // Apply BOTH pan and zoom simultaneously in one frame
      const panDeltaX = curMidX - prevMidX;
      const panDeltaY = curMidY - prevMidY;
      const scaleFactor = prevDist > 0 ? curDist / prevDist : 1;

      // Pan first, then scale around midpoint
      zoomBehavior.translateBy(selection, panDeltaX, panDeltaY);
      if (Math.abs(scaleFactor - 1) > 0.001) {
        zoomBehavior.scaleBy(selection, scaleFactor, [curMidX, curMidY] as any);
      }

      prevTouches = cur;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        prevTouches = null;
        // Persist transform on gesture end
        const t = transformRef.current;
        useTileStore.getState().setTransform(t);
      }
    };

    canvasEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      selection.on(".zoom", null);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      canvasEl.removeEventListener("touchstart", handleTouchStart);
      canvasEl.removeEventListener("touchmove", handleTouchMove);
      canvasEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [transformRef, onTransform]);

  return zoomBehaviorRef;
}
