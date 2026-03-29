import type { ReactNode } from "react";

/** Minimal contract a node must satisfy to be used in StickyTree. */
export interface TreeNode {
  id: string;
  label: string;
  depth: number;
  type: "file" | "directory" | "symlink" | "unknown";
  expanded: boolean;
  parentId: string | null;
  hasChildren: boolean;
}

// ─── Core node type for the unified tree ─────────────────────────────────────
// Every item in the tree (project headers, subsection headers, leaf items,
// file-tree nodes) is represented as a single UnifiedTreeNode.

export type UnifiedNodeKind =
  | "root" // top-level project header
  | "section" // Terminal, Browser, Actions, Explorer headers
  | "item" // leaf items: individual terminal, browser, script, todo
  | "file" // file-tree file node
  | "directory"; // file-tree directory node

export interface UnifiedTreeNode {
  /** Unique stable ID. */
  id: string;
  /** Display label. */
  label: string;
  /** Nesting depth (0 = root). Used for padding offset. */
  depth: number;
  /** Semantic kind — drives rendering & keyboard behavior. */
  kind: UnifiedNodeKind;
  /** Whether this node is expanded (only meaningful for expandable nodes). */
  expanded: boolean;
  /** Whether this node has children (drives chevron visibility). */
  hasChildren: boolean;
  /** Parent node ID, null for roots. */
  parentId: string | null;
  /** Icon element to render (ReactNode for SVG inline icons or <img>). */
  icon?: ReactNode;
  /** Optional secondary text (e.g. terminal ID suffix). */
  meta?: string;
  /** Optional status badge text shown at the far right (e.g. "M", "A", "D"). */
  statusBadge?: string;
  /** Optional badge count (e.g. terminal count). */
  badge?: number;
  /** Action buttons shown on hover. */
  actions?: UnifiedNodeAction[];
  /**
   * Arbitrary payload — the consumer can attach data here and read it back
   * in callbacks without needing to look it up.
   */
  data?: unknown;
}

export interface UnifiedNodeAction {
  id: string;
  icon: ReactNode;
  title: string;
  /** Optional CSS class variant for hover color (e.g. 'play', 'delete'). */
  variant?: "default" | "play" | "delete";
  onClick: () => void;
}

// ─── Tree callbacks ──────────────────────────────────────────────────────────

export interface UnifiedTreeCallbacks {
  /** Toggle expand/collapse on a node. */
  onToggle: (node: UnifiedTreeNode) => void;
  /** Activate / click a node. Modifiers are set when triggered by pointer; absent for keyboard. */
  onActivate: (
    node: UnifiedTreeNode,
    modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
  ) => void;
  /** Called when user presses Escape at the top level. */
  onEscape?: () => void;
}
