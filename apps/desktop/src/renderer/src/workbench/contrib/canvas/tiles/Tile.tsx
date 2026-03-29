import { memo, useCallback, useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { useTileStore } from "../store/useTileStore";
import { tileRefs, dragStartPositions } from "../tileRefs";
import TileContent from "./TileContent";
import { calculateGuides } from "../lib/calculateGuides";
import { useTileActivation } from "../../../../platform/hooks/useTileActivation";
import { useTileContext } from "../../../../platform/context/TileContext";
import SidePanel from "./SidePanel";

const SNAP = 20;
const IS_MAC = navigator.platform.toUpperCase().includes("MAC");

interface TileProps {
  id: string;
}

const Tile = memo(function Tile({ id }: TileProps) {
  const tile = useTileStore((state) => state.tiles[id]);
  const scale = useTileStore((state) => state.transform.k);
  const isSelected = useTileStore((state) => state.selectedIds.has(id));
  const isFocused = useTileStore((state) => state.focusedTileId === id);
  const selectedSize = useTileStore((state) => state.selectedIds.size);

  const updateTile = useTileStore((state) => state.updateTile);
  const bringToFront = useTileStore((state) => state.bringToFront);
  const removeTile = useTileStore((state) => state.removeTile);
  const setFocusedId = useTileStore((state) => state.setFocusedId);
  const setSelectedIds = useTileStore((state) => state.setSelectedIds);
  const setActiveGuides = useTileStore((state) => state.setActiveGuides);

  const { registerTile, unregisterTile } = useTileContext();
  const tileRootRef = useTileActivation(id);
  const isResizingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDraggingTile, setIsDraggingTile] = useState(false);

  const togglePanel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPanelOpen((prev) => !prev);
  }, []);

  // Use refs for values needed in callbacks to avoid stale closures
  const selectedIdsRef = useRef(useTileStore.getState().selectedIds);
  useEffect(() => {
    return useTileStore.subscribe((state) => {
      selectedIdsRef.current = state.selectedIds;
    });
  }, []);

  useEffect(() => {
    if (tileRootRef.current) {
      tileRefs.set(id, tileRootRef.current);
      return () => {
        tileRefs.delete(id);
        dragStartPositions.delete(id);
      };
    }
    return undefined;
  }, [id]);

  // Register tile capabilities for duplicate/focus/etc
  useEffect(() => {
    const onDuplicate = () => {
      if (!tile) return;
      // Duplicate logic depends on tile type
      if (tile.type === "terminal") {
        // Terminal: clone with same cwd
        const state = useTileStore.getState();
        state.addTerminalTile(tile.x + 20, tile.y + 20, tile.filePath || "/");
      } else if (tile.type === "browser") {
        // Browser: clone with same URL
        const state = useTileStore.getState();
        state.addBrowserTile(tile.x + 20, tile.y + 20, tile.browserUrl);
      } else {
        // Default: just clone the tile next to it
        const state = useTileStore.getState();
        state.addTileWithContent(tile.x + 20, tile.y + 20, tile.title, tile.filePath || "");
      }
    };

    const onNewSibling = () => {
      if (!tile) return;
      const state = useTileStore.getState();
      state.addTerminalTile(tile.x + 20, tile.y + 20, tile.filePath || "/");
    };

    // Get current working directory for terminals
    const getCurrentCwd = () => {
      if (tile?.type === "terminal") {
        // Return the tile's current filePath (cwd)
        // This is updated by TerminalView when terminal navigates
        return tile.filePath || "/";
      }
      return "/";
    };

    // Get current URL for browsers
    const getCurrentUrl = () => {
      if (tile?.type === "browser") {
        // Return the tile's current browserUrl
        // This will be updated by the browser when user navigates
        return tile.browserUrl || "https://www.google.com";
      }
      return "https://www.google.com";
    };

    registerTile({
      tileId: id,
      tileType: (tile?.type ?? "default") as "terminal" | "browser" | "editor" | "default",
      canZoom: true,
      onDuplicate,
      onNewSibling,
      focusRef: tileRootRef,
      getCurrentCwd,
      getCurrentUrl,
    });

    return () => unregisterTile(id);
  }, [id, tile, registerTile, unregisterTile]);

  if (!tile) return null;

  const handleDragStart = useCallback(
    (_: any, data: any) => {
      if (isResizingRef.current) return false;

      bringToFront(id);
      dragStartPosRef.current = { x: data.x, y: data.y };
      didDragRef.current = false;
      setIsDraggingTile(true);

      // Record start positions for all selected tiles (for multi-drag)
      const selected = selectedIdsRef.current;
      if (selected.has(id) && selected.size > 1) {
        const tiles = useTileStore.getState().tiles;
        selected.forEach((tileId) => {
          const t = tiles[tileId];
          if (t) dragStartPositions.set(tileId, { x: t.x, y: t.y });
        });
      }
      return undefined;
    },
    [id, bringToFront],
  );

  const handleDrag = useCallback(
    (_: any, data: any) => {
      didDragRef.current = true;

      // Calculate and show smart guides (runs for single and multi-tile drags)
      const allTiles = useTileStore.getState().tiles;
      const guides = calculateGuides(id, allTiles, data.x, data.y, tile.width, tile.height);
      setActiveGuides(guides && (guides.x.length > 0 || guides.y.length > 0) ? guides : null);

      const selected = selectedIdsRef.current;
      if (!selected.has(id) || selected.size <= 1) return;

      // Real-time multi-drag: apply CSS transform to other selected tiles
      const startPos = dragStartPositions.get(id);
      if (!startPos) return;

      const dx = data.x - startPos.x;
      const dy = data.y - startPos.y;

      selected.forEach((tileId) => {
        if (tileId === id) return;
        const el = tileRefs.get(tileId);
        if (el) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      });
    },
    [id, tile.width, tile.height, setActiveGuides],
  );

  const handleDragStop = useCallback(
    (_: any, data: any) => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        return;
      }

      setIsDraggingTile(false);
      setActiveGuides(null);

      // If barely moved: treat as click → focus the tile
      const dx = Math.abs(data.x - dragStartPosRef.current.x);
      const dy = Math.abs(data.y - dragStartPosRef.current.y);
      if (dx < 3 && dy < 3) {
        setFocusedId(id);
        setSelectedIds([id]);
        return;
      }

      // Snap final position
      const snappedX = Math.round(data.x / SNAP) * SNAP;
      const snappedY = Math.round(data.y / SNAP) * SNAP;

      const selected = selectedIdsRef.current;

      // Clear CSS transforms from multi-dragged tiles
      selected.forEach((tileId) => {
        if (tileId !== id) {
          const el = tileRefs.get(tileId);
          if (el) el.style.transform = "";
        }
      });

      if (!selected.has(id) || selected.size <= 1) {
        // Single tile drag
        updateTile(id, { x: snappedX, y: snappedY });
      } else {
        // Multi-drag: apply delta to all selected tiles atomically
        const startPos = dragStartPositions.get(id);
        if (startPos) {
          const deltaX = snappedX - startPos.x;
          const deltaY = snappedY - startPos.y;
          const tiles = useTileStore.getState().tiles;

          selected.forEach((tileId) => {
            const t = tiles[tileId];
            if (t) {
              updateTile(tileId, {
                x: Math.round((t.x + deltaX) / SNAP) * SNAP,
                y: Math.round((t.y + deltaY) / SNAP) * SNAP,
              });
            }
          });
        }
      }

      dragStartPositions.clear();
    },
    [id, updateTile, setFocusedId, setSelectedIds],
  );

  const handleResizeStart = useCallback(() => {
    isResizingRef.current = true;
    bringToFront(id);
  }, [id, bringToFront]);

  const handleResize = useCallback(
    (_: any, __: any, ref: HTMLElement, ___: any, position: { x: number; y: number }) => {
      const allTiles = useTileStore.getState().tiles;
      const w = parseInt(ref.style.width);
      const h = parseInt(ref.style.height);
      const guides = calculateGuides(id, allTiles, position.x, position.y, w, h);
      setActiveGuides(guides);
    },
    [id, setActiveGuides],
  );

  const handleResizeStop = useCallback(
    (_: any, __: any, ref: HTMLElement, ___: any, position: { x: number; y: number }) => {
      isResizingRef.current = false;
      setActiveGuides(null);

      updateTile(id, {
        width: Math.round(parseInt(ref.style.width) / SNAP) * SNAP,
        height: Math.round(parseInt(ref.style.height) / SNAP) * SNAP,
        x: Math.round(position.x / SNAP) * SNAP,
        y: Math.round(position.y / SNAP) * SNAP,
      });
    },
    [id, updateTile],
  );

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeTile(id);
    },
    [id, removeTile],
  );

  const handleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Minimize: collapse tile to header-only height (future enhancement)
  }, []);

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Maximize: expand tile (future enhancement)
  }, []);

  const handleHeaderDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger if clicking traffic light buttons
      if ((e.target as HTMLElement).closest(".traffic-light, .tile-close")) return;
      window.dispatchEvent(new CustomEvent("volt:center-tile", { detail: { tileId: id } }));
    },
    [id],
  );

  // Drag handle:
  // - Not focused: entire tile is draggable
  // - Focused + multi-selected: entire tile is draggable (selection box drag)
  // - Focused + alone: header only
  const dragHandle = isFocused && selectedSize <= 1 ? "tile-header" : "tile-root";

  return (
    <Rnd
      position={{ x: tile.x, y: tile.y }}
      size={{ width: tile.width, height: tile.height }}
      scale={scale}
      dragHandleClassName={dragHandle}
      minWidth={200}
      minHeight={140}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        topLeft: true,
        bottomRight: true,
        bottomLeft: true,
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      className="tile-rnd-wrapper"
      style={{ zIndex: tile.zIndex, pointerEvents: "all" }}
    >
      <div
        ref={tileRootRef}
        className="tile-root pointer-events-auto w-full h-full bg-[#11111144] backdrop-blur-[20px] saturate-[180%] border border-white/[0.08] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-[box-shadow,border-color] duration-150 [backface-visibility:hidden]"
        data-tile-id={id}
        data-selected={isSelected || undefined}
        data-focused={isFocused || undefined}
      >
        <div
          className="tile-header h-[38px] flex items-center px-3 bg-[#191919] backdrop-blur-[20px] saturate-[180%] border-b border-white/[0.06] cursor-grab shrink-0 select-none gap-2 transition-[background] duration-150 relative"
          onDoubleClick={handleHeaderDoubleClick}
        >
          {IS_MAC ? (
            <>
              <div className="traffic-lights flex items-center gap-2 z-[1]">
                <button
                  className="traffic-light traffic-light--close w-3 h-3 rounded-full border-none p-0 cursor-pointer relative transition-opacity bg-[#ff5f57]"
                  onClick={handleClose}
                />
                <button
                  className="traffic-light traffic-light--minimize w-3 h-3 rounded-full border-none p-0 cursor-pointer relative transition-opacity bg-[#febc2e]"
                  onClick={handleMinimize}
                />
                <button
                  className="traffic-light traffic-light--maximize w-3 h-3 rounded-full border-none p-0 cursor-pointer relative transition-opacity bg-[#28c840]"
                  onClick={handleMaximize}
                />
              </div>
              <span className="absolute left-0 right-0 text-center pointer-events-none font-mono text-[13px] font-semibold text-white/65 overflow-hidden text-ellipsis whitespace-nowrap">
                {tile.title}
              </span>
              {tile.type === "browser" && (
                <button
                  onClick={togglePanel}
                  className={`ml-auto mr-0.5 w-6 h-6 flex items-center justify-center rounded-md transition-colors ${panelOpen ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                    width="14"
                    height="14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 3.99988 1.5 0"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 6.49988 1.5 0"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M0.959867 10.2685C1.114 11.7092 2.2727 12.8679 3.71266 13.0284 4.78221 13.1476 5.88037 13.25 7 13.25s2.21779-.1024 3.2873-.2216c1.44-.1605 2.5987-1.3192 2.7528-2.7599.1138-1.06348.2099-2.15535.2099-3.2685 0-1.11316-.0961-2.20502-.2099-3.26853-.1541-1.44065-1.3128-2.59936-2.7528-2.759861C9.21779.852392 8.11963.75 7 .75S4.78221.852392 3.71266.971609C2.2727 1.13211 1.114 2.29082.959867 3.73147.846083 4.79498.75 5.88684.75 7c0 1.11315.096084 2.20502.209867 3.2685Z"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m7.5.756592 0 12.486908"
                      strokeWidth="1"
                    />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <>
              <span className="flex-1 font-mono text-[13px] font-semibold text-white/65 overflow-hidden text-ellipsis whitespace-nowrap">
                {tile.title}
              </span>
              {tile.type === "browser" && (
                <button
                  onClick={togglePanel}
                  className={`ml-auto mr-2 w-6 h-6 flex items-center justify-center rounded-md transition-colors ${panelOpen ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                    width="14"
                    height="14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 3.99988 1.5 0"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 6.49988 1.5 0"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M0.959867 10.2685C1.114 11.7092 2.2727 12.8679 3.71266 13.0284 4.78221 13.1476 5.88037 13.25 7 13.25s2.21779-.1024 3.2873-.2216c1.44-.1605 2.5987-1.3192 2.7528-2.7599.1138-1.06348.2099-2.15535.2099-3.2685 0-1.11316-.0961-2.20502-.2099-3.26853-.1541-1.44065-1.3128-2.59936-2.7528-2.759861C9.21779.852392 8.11963.75 7 .75S4.78221.852392 3.71266.971609C2.2727 1.13211 1.114 2.29082.959867 3.73147.846083 4.79498.75 5.88684.75 7c0 1.11315.096084 2.20502.209867 3.2685Z"
                      strokeWidth="1"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m7.5.756592 0 12.486908"
                      strokeWidth="1"
                    />
                  </svg>
                </button>
              )}
              <button
                className="w-5 h-5 border-none bg-transparent text-white/40 cursor-pointer rounded flex items-center justify-center text-base leading-none shrink-0 p-0 transition-colors hover:bg-red-500/20 hover:text-red-400/90 active:bg-red-500/30"
                onClick={handleClose}
              >
                ✕
              </button>
            </>
          )}
        </div>
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <TileContent
            id={id}
            type={tile.type ?? "default"}
            title={tile.title}
            filePath={tile.filePath}
            initialCommand={tile.initialCommand}
            browserUrl={tile.browserUrl}
            readOnly={tile.readOnly}
          />
          {/* Unfocused overlay — click to activate */}
          {!isFocused && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.08)",
                zIndex: 10,
                cursor: "pointer",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                bringToFront(id);
                setFocusedId(id);
                setSelectedIds([id]);
              }}
            />
          )}
        </div>
      </div>

      {panelOpen && tile.type === "browser" && (
        <SidePanel
          tileId={id}
          targetId={tile.browserTargetId}
          currentUrl={tile.browserUrl || "https://www.google.com"}
          onClose={() => setPanelOpen(false)}
          isFocused={isFocused}
          isDragging={isDraggingTile}
        />
      )}
    </Rnd>
  );
});

export default Tile;
