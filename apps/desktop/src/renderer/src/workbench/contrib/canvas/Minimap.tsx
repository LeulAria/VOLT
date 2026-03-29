import { memo, useRef, useEffect, useCallback } from "react";
import { useTileStore, type CanvasTransform, type TileState } from "./store/useTileStore";

interface MinimapProps {
  transform: CanvasTransform;
  viewport: { width: number; height: number };
}

const MINIMAP_W = 200;
const MINIMAP_H = 140;
const PADDING = 20;

const Minimap = memo(function Minimap({ transform, viewport }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiles = useTileStore((s) => s.tiles);
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = MINIMAP_W;
    const h = MINIMAP_H;

    // Set canvas size accounting for DPR
    const canvas = canvasRef.current!;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const tileList = Object.values(tiles) as TileState[];
    if (tileList.length === 0) {
      // Draw empty state
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("No tiles", w / 2, h / 2 + 4);
      return;
    }

    // Compute world bounding box across all tiles + current viewport in world space
    const { x: tx, y: ty, k } = transform;
    const vpWorldX = -tx / k;
    const vpWorldY = -ty / k;
    const vpWorldW = viewport.width / k;
    const vpWorldH = viewport.height / k;

    let minX = vpWorldX;
    let minY = vpWorldY;
    let maxX = vpWorldX + vpWorldW;
    let maxY = vpWorldY + vpWorldH;

    for (const t of tileList) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.width);
      maxY = Math.max(maxY, t.y + t.height);
    }

    // Add padding around the bounding box
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const padded = Math.max(worldW, worldH) * 0.1;
    minX -= padded;
    minY -= padded;
    const totalW = worldW + padded * 2;
    const totalH = worldH + padded * 2;

    // Scale to fit minimap
    const scale = Math.min((w - PADDING) / totalW, (h - PADDING) / totalH);
    const offsetX = (w - totalW * scale) / 2;
    const offsetY = (h - totalH * scale) / 2;

    const toMiniX = (wx: number) => (wx - minX) * scale + offsetX;
    const toMiniY = (wy: number) => (wy - minY) * scale + offsetY;

    // Draw tiles
    for (const t of tileList) {
      const rx = toMiniX(t.x);
      const ry = toMiniY(t.y);
      const rw = t.width * scale;
      const rh = t.height * scale;

      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rx, ry, Math.max(rw, 2), Math.max(rh, 2), 2);
      ctx.fill();
      ctx.stroke();

      // Color accent bar on top
      ctx.fillStyle = t.color + "99";
      ctx.fillRect(rx, ry, Math.max(rw, 2), Math.min(2, rh));
    }

    // Draw viewport rectangle
    const vx = toMiniX(vpWorldX);
    const vy = toMiniY(vpWorldY);
    const vw = vpWorldW * scale;
    const vh = vpWorldH * scale;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(vx, vy, vw, vh);
  }, [tiles, transform, viewport]);

  // Throttle redraws to animation frames
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="absolute bottom-2 right-2 z-[800] h-[140px] w-[200px] overflow-hidden rounded-[5px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-[20px] [animation:minimap-in_0.15s_ease-out] [pointer-events:auto] [-webkit-backdrop-filter:blur(20px)]">
      <canvas ref={canvasRef} className="block bg-transparent" />
    </div>
  );
});

export default Minimap;
