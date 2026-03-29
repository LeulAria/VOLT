import { forwardRef, memo, useImperativeHandle, useRef, useLayoutEffect } from "react";
import type { CanvasTransform } from "./store/useTileStore";

interface CanvasGridHandle {
  draw: (transform: CanvasTransform, viewport: { width: number; height: number }) => void;
}

// Fixed world-space grid spacing
const MINOR_SPACING = 24;
const MAJOR_SPACING = MINOR_SPACING * 5;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  transform: CanvasTransform,
  viewport: { width: number; height: number },
) {
  const { x: tx, y: ty, k } = transform;
  const { width: vw, height: vh } = viewport;

  ctx.clearRect(0, 0, vw, vh);

  const screenGap = MINOR_SPACING * k;
  const majorScreenGap = MAJOR_SPACING * k;

  // World bounds visible on screen
  const worldLeft = -tx / k;
  const worldTop = -ty / k;
  const worldRight = worldLeft + vw / k;
  const worldBottom = worldTop + vh / k;

  // Fade minor dots when too dense
  const minorAlpha = Math.max(0, Math.min(1, (screenGap - 3) / 8));
  const majorAlpha = Math.max(0, Math.min(1, (majorScreenGap - 5) / 15));

  // Major dots: small circle, brighter
  if (majorAlpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${majorAlpha * 0.45})`;
    ctx.beginPath();
    const startMX = Math.floor(worldLeft / MAJOR_SPACING) * MAJOR_SPACING;
    const startMY = Math.floor(worldTop / MAJOR_SPACING) * MAJOR_SPACING;
    for (let wx = startMX; wx <= worldRight; wx += MAJOR_SPACING) {
      const sx = Math.round(wx * k + tx);
      if (sx < -2 || sx > vw + 2) continue;
      for (let wy = startMY; wy <= worldBottom; wy += MAJOR_SPACING) {
        const sy = Math.round(wy * k + ty);
        if (sy < -2 || sy > vh + 2) continue;
        ctx.moveTo(sx + 0.6, sy);
        ctx.arc(sx, sy, 0.6, 0, 6.2832);
      }
    }
    ctx.fill();
  }

  // Minor dots: tiny circle, dim — skip major positions
  if (minorAlpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${minorAlpha * 0.38})`;
    ctx.beginPath();
    const startX = Math.floor(worldLeft / MINOR_SPACING) * MINOR_SPACING;
    const startY = Math.floor(worldTop / MINOR_SPACING) * MINOR_SPACING;
    for (let wx = startX; wx <= worldRight; wx += MINOR_SPACING) {
      const isMajorCol = Math.abs(wx % MAJOR_SPACING) < 0.5;
      const sx = Math.round(wx * k + tx);
      if (sx < -1 || sx > vw + 1) continue;
      for (let wy = startY; wy <= worldBottom; wy += MINOR_SPACING) {
        if (isMajorCol && Math.abs(wy % MAJOR_SPACING) < 0.5) continue;
        const sy = Math.round(wy * k + ty);
        if (sy < -1 || sy > vh + 1) continue;
        ctx.moveTo(sx + 0.4, sy);
        ctx.arc(sx, sy, 0.4, 0, 6.2832);
      }
    }
    ctx.fill();
  }
}

const CanvasGrid = memo(
  forwardRef<CanvasGridHandle>(function CanvasGrid(_props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const lastDrawRef = useRef<{
      transform: CanvasTransform;
      viewport: { width: number; height: number };
    } | null>(null);

    useLayoutEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      contextRef.current = ctx;

      const resize = () => {
        const parent = canvas.parentElement;
        const w = parent ? parent.clientWidth : window.innerWidth;
        const h = parent ? parent.clientHeight : window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (lastDrawRef.current) {
          drawGrid(ctx, lastDrawRef.current.transform, { width: w, height: h });
        }
      };

      resize();

      // Observe the parent panel (not window) so the grid reacts to sidebar resize
      const observer = new ResizeObserver(resize);
      if (canvas.parentElement) observer.observe(canvas.parentElement);

      return () => observer.disconnect();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        draw: (transform: CanvasTransform, viewport: { width: number; height: number }) => {
          const ctx = contextRef.current;
          if (!ctx) return;
          lastDrawRef.current = { transform, viewport };
          drawGrid(ctx, transform, viewport);
        },
      }),
      [],
    );

    return <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none z-0" />;
  }),
);

export default CanvasGrid;
