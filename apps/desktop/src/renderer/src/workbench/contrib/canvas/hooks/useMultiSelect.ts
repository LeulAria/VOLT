import { useEffect, useRef, type RefObject } from "react";
import { useTileStore, type CanvasTransform } from "../store/useTileStore";

const MIN_DRAG_DISTANCE = 4;

export default function useMultiSelect(
  canvasRootRef: RefObject<HTMLDivElement | null>,
  transformRef: React.MutableRefObject<CanvasTransform>,
  selectionBoxRef: RefObject<HTMLDivElement | null>,
) {
  const isSelectingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  useEffect(() => {
    const canvasEl = canvasRootRef.current;
    const boxEl = selectionBoxRef.current;
    if (!canvasEl || !boxEl) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      // Only start selection on empty canvas — not on tiles, resize handles, or other UI
      if (target.closest("[data-tile-id]")) return;
      if (target.closest(".canvas-toolbar")) return;
      if (target.closest(".minimap")) return;
      if (target.closest(".offscreen-overlay")) return;
      // Block selection when clicking resize handles (cursor style indicates a resize handle)
      const cursor = window.getComputedStyle(target).cursor;
      if (cursor.includes("resize")) return;

      isSelectingRef.current = true;
      didDragRef.current = false;
      const rect = canvasEl.getBoundingClientRect();
      startRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelectingRef.current) return;

      const rect = canvasEl.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      const dx = curX - startRef.current.x;
      const dy = curY - startRef.current.y;

      // Require minimum drag distance before showing selection box
      if (
        !didDragRef.current &&
        Math.abs(dx) < MIN_DRAG_DISTANCE &&
        Math.abs(dy) < MIN_DRAG_DISTANCE
      ) {
        return;
      }
      didDragRef.current = true;

      // backdrop-filter on .canvas-root creates a containing block, so
      // .selection-box (position:fixed) is positioned relative to .canvas-root,
      // not the viewport. Use canvas-relative coords directly.
      const left = Math.min(startRef.current.x, curX);
      const top = Math.min(startRef.current.y, curY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      boxEl.style.display = "block";
      boxEl.style.left = `${left}px`;
      boxEl.style.top = `${top}px`;
      boxEl.style.width = `${width}px`;
      boxEl.style.height = `${height}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isSelectingRef.current) return;
      isSelectingRef.current = false;

      // Hide selection box
      boxEl.style.display = "none";

      // If didn't drag enough, clear selection and focus
      if (!didDragRef.current) {
        useTileStore.getState().setSelectedIds([]);
        useTileStore.getState().setFocusedId(null);
        return;
      }

      // Convert canvas-relative coords to world coords for tile intersection
      const { x: tx, y: ty, k } = transformRef.current;
      const canvasRect = canvasEl.getBoundingClientRect();
      const sx0 = startRef.current.x;
      const sy0 = startRef.current.y;
      const sx1 = e.clientX - canvasRect.left;
      const sy1 = e.clientY - canvasRect.top;

      const screenLeft = Math.min(sx0, sx1);
      const screenTop = Math.min(sy0, sy1);
      const screenRight = Math.max(sx0, sx1);
      const screenBottom = Math.max(sy0, sy1);

      const wx0 = (screenLeft - tx) / k;
      const wy0 = (screenTop - ty) / k;
      const wx1 = (screenRight - tx) / k;
      const wy1 = (screenBottom - ty) / k;

      // AABB intersection: select tiles that the box touches
      const tiles = useTileStore.getState().tiles;
      const selectedIds: string[] = [];

      for (const tile of Object.values(tiles)) {
        const overlaps =
          tile.x + tile.width > wx0 && tile.x < wx1 && tile.y + tile.height > wy0 && tile.y < wy1;
        if (overlaps) {
          selectedIds.push(tile.id);
        }
      }

      useTileStore.getState().setSelectedIds(selectedIds);
      useTileStore.getState().setFocusedId(null);
    };

    canvasEl.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvasEl.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasRootRef, transformRef, selectionBoxRef]);
}
