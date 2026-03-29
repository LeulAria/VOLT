import { useTileStore } from "./store/useTileStore";

export default function CanvasGuides() {
  const activeGuides = useTileStore((s) => s.activeGuides);
  const { x: tx, y: ty, k } = useTileStore((s) => s.transform);
  const viewport = useTileStore((s) => s.viewport);

  if (!activeGuides) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[1000]"
      style={{ width: viewport.width, height: viewport.height }}
    >
      {/* Vertical guides */}
      {activeGuides.x.map((worldX, i) => {
        const screenX = worldX * k + tx;
        return (
          <line
            key={`v-${i}`}
            x1={screenX}
            y1={0}
            x2={screenX}
            y2={viewport.height}
            stroke="#4a9eff"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.8"
          />
        );
      })}

      {/* Horizontal guides */}
      {activeGuides.y.map((worldY, i) => {
        const screenY = worldY * k + ty;
        return (
          <line
            key={`h-${i}`}
            x1={0}
            y1={screenY}
            x2={viewport.width}
            y2={screenY}
            stroke="#4a9eff"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}
