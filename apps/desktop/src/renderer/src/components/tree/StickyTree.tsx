import { useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TreeNode } from "./types";
import { useStickyStack } from "./useStickyStack";

export const DEFAULT_ROW_HEIGHT = 24;

export interface RenderRowProps<T extends TreeNode> {
  node: T;
  style: CSSProperties;
  isSticky: boolean;
  stickyIndex: number; // -1 when not sticky, 0-based index in sticky stack
}

export interface StickyTreeProps<T extends TreeNode> {
  /** Flat list of tree nodes (pre-order). */
  nodes: T[];
  /** Height of each row in px. */
  rowHeight?: number;
  /** Number of extra rows to render outside the visible area. */
  overscan?: number;
  /** Total virtual row count — pass nodes.length + extra rows (e.g. inline input). */
  virtualCount?: number;
  /** Render a single tree row. */
  renderRow: (props: RenderRowProps<T>) => ReactNode;
  /**
   * Render an "injected" row at a specific virtual index (e.g. inline create input).
   * Return null for indices that should render a normal node.
   */
  renderInjectedRow?: (virtualIndex: number, style: CSSProperties) => ReactNode | null;
  /**
   * When injected rows exist, map a virtual index → real node index.
   * Default: identity (virtualIndex === nodeIndex).
   */
  resolveNodeIndex?: (virtualIndex: number) => number;
  /** Extra className on the scroll container. */
  className?: string;
  /** Keyboard handler forwarded to the scroll container. */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** Tab index for the scroll container (default 0). */
  tabIndex?: number;
  /** Extra padding-bottom for the scroll container, useful for bouncy scroll effects. */
  scrollPaddingBottom?: number;
}

export default function StickyTree<T extends TreeNode>({
  nodes,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = 20,
  virtualCount,
  renderRow,
  renderInjectedRow,
  resolveNodeIndex,
  className,
  onKeyDown,
  tabIndex = 0,
  scrollPaddingBottom = 3 * DEFAULT_ROW_HEIGHT,
}: StickyTreeProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = virtualCount ?? nodes.length;

  const { stack, onScroll: updateSticky, stackHeight } = useStickyStack(nodes, rowHeight);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // ── JS-driven hover tracking ────────────────────────────────────────────
  // Native :hover breaks during fast virtualised scroll because the browser
  // repositions absolute rows without re-evaluating hit-testing.  We track
  // the pointer position and use elementFromPoint on every scroll frame to
  // apply a [data-hovered] attribute — the CSS transition on background-color
  // gives the buttery-smooth 80ms fade VS Code uses.
  const hoveredRef = useRef<HTMLElement | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef(0);

  const setHovered = useCallback((el: HTMLElement | null) => {
    if (el === hoveredRef.current) return;
    if (hoveredRef.current) hoveredRef.current.removeAttribute("data-hovered");
    hoveredRef.current = el;
    if (el) el.setAttribute("data-hovered", "");
  }, []);

  // Re-evaluate which row is under the (stationary) cursor via elementFromPoint.
  // Batched into a single rAF per scroll frame so we never call it twice.
  const hoverHitTest = useCallback(() => {
    const pos = pointerPosRef.current;
    if (!pos) return;
    const hit = document.elementFromPoint(pos.x, pos.y);
    const row = hit?.closest(".tree-row") as HTMLElement | null;
    setHovered(row);
  }, [setHovered]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      updateSticky(Math.max(0, Math.min(el.scrollTop, maxScroll)));
    }
    // Schedule hover re-evaluation on next paint — one rAF per scroll burst
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(hoverHitTest);
  }, [updateSticky, hoverHitTest]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      const target = (e.target as HTMLElement).closest(".tree-row") as HTMLElement | null;
      setHovered(target);
    },
    [setHovered],
  );

  const handlePointerLeave = useCallback(() => {
    pointerPosRef.current = null;
    setHovered(null);
  }, [setHovered]);

  const vItems = virtualizer.getVirtualItems();

  return (
    <div className="sticky-tree relative h-full overflow-hidden">
      {/* Sticky ancestor overlay */}
      {stack.length > 0 && (
        <div className="sticky-tree__header absolute top-0 left-0 right-0 z-10 bg-[#191919]">
          {stack.map((node, i) =>
            renderRow({
              node,
              style: {
                position: "relative",
                top: 0,
                left: 0,
                width: "100%",
                height: rowHeight,
              },
              isSticky: true,
              stickyIndex: i,
            }),
          )}
        </div>
      )}

      {/* Virtualised scroll area */}
      <div
        ref={scrollRef}
        className={`sticky-tree__scroll h-full overflow-y-auto overflow-x-hidden outline-none [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]${className ? ` ${className}` : ""}`}
        style={{
          paddingTop: stackHeight,
          paddingBottom: scrollPaddingBottom,
          overscrollBehavior: "none",
        }}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {vItems.map((vItem) => {
            const rowStyle: CSSProperties = {
              position: "absolute",
              top: vItem.start,
              left: 0,
              width: "100%",
              height: rowHeight,
            };

            // Check for injected rows (e.g. inline create input)
            if (renderInjectedRow) {
              const injected = renderInjectedRow(vItem.index, rowStyle);
              if (injected !== null && injected !== undefined) return injected;
            }

            const nodeIndex = resolveNodeIndex ? resolveNodeIndex(vItem.index) : vItem.index;

            const node = nodes[nodeIndex];
            if (!node) return null;

            return renderRow({
              node,
              style: rowStyle,
              isSticky: false,
              stickyIndex: -1,
            });
          })}
        </div>
      </div>
    </div>
  );
}

// Re-export for convenience
export { useStickyStack } from "./useStickyStack";
export type { TreeNode } from "./types";
