import { memo, useMemo, useEffect, useState, type RefObject } from "react";
import { useTileStore, type CanvasTransform } from "./store/useTileStore";

interface OffscreenIndicatorsProps {
  transform: CanvasTransform;
  viewport: { width: number; height: number };
  canvasRootRef: RefObject<HTMLDivElement | null>;
}

interface Indicator {
  id: string;
  x: number;
  y: number;
  color: string;
}

const MARGIN = 14;

const OffscreenIndicators = memo(function OffscreenIndicators({
  transform,
  viewport,
  canvasRootRef,
}: OffscreenIndicatorsProps) {
  const tiles = useTileStore((state) => state.tiles);

  // Use actual canvas element dimensions so sidebar offset is accounted for
  const [canvasSize, setCanvasSize] = useState({ width: viewport.width, height: viewport.height });

  useEffect(() => {
    const el = canvasRootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasRootRef]);

  const indicators = useMemo(() => {
    const result: Indicator[] = [];
    const { x: tx, y: ty, k } = transform;
    const vw = canvasSize.width;
    const vh = canvasSize.height;

    for (const tile of Object.values(tiles) as import("./store/useTileStore").TileState[]) {
      // Project tile bounding box to screen space (canvas-relative)
      const sx = tile.x * k + tx;
      const sy = tile.y * k + ty;
      const sw = tile.width * k;
      const sh = tile.height * k;

      const offLeft = sx + sw < 0;
      const offRight = sx > vw;
      const offTop = sy + sh < 0;
      const offBottom = sy > vh;

      // Skip tiles that are visible (even partially)
      if (!offLeft && !offRight && !offTop && !offBottom) continue;

      // Dot position clamped to canvas edge
      const dotX = offLeft
        ? MARGIN
        : offRight
          ? vw - MARGIN
          : Math.max(MARGIN, Math.min(vw - MARGIN, sx + sw / 2));

      const dotY = offTop
        ? MARGIN
        : offBottom
          ? vh - MARGIN
          : Math.max(MARGIN, Math.min(vh - MARGIN, sy + sh / 2));

      result.push({ id: tile.id, x: dotX, y: dotY, color: tile.color });
    }

    return result;
  }, [tiles, transform, canvasSize]);

  if (indicators.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[900]">
      {indicators.map((ind) => (
        <div
          key={ind.id}
          className="absolute h-[10px] w-[10px] rounded-full opacity-80 [-translate-x-1/2] [-translate-y-1/2]"
          style={{
            left: `${ind.x}px`,
            top: `${ind.y}px`,
            backgroundColor: ind.color,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
});

export default OffscreenIndicators;
