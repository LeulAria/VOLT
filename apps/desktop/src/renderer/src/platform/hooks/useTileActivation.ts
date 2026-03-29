import { useRef, useEffect } from "react";
import { useTileContext } from "../context/TileContext";

/**
 * Hook that tracks tile activation via pointer and focus events.
 * Returns a ref to attach to the tile root element.
 */
export function useTileActivation(tileId: string) {
  const { setActiveTile } = useTileContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const activate = () => setActiveTile(tileId);

    // Both pointer hover AND keyboard focus activate the tile
    el.addEventListener("pointerenter", activate);
    el.addEventListener("focusin", activate, true);

    return () => {
      el.removeEventListener("pointerenter", activate);
      el.removeEventListener("focusin", activate, true);
    };
  }, [tileId, setActiveTile]);

  return ref;
}
