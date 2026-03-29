import { useState, useCallback, useRef } from "react";
import type { TreeNode } from "./types";

/**
 * Computes the full ancestor chain that should be "stuck" at the top of the
 * scroll container based on the current scroll position.
 *
 * Algorithm:
 * 1. Find the top-visible row index from scrollTop.
 * 2. Walk backwards to collect every expanded directory ancestor whose subtree
 *    still contains the top-visible index.
 * 3. Return the ordered stack (shallowest → deepest).
 */

function computeSubtreeEndIndices<T extends TreeNode>(nodes: T[]): number[] {
  const ends = new Array<number>(nodes.length);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type !== "directory" || !node.expanded || !node.hasChildren) {
      ends[i] = i;
    } else {
      // The subtree end is the last consecutive node with depth > this node's depth
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

function buildStickyStack<T extends TreeNode>(
  nodes: T[],
  subtreeEnds: number[],
  topVisibleIndex: number,
): T[] {
  const stack: T[] = [];
  // Walk from the beginning up to topVisibleIndex, collecting ancestors
  // whose subtree spans past topVisibleIndex
  for (let i = 0; i <= topVisibleIndex; i++) {
    const node = nodes[i];
    if (
      node.type === "directory" &&
      node.expanded &&
      subtreeEnds[i] >= topVisibleIndex &&
      i !== topVisibleIndex // don't stick the row that's already at the top
    ) {
      // Only keep the deepest ancestor at each depth level
      // (pop shallower-or-equal-depth entries that ended before this one)
      while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
        stack.pop();
      }
      stack.push(node);
    }
  }
  return stack;
}

export interface StickyStackState<T extends TreeNode> {
  stack: T[];
  topVisibleIndex: number;
}

export function useStickyStack<T extends TreeNode>(nodes: T[], rowHeight: number) {
  const [state, setState] = useState<StickyStackState<T>>({
    stack: [],
    topVisibleIndex: 0,
  });
  const subtreeEndsRef = useRef<number[]>([]);
  const nodesRef = useRef(nodes);

  // Recompute subtree ends when nodes change (identity check)
  if (nodesRef.current !== nodes) {
    nodesRef.current = nodes;
    subtreeEndsRef.current = computeSubtreeEndIndices(nodes);
  }
  if (subtreeEndsRef.current.length === 0 && nodes.length > 0) {
    subtreeEndsRef.current = computeSubtreeEndIndices(nodes);
  }

  const onScroll = useCallback(
    (scrollTop: number) => {
      const topIdx = Math.floor(scrollTop / rowHeight);
      const clamped = Math.max(0, Math.min(topIdx, nodes.length - 1));
      const stack = buildStickyStack(nodes, subtreeEndsRef.current, clamped);
      setState({ stack, topVisibleIndex: clamped });
    },
    [nodes, rowHeight],
  );

  return { ...state, onScroll, stackHeight: state.stack.length * rowHeight };
}
