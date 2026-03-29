import { useRef, useCallback, useState, useEffect, type CSSProperties, type RefObject } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { UnifiedTreeNode, UnifiedTreeCallbacks } from "./types";
import UnifiedTreeRow from "./UnifiedTreeRow";

const ROW_HEIGHT = 24;

// ── Sticky parent stack ─────────────────────────────────────────────────────

/** For each node, compute the index of the last descendant in its subtree. */
function computeSubtreeEnds(nodes: UnifiedTreeNode[]): number[] {
  const ends = new Array<number>(nodes.length);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.hasChildren || !node.expanded) {
      ends[i] = i;
    } else {
      let end = i;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].depth > node.depth) end = j;
        else break;
      }
      ends[i] = end;
    }
  }
  return ends;
}

/** Build the ordered list of ancestor nodes that should be sticky. */
function buildStickyStack(
  nodes: UnifiedTreeNode[],
  subtreeEnds: number[],
  topVisibleIndex: number,
): UnifiedTreeNode[] {
  const stack: UnifiedTreeNode[] = [];
  for (let i = 0; i <= topVisibleIndex; i++) {
    const node = nodes[i];
    if (
      node.hasChildren &&
      node.expanded &&
      subtreeEnds[i] >= topVisibleIndex &&
      i !== topVisibleIndex
    ) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
        stack.pop();
      }
      stack.push(node);
    }
  }
  return stack;
}

function useStickyStack(
  nodes: UnifiedTreeNode[],
  rowHeight: number,
  scrollTopRef?: RefObject<number>,
) {
  const [stack, setStack] = useState<UnifiedTreeNode[]>([]);
  const subtreeEndsRef = useRef<number[]>([]);
  const nodesRef = useRef(nodes);

  if (nodesRef.current !== nodes) {
    nodesRef.current = nodes;
    subtreeEndsRef.current = computeSubtreeEnds(nodes);
    // Re-compute stack immediately to avoid stale sticky header on refresh
    const scrollTop = scrollTopRef?.current ?? 0;
    const topIdx = Math.max(0, Math.min(Math.floor(scrollTop / rowHeight), nodes.length - 1));
    const newStack = buildStickyStack(nodes, subtreeEndsRef.current, topIdx);
    setStack(newStack);
  }
  if (subtreeEndsRef.current.length === 0 && nodes.length > 0) {
    subtreeEndsRef.current = computeSubtreeEnds(nodes);
  }

  const onScroll = useCallback(
    (scrollTop: number) => {
      const topIdx = Math.max(0, Math.min(Math.floor(scrollTop / rowHeight), nodes.length - 1));
      const newStack = buildStickyStack(nodes, subtreeEndsRef.current, topIdx);
      setStack(newStack);
    },
    [nodes, rowHeight],
  );

  return { stack, onScroll, stackHeight: stack.length * rowHeight };
}

export interface UnifiedTreeProps extends UnifiedTreeCallbacks {
  nodes: UnifiedTreeNode[];
  activeNodeId?: string | null;
  rowHeight?: number;
  overscan?: number;
  className?: string;
  tabIndex?: number;
  /** When true, directory rows accept drag-and-drop to move files/folders */
  draggable?: boolean;
}

export default function UnifiedTree({
  nodes,
  activeNodeId,
  rowHeight = ROW_HEIGHT,
  overscan = 20,
  className,
  tabIndex = 0,
  draggable = false,
  onToggle,
  onActivate,
  onEscape,
}: UnifiedTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Clamp focusedIndex when nodes array shrinks
  useEffect(() => {
    if (focusedIndex >= nodes.length && nodes.length > 0) {
      setFocusedIndex(nodes.length - 1);
    } else if (nodes.length === 0) {
      setFocusedIndex(0);
    }
  }, [nodes.length, focusedIndex]);

  // ── Sticky parents ─────────────────────────────────────────────────────────
  const {
    stack: stickyStack,
    onScroll: updateSticky,
    stackHeight,
  } = useStickyStack(nodes, rowHeight, scrollTopRef);

  // ── Virtualizer ────────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: (index) => nodes[index]?.id ?? index,
  });

  // ── Auto-scroll to activeNodeId ──────────────────────────────────────────
  const prevActiveNodeIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (activeNodeId === prevActiveNodeIdRef.current) return;
    prevActiveNodeIdRef.current = activeNodeId;
    if (!activeNodeId) return;
    const idx = nodes.findIndex((n) => n.id === activeNodeId);
    if (idx >= 0) {
      // Small delay so parent expand dispatches have settled
      setTimeout(() => virtualizer.scrollToIndex(idx, { align: "center" }), 80);
    }
  }, [activeNodeId, nodes, virtualizer]);

  // ── DOM-driven hover — no React re-renders ────────────────────────────────
  // Uses data-hovered attribute + elementFromPoint (same approach as StickyTree).
  // CSS :hover handles the common case; the JS hit-test covers fast scroll
  // where the pointer is stationary but rows move underneath it.
  const hoveredRef = useRef<HTMLElement | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef(0);

  const setHovered = useCallback((el: HTMLElement | null) => {
    if (el === hoveredRef.current) return;
    if (hoveredRef.current) hoveredRef.current.removeAttribute("data-hovered");
    hoveredRef.current = el;
    if (el) el.setAttribute("data-hovered", "");
  }, []);

  const hoverHitTest = useCallback(() => {
    const pos = pointerPosRef.current;
    if (!pos) return;
    const hit = document.elementFromPoint(pos.x, pos.y);
    const row = hit?.closest(".utree-row") as HTMLElement | null;
    setHovered(row);
  }, [setHovered]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      const clamped = Math.max(0, Math.min(el.scrollTop, maxScroll));
      scrollTopRef.current = clamped;
      updateSticky(clamped);
    }
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(hoverHitTest);
  }, [updateSticky, hoverHitTest]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      const target = (e.target as HTMLElement).closest(".utree-row") as HTMLElement | null;
      setHovered(target);
    },
    [setHovered],
  );

  const handlePointerLeave = useCallback(() => {
    pointerPosRef.current = null;
    setHovered(null);
  }, [setHovered]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = nodes.length;
      if (len === 0) return;

      const clamp = (i: number) => Math.max(0, Math.min(len - 1, i));
      const focused = nodes[focusedIndex];

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const next = clamp(focusedIndex + 1);
          setFocusedIndex(next);
          virtualizer.scrollToIndex(next, { align: "auto" });
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const next = clamp(focusedIndex - 1);
          setFocusedIndex(next);
          virtualizer.scrollToIndex(next, { align: "auto" });
          break;
        }
        case "ArrowRight":
        case "l": {
          e.preventDefault();
          if (!focused) break;
          if (focused.hasChildren && !focused.expanded) {
            onToggle(focused);
          } else if (focused.hasChildren && focused.expanded) {
            const next = clamp(focusedIndex + 1);
            setFocusedIndex(next);
            virtualizer.scrollToIndex(next, { align: "auto" });
          }
          break;
        }
        case "ArrowLeft":
        case "h": {
          e.preventDefault();
          if (!focused) break;
          if (focused.hasChildren && focused.expanded) {
            onToggle(focused);
          } else if (focused.parentId) {
            const parentIdx = nodes.findIndex((n) => n.id === focused.parentId);
            if (parentIdx >= 0) {
              setFocusedIndex(parentIdx);
              virtualizer.scrollToIndex(parentIdx, { align: "auto" });
            }
          }
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (!focused) break;
          if (focused.hasChildren) onToggle(focused);
          onActivate(focused);
          break;
        }
        case "Escape": {
          e.preventDefault();
          onEscape?.();
          break;
        }
        default:
          return;
      }
    },
    [focusedIndex, nodes, onToggle, onActivate, onEscape, virtualizer],
  );

  // ── Click handler ──────────────────────────────────────────────────────────
  const handleRowActivate = useCallback(
    (
      node: UnifiedTreeNode,
      modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
    ) => {
      const idx = nodes.indexOf(node);
      if (idx >= 0) setFocusedIndex(idx);
      onActivate(node, modifiers);
    },
    [nodes, onActivate],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const vItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex min-h-0 h-full flex-col overflow-hidden">
      {/* Sticky ancestor overlay — stacks expanded parents at the top */}
      {stickyStack.length > 0 && (
        <div className="absolute top-0 left-0 right-3 z-10 bg-[#191919]">
          {stickyStack.map((node) => (
            <UnifiedTreeRow
              key={`sticky-${node.id}`}
              node={node}
              style={{ position: "relative", top: 0, left: 0, width: "100%", height: rowHeight }}
              isFocused={false}
              isActive={activeNodeId === node.id}
              isSticky
              draggable={draggable}
              onToggle={onToggle}
              onActivate={handleRowActivate}
            />
          ))}
        </div>
      )}

      {/* Virtualised scroll area */}
      <div
        ref={scrollRef}
        className={`utree volt-scroll outline-none overflow-x-hidden overflow-y-auto min-h-0 flex-1 ${className ?? ""}`}
        style={{ paddingTop: stackHeight, overscrollBehavior: "none" }}
        tabIndex={tabIndex}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {vItems.map((vItem) => {
            const node = nodes[vItem.index];
            if (!node) return null;
            const rowStyle: CSSProperties = {
              position: "absolute",
              top: vItem.start,
              left: 0,
              width: "100%",
              height: rowHeight,
            };
            return (
              <UnifiedTreeRow
                key={node.id}
                node={node}
                style={rowStyle}
                isFocused={focusedIndex === vItem.index}
                isActive={activeNodeId === node.id}
                draggable={draggable}
                onToggle={onToggle}
                onActivate={handleRowActivate}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
