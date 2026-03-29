import { createContext, useContext, useCallback, useState, useRef } from "react";

export interface TileCapabilities {
  tileId: string;
  tileType: "terminal" | "browser" | "editor" | "default";
  canZoom: boolean;
  onDuplicate: () => void;
  onNewSibling: () => void;
  focusRef: React.RefObject<HTMLElement | null>;
  /**
   * Get the current working directory (for terminals)
   * Returns the active directory of the terminal
   */
  getCurrentCwd?: () => string;
  /**
   * Get the current URL (for browsers)
   * Returns the active URL of the browser
   */
  getCurrentUrl?: () => string;
}

interface TileContextValue {
  activeTile: TileCapabilities | null;
  registerTile: (caps: TileCapabilities) => void;
  unregisterTile: (tileId: string) => void;
  setActiveTile: (tileId: string) => void;
}

const TileContext = createContext<TileContextValue | undefined>(undefined);

export function TileProvider({ children }: { children: React.ReactNode }) {
  const registry = useRef<Map<string, TileCapabilities>>(new Map());
  const [activeTileId, setActiveTileId] = useState<string | null>(null);

  const registerTile = useCallback((caps: TileCapabilities) => {
    registry.current.set(caps.tileId, caps);
  }, []);

  const unregisterTile = useCallback(
    (id: string) => {
      registry.current.delete(id);
      if (activeTileId === id) {
        setActiveTileId(null);
      }
    },
    [activeTileId],
  );

  const activeTile = activeTileId ? (registry.current.get(activeTileId) ?? null) : null;

  return (
    <TileContext.Provider
      value={{ activeTile, registerTile, unregisterTile, setActiveTile: setActiveTileId }}
    >
      {children}
    </TileContext.Provider>
  );
}

export function useTileContext() {
  const context = useContext(TileContext);
  if (!context) {
    throw new Error("useTileContext must be used within TileProvider");
  }
  return context;
}
