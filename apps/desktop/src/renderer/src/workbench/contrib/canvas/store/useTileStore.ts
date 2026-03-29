import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TileType = "default" | "terminal" | "browser" | "file" | "voltcode";

export interface TileState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  zIndex: number;
  color: string;
  type: TileType;
  filePath?: string;
  initialCommand?: string;
  browserUrl?: string;
  browserSessionId?: string;
  browserTargetId?: number;
  sidePanelOpen?: boolean;
  readOnly?: boolean;
}

export interface CanvasTransform {
  x: number;
  y: number;
  k: number;
}

interface TileStoreState {
  tiles: Record<string, TileState>;
  tileOrder: string[];
  selectedIds: Set<string>;
  focusedTileId: string | null;
  transform: CanvasTransform;
  /** World-space center of the viewport when transform was last saved */
  worldCenter: { cx: number; cy: number } | null;
  maxZIndex: number;
  viewport: { width: number; height: number };
  minimapOpen: boolean;
  activeGuides: { x: number[]; y: number[] } | null;

  addTile: (worldX: number, worldY: number) => void;
  addTileWithContent: (worldX: number, worldY: number, title: string, filePath: string) => void;
  addTerminalTile: (worldX: number, worldY: number, cwd: string, initialCommand?: string) => void;
  addTerminalTileAtCenter: (cwd: string, initialCommand?: string) => void;
  addBrowserTile: (worldX: number, worldY: number, url?: string) => void;
  addBrowserTileAtCenter: (url?: string) => void;
  addFileTile: (worldX: number, worldY: number, filePath: string, title?: string, readOnly?: boolean) => void;
  addFileTileAtCenter: (filePath: string, title?: string, readOnly?: boolean) => void;
  addVoltCodeTile: (worldX: number, worldY: number) => void;
  addVoltCodeTileAtCenter: () => void;
  removeTile: (id: string) => void;
  updateTile: (id: string, patch: Partial<TileState>) => void;
  bringToFront: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setFocusedId: (id: string | null) => void;
  setTransform: (transform: CanvasTransform) => void;
  setViewport: (viewport: { width: number; height: number }) => void;
  setMinimapOpen: (open: boolean) => void;
  setActiveGuides: (guides: { x: number[]; y: number[] } | null) => void;
}

const TILE_WIDTH = 320;
const TILE_HEIGHT = 240;
const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#52B788",
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function debouncedLocalStorage(delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(name, value);
      }, delay);
    },
    removeItem: (name: string) => localStorage.removeItem(name),
  };
}

export const useTileStore = create<TileStoreState>()(
  persist(
    (set, get) => ({
      tiles: {},
      tileOrder: [],
      selectedIds: new Set<string>(),
      focusedTileId: null,
      transform: { x: 0, y: 0, k: 0.7 },
      worldCenter: null,
      maxZIndex: 10,

      addTile: (worldX: number, worldY: number) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const newTile: TileState = {
          id,
          x: worldX,
          y: worldY,
          width: 900,
          height: 520,
          title: "Terminal",
          zIndex,
          color: getRandomColor(),
          type: "terminal",
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      addTileWithContent: (worldX: number, worldY: number, title: string, filePath: string) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const offset = Object.keys(state.tiles).length * 20;
        const newTile: TileState = {
          id,
          x: worldX + offset,
          y: worldY + offset,
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
          title,
          zIndex,
          color: getRandomColor(),
          type: "default",
          filePath,
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      addTerminalTileAtCenter: (cwd: string, initialCommand?: string) => {
        const { transform, viewport } = get();
        const worldX = (viewport.width / 2 - transform.x) / transform.k - 410;
        const worldY = (viewport.height / 2 - transform.y) / transform.k - 240;
        get().addTerminalTile(worldX, worldY, cwd, initialCommand);
      },

      addBrowserTileAtCenter: (url?: string) => {
        const { transform, viewport } = get();
        const worldX = (viewport.width / 2 - transform.x) / transform.k - 450;
        const worldY = (viewport.height / 2 - transform.y) / transform.k - 280;
        get().addBrowserTile(worldX, worldY, url);
      },

      addTerminalTile: (worldX: number, worldY: number, cwd: string, initialCommand?: string) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const label = initialCommand || cwd.split("/").pop() || "terminal";
        const newTile: TileState = {
          id,
          x: worldX,
          y: worldY,
          width: 900,
          height: 520,
          title: label,
          zIndex,
          color: getRandomColor(),
          type: "terminal",
          filePath: cwd,
          initialCommand,
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      addFileTile: (worldX: number, worldY: number, filePath: string, title?: string, readOnly?: boolean) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const fileName = title ?? filePath.split("/").pop() ?? "File";
        const newTile: TileState = {
          id,
          x: worldX,
          y: worldY,
          width: 900,
          height: 580,
          title: fileName,
          zIndex,
          color: getRandomColor(),
          type: "file",
          filePath,
          readOnly,
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      addVoltCodeTile: (worldX: number, worldY: number) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const newTile: TileState = {
          id,
          x: worldX,
          y: worldY,
          width: 760,
          height: 580,
          title: "Volt Code",
          zIndex,
          color: getRandomColor(),
          type: "voltcode",
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      addVoltCodeTileAtCenter: () => {
        const { transform, viewport } = get();
        const worldX = (viewport.width / 2 - transform.x) / transform.k - 380;
        const worldY = (viewport.height / 2 - transform.y) / transform.k - 290;
        get().addVoltCodeTile(worldX, worldY);
      },

      addFileTileAtCenter: (filePath: string, title?: string, readOnly?: boolean) => {
        const state = get();
        // If a tile for this file already exists, just bring it to front
        const existingId = state.tileOrder.find(
          (id) => state.tiles[id]?.type === "file" && state.tiles[id]?.filePath === filePath,
        );
        if (existingId) {
          get().bringToFront(existingId);
          set({ focusedTileId: existingId });
          return;
        }
        const { transform, viewport } = get();
        const worldX = (viewport.width / 2 - transform.x) / transform.k - 450;
        const worldY = (viewport.height / 2 - transform.y) / transform.k - 290;
        get().addFileTile(worldX, worldY, filePath, title, readOnly);
      },

      addBrowserTile: (worldX: number, worldY: number, url?: string) => {
        const id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const state = get();
        const zIndex = state.maxZIndex + 1;
        const browserUrl = (typeof url === "string" ? url : undefined) || "https://www.google.com";
        let label = "Browser";
        try {
          label = new URL(browserUrl).hostname;
        } catch {
          /* keep default */
        }
        const newTile: TileState = {
          id,
          x: worldX,
          y: worldY,
          width: 1000,
          height: 640,
          title: label,
          zIndex,
          color: getRandomColor(),
          type: "browser",
          browserUrl,
        };
        set({
          tiles: { ...state.tiles, [id]: newTile },
          tileOrder: [...state.tileOrder, id],
          maxZIndex: zIndex,
        });
      },

      removeTile: (id: string) => {
        set((s) => {
          const { [id]: _, ...rest } = s.tiles;
          return {
            tiles: rest,
            tileOrder: s.tileOrder.filter((tid) => tid !== id),
            selectedIds: new Set([...s.selectedIds].filter((sid) => sid !== id)),
            focusedTileId: s.focusedTileId === id ? null : s.focusedTileId,
          };
        });
      },

      updateTile: (id: string, patch: Partial<TileState>) => {
        set((s) => ({
          tiles: {
            ...s.tiles,
            [id]: { ...s.tiles[id], ...patch },
          },
        }));
      },

      bringToFront: (id: string) => {
        const state = get();
        const newZIndex = state.maxZIndex + 1;
        set({
          tiles: {
            ...state.tiles,
            [id]: { ...state.tiles[id], zIndex: newZIndex },
          },
          maxZIndex: newZIndex,
        });
      },

      setSelectedIds: (ids: string[]) => {
        set({ selectedIds: new Set(ids) });
      },

      setFocusedId: (id: string | null) => {
        set({ focusedTileId: id });
      },

      setTransform: (transform: CanvasTransform) => {
        const { viewport } = get();
        const cx = (viewport.width / 2 - transform.x) / transform.k;
        const cy = (viewport.height / 2 - transform.y) / transform.k;
        set({ transform, worldCenter: { cx, cy } });
      },

      viewport: { width: window.innerWidth, height: window.innerHeight },
      minimapOpen: false,

      setViewport: (viewport) => set({ viewport }),
      setMinimapOpen: (minimapOpen) => set({ minimapOpen }),

      activeGuides: null,
      setActiveGuides: (activeGuides) => set({ activeGuides }),
    }),
    {
      name: "volt-canvas-v1",
      storage: createJSONStorage(() => debouncedLocalStorage(500)),
      partialize: (state) => ({
        tiles: state.tiles,
        tileOrder: state.tileOrder,
        maxZIndex: state.maxZIndex,
        transform: state.transform,
        worldCenter: state.worldCenter,
      }),
    },
  ),
);
