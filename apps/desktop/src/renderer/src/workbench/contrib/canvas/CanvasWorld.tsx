import { memo } from "react";
import { useTileStore } from "./store/useTileStore";
import Tile from "./tiles/Tile";

const CanvasWorld = memo(function CanvasWorld() {
  // Subscribe to only tile order (IDs), not individual tile data
  // This ensures CanvasWorld only re-renders when tiles are added/removed, not when moved/resized
  const tileOrder = useTileStore((state) => state.tileOrder);

  return (
    <>
      {tileOrder.map((tileId) => (
        <Tile key={tileId} id={tileId} />
      ))}
    </>
  );
});

export default CanvasWorld;
