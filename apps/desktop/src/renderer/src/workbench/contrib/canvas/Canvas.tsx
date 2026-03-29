import { useRef, useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { select, zoomIdentity } from "d3";
import { useTileStore, type CanvasTransform } from "./store/useTileStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { AI_PRESETS } from "../../../lib/ai-presets";
import CanvasGrid from "./CanvasGrid";
import CanvasWorld from "./CanvasWorld";
import OffscreenIndicators from "./OffscreenIndicators";
import { type StatusPanelHandle } from "./StatusPanel";
import Minimap from "./Minimap";
import CanvasGuides from "./CanvasGuides";
import useCanvasZoom from "./hooks/useCanvasZoom";
import useViewportSize from "./hooks/useViewportSize";
import useMultiSelect from "./hooks/useMultiSelect";
import { useGlobalShortcuts } from "../../../platform/hooks/useGlobalShortcuts";

interface CanvasGridHandle {
  draw: (transform: CanvasTransform, viewport: { width: number; height: number }) => void;
}

interface CanvasProps {
  offsetBottom?: number;
  statusPanelRef?: React.RefObject<StatusPanelHandle | null>;
}

export default function Canvas({ offsetBottom = 0, statusPanelRef }: CanvasProps) {
  const { t } = useTranslation();
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<CanvasGridHandle>(null);
  // Remove local statusPanelRef
  const transformRef = useRef<CanvasTransform>({ x: 0, y: 0, k: 1.0 });
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, k: 1.0 });
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Use global store for minimap and viewport sync
  const {
    addTerminalTile,
    addBrowserTile,
    removeTile,
    setFocusedId,
    setSelectedIds,
    minimapOpen,
    setViewport: setStoreViewport,
    addTerminalTileAtCenter,
    addBrowserTileAtCenter,
    addFileTile,
  } = useTileStore();
  const focusedTileId = useTileStore((s: { focusedTileId: string | null }) => s.focusedTileId);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const activeWorkspacePath = useWorkspaceStore(
    (s: { activeWorkspacePath: string | null }) => s.activeWorkspacePath,
  );

  const zoomBehaviorRef = useCanvasZoom(
    canvasRootRef,
    worldRef,
    gridRef,
    statusPanelRef || { current: null },
    transformRef,
    setTransform,
  );
  useViewportSize(canvasRootRef, (size) => {
    setViewport(size);
    setStoreViewport(size);
  });
  useMultiSelect(canvasRootRef, transformRef, selectionBoxRef);

  // Re-measure viewport when sidebar offset changes
  useEffect(() => {
    const el = canvasRootRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const size = { width, height };
    setViewport(size);
    setStoreViewport(size);
  }, [offsetBottom, setStoreViewport]);

  // Helper: animate canvas to center on a tile
  const centerOnTile = useCallback(
    (tileId: string) => {
      const tile = useTileStore.getState().tiles[tileId];
      if (!tile) return;

      const canvasEl = canvasRootRef.current;
      const zoomBehavior = zoomBehaviorRef.current;
      if (!canvasEl || !zoomBehavior) return;

      const rect = canvasEl.getBoundingClientRect();
      const k = transformRef.current.k;
      const tileCenterX = tile.x + tile.width / 2;
      const tileCenterY = tile.y + tile.height / 2;
      const tx = rect.width / 2 - tileCenterX * k;
      const ty = rect.height / 2 - tileCenterY * k;

      select(canvasEl)
        .transition()
        .duration(400)
        .call(zoomBehavior.transform as any, zoomIdentity.translate(tx, ty).scale(k));
    },
    [zoomBehaviorRef],
  );

  // Listen for sidebar "focus on tile" events
  useEffect(() => {
    const handler = (e: Event) => {
      const { tileId } = (e as CustomEvent).detail;
      centerOnTile(tileId);
    };

    window.addEventListener("volt:focus-tile", handler);
    return () => window.removeEventListener("volt:focus-tile", handler);
  }, [centerOnTile]);

  // Listen for double-click on tile header to center that tile
  useEffect(() => {
    const handler = (e: Event) => {
      const { tileId } = (e as CustomEvent).detail;
      centerOnTile(tileId);
    };
    window.addEventListener("volt:center-tile", handler);
    return () => window.removeEventListener("volt:center-tile", handler);
  }, [centerOnTile]);

  const handleLaunchTerminalInDir = useCallback(
    (cwd: string) => {
      const rect = canvasRootRef.current!.getBoundingClientRect();
      const { x: tx, y: ty, k } = transformRef.current;
      const worldX = (rect.width / 2 - tx) / k - 410;
      const worldY = (rect.height / 2 - ty) / k - 240;
      addTerminalTile(worldX, worldY, cwd);
    },
    [addTerminalTile],
  );

  const handleLaunchBrowserWithUrl = useCallback(
    (url: string) => {
      const rect = canvasRootRef.current!.getBoundingClientRect();
      const { x: tx, y: ty, k } = transformRef.current;
      const worldX = (rect.width / 2 - tx) / k - 450;
      const worldY = (rect.height / 2 - ty) / k - 280;
      addBrowserTile(worldX, worldY, url);
    },
    [addBrowserTile],
  );

  // Global shortcuts
  useGlobalShortcuts({
    onNewBrowser: () => addBrowserTileAtCenter(),
    onNewTerminal: () => addTerminalTileAtCenter(activeWorkspacePath ?? "/"),
    onNewTerminalInDir: handleLaunchTerminalInDir,
    onNewBrowserWithUrl: handleLaunchBrowserWithUrl,
    onCloseActiveTile: () => {
      if (focusedTileId) removeTile(focusedTileId);
    },
  });

  // Cmd+1..6: terminal presets (Cmd+T is tile focus cycle — see App.tsx)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const preset = AI_PRESETS.find((p) => p.shortcutKey === e.key);
        if (preset) {
          e.preventDefault();
          const cwd = activeWorkspacePath ?? "/";
          addTerminalTileAtCenter(cwd, preset.command || undefined);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeWorkspacePath, addTerminalTileAtCenter]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only spawn tile on empty canvas (not on tiles or other UI)
      const target = e.target as HTMLElement;
      if (target.closest("[data-tile-id]")) return;
      if (target.closest("[data-tile-side-panel]")) return;

      const rect = canvasRootRef.current!.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const { x: tx, y: ty, k } = transformRef.current;
      const worldX = (screenX - tx) / k;
      const worldY = (screenY - ty) / k;

      const cwd =
        activeWorkspacePath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
      addTerminalTile(worldX, worldY, cwd);
    },
    [addTerminalTile, activeWorkspacePath],
  );

  // ── File drop from explorer ────────────────────────────────────────────────

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const rect = canvasRootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { x: tx, y: ty, k } = transformRef.current;
      const worldX = (e.clientX - rect.left - tx) / k;
      const worldY = (e.clientY - rect.top - ty) / k;

      // Internal drag from explorer/tree
      const json = e.dataTransfer.getData("volt/canvas-drop");
      if (json) {
        try {
          const { filePath, title } = JSON.parse(json) as { filePath: string; title: string };
          if (filePath) addFileTile(worldX, worldY, filePath, title);
        } catch { /* noop */ }
        return;
      }

      // External drag from Finder / OS file manager
      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        let offsetX = 0;
        let offsetY = 0;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (!f) continue;
          // Electron exposes the real path on File objects
          const filePath = (f as any).path as string | undefined;
          if (!filePath) continue;
          addFileTile(worldX + offsetX, worldY + offsetY, filePath, f.name);
          offsetX += 20;
          offsetY += 20;
        }
      }
    },
    [addFileTile],
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const hasInternal = e.dataTransfer.types.includes("volt/canvas-drop");
    const hasFiles = e.dataTransfer.types.includes("Files");
    if (hasInternal || hasFiles) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }, []);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the root canvas element, not child elements
    if (!canvasRootRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-tile-id]")) return;

    e.preventDefault();
    const rect = canvasRootRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x: tx, y: ty, k } = transformRef.current;
    const worldX = (screenX - tx) / k;
    const worldY = (screenY - ty) / k;

    setContextMenu({ x: e.clientX, y: e.clientY, worldX, worldY });
  }, []);

  // Close context menu on any click/scroll/blur
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("mousedown", close, true);
    document.addEventListener("contextmenu", close, true);
    document.addEventListener("wheel", close, true);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("contextmenu", close, true);
      document.removeEventListener("wheel", close, true);
      window.removeEventListener("blur", close);
    };
  }, [contextMenu]);

  return (
    <div
      ref={canvasRootRef}
      className="relative w-full h-full overflow-hidden cursor-default bg-[#16161677] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(10px)]"
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("[data-tile-id]")) {
          setFocusedId(null);
          setSelectedIds([]);
        }
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
    >
      {/* Drop overlay — shown when dragging files over the canvas */}
      {isDragOver && (
        <div className="absolute inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-[#4a9eff]/[0.06] border-2 border-dashed border-[#4a9eff]/50 rounded-[4px]" />
          <div className="relative flex flex-col items-center gap-2 text-[#4a9eff]/80 select-none">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-[13px] font-medium tracking-wide">Drop to open on canvas</span>
          </div>
        </div>
      )}

      <CanvasGrid ref={gridRef} />
      <CanvasGuides />


      <div
        ref={worldRef}
        className="absolute top-0 left-0 w-0 h-0 [transform-origin:0_0] [will-change:transform] pointer-events-none z-[1]"
      >
        <CanvasWorld />
      </div>

      <OffscreenIndicators
        transform={transform}
        viewport={viewport}
        canvasRootRef={canvasRootRef}
      />

      <div
        ref={selectionBoxRef}
        className="absolute pointer-events-none border-[1.5px] border-[#4a9eff] bg-[rgba(74,158,255,0.08)] z-[500]"
        style={{ display: "none" }}
      />

      {minimapOpen && <Minimap transform={transform} viewport={viewport} />}

      {/* Canvas right-click context menu — portaled to body for correct positioning */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[2000] bg-[#191919] backdrop-blur-[20px] border border-white/[0.12] rounded-lg p-1 min-w-[200px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] [animation:popover-in_0.12s_ease-out] pointer-events-auto"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-[10px] py-2 px-3 border-none rounded-[5px] bg-transparent text-white/75 text-[13px] cursor-pointer text-left w-full [-webkit-app-region:no-drag] transition-[background] duration-100 hover:bg-white/[0.08] hover:text-white [&_svg]:shrink-0 [&_svg]:text-white/45 hover:[&_svg]:text-white/70"
              onClick={() => {
                const cwd = activeWorkspacePath ?? "/";
                addTerminalTile(contextMenu.worldX, contextMenu.worldY, cwd);
                setContextMenu(null);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M7 8.5L10.86 12.18L7 15.5" />
                <path d="M12 16H17" />
              </svg>
              <span>{t("canvas.contextMenu.newTerminal")}</span>
              <span className="ml-auto text-[11px] font-mono text-white/25 shrink-0">
                {"\u2318"}T
              </span>
            </button>
            <button
              className="flex items-center gap-[10px] py-2 px-3 border-none rounded-[5px] bg-transparent text-white/75 text-[13px] cursor-pointer text-left w-full [-webkit-app-region:no-drag] transition-[background] duration-100 hover:bg-white/[0.08] hover:text-white [&_svg]:shrink-0 [&_svg]:text-white/45 hover:[&_svg]:text-white/70"
              onClick={() => {
                addBrowserTile(contextMenu.worldX, contextMenu.worldY);
                setContextMenu(null);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{t("canvas.contextMenu.newBrowser")}</span>
              <span className="ml-auto text-[11px] font-mono text-white/25 shrink-0">
                {"\u2318"}B
              </span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
