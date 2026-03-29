import { useState, useCallback, useEffect, type CSSProperties } from "react";
import type { FlatNode } from "../../../../shared/types";
import { StickyTree, type RenderRowProps } from "./index";
import TreeRow, { InlineInput } from "./TreeRow";

const ROW_HEIGHT = 24;

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateMode = "file" | "dir";

export interface PendingCreate {
  mode: CreateMode;
  parentId: string;
  depth: number;
}

interface FileTreeProps {
  nodes: FlatNode[];
  activeNodeId: string | null;
  selectedNodeIds?: Set<string>;
  pendingCreate: PendingCreate | null;
  renamingNodeId: string | null;
  onExpand: (node: FlatNode) => void;
  onCollapse: (nodeId: string) => void;
  onNodeClick: (node: FlatNode, shiftKey: boolean) => void;
  onCreateCommit: (parentId: string, name: string, mode: CreateMode) => void;
  onCreateCancel: () => void;
  onRenameCommit: (node: FlatNode, newName: string) => void;
  onRenameCancel: () => void;
  onNodeTerminal?: (node: FlatNode) => void;
  onNodeCreateNote?: (node: FlatNode) => void;
  onNodeCreateTodo?: (node: FlatNode) => void;
  onDeleteRequest?: () => void;
  onStartRenameNode?: (node: FlatNode) => void;
  onDeleteNode?: (node: FlatNode) => void;
  onEscape?: () => void;
  /** When true, directory rows accept drag-and-drop to move files/folders */
  draggable?: boolean;
}

// ─── FileTree ────────────────────────────────────────────────────────────────

export default function FileTree({
  nodes,
  activeNodeId,
  selectedNodeIds,
  pendingCreate,
  renamingNodeId,
  onExpand,
  onCollapse,
  onNodeClick,
  onCreateCommit,
  onCreateCancel,
  onRenameCommit,
  onRenameCancel,
  onNodeTerminal,
  onNodeCreateNote,
  onNodeCreateTodo,
  onDeleteRequest,
  onStartRenameNode,
  onDeleteNode,
  onEscape,
  draggable = false,
}: FileTreeProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Virtual count includes a slot for the pending-create input row
  const totalCount = nodes.length + (pendingCreate ? 1 : 0);

  // ── keyboard navigation ──────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (pendingCreate || renamingNodeId) return;

      const moveFocus = (delta: number) => {
        setFocusedIndex((i) => Math.max(0, Math.min(nodes.length - 1, i + delta)));
      };

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onEscape?.();
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          if (focusedIndex >= nodes.length - 1) {
            // At last node — hand back to sidebar to move to next sibling
            onEscape?.();
          } else {
            moveFocus(1);
          }
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          moveFocus(-1);
          break;
        case "ArrowRight": {
          e.preventDefault();
          const node = nodes[focusedIndex];
          if (!node) break;
          if (node.type === "directory" && !node.expanded) onExpand(node);
          else if (node.expanded) moveFocus(1);
          break;
        }
        case "l": {
          e.preventDefault();
          const node = nodes[focusedIndex];
          if (!node) break;
          if (node.type === "directory") {
            if (node.expanded) onCollapse(node.id);
            else onExpand(node);
          }
          break;
        }
        case "ArrowLeft":
        case "h": {
          e.preventDefault();
          const node = nodes[focusedIndex];
          if (!node) break;
          if (node.type === "directory" && node.expanded) {
            onCollapse(node.id);
          } else if (node.parentId) {
            const parentIdx = nodes.findIndex((n) => n.id === node.parentId);
            if (parentIdx >= 0) setFocusedIndex(parentIdx);
          } else {
            // At root with no parent — escape back to sidebar
            onEscape?.();
          }
          break;
        }
      }
    },
    [focusedIndex, nodes, pendingCreate, renamingNodeId, onExpand, onCollapse, onEscape],
  );

  // Clamp when nodes change
  useEffect(() => {
    if (focusedIndex >= nodes.length) {
      setFocusedIndex(Math.max(0, nodes.length - 1));
    }
  }, [nodes.length, focusedIndex]);

  const handleClick = useCallback(
    (node: FlatNode, shiftKey: boolean) => {
      const idx = nodes.findIndex((n) => n.id === node.id);
      if (idx >= 0) setFocusedIndex(idx);
      onNodeClick(node, shiftKey);
    },
    [nodes, onNodeClick],
  );

  // Cmd+Backspace → delete
  const handleKeyDownWithDelete = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
        e.preventDefault();
        onDeleteRequest?.();
        return;
      }
      handleKeyDown(e);
    },
    [handleKeyDown, onDeleteRequest],
  );

  // ── create-input insertion point ────────────────────────────────────────

  const createInsertIndex = pendingCreate
    ? nodes.findIndex((n) => n.id === pendingCreate.parentId) + 1
    : -1;

  // ── render callbacks for StickyTree ─────────────────────────────────────

  const renderRow = useCallback(
    ({ node, style, isSticky }: RenderRowProps<FlatNode>) => (
      <TreeRow
        key={isSticky ? `sticky-${node.id}` : node.id}
        node={node}
        style={style}
        isActive={activeNodeId === node.id}
        isSelected={selectedNodeIds?.has(node.id) ?? false}
        isFocused={!isSticky && focusedIndex === nodes.indexOf(node)}
        isSticky={isSticky}
        isRenaming={!isSticky && renamingNodeId === node.id}
        draggable={draggable}
        onExpand={onExpand}
        onCollapse={onCollapse}
        onClick={handleClick}
        onRenameCommit={onRenameCommit}
        onRenameCancel={onRenameCancel}
        onStartRename={onStartRenameNode}
        onDelete={onDeleteNode}
        onTerminal={onNodeTerminal}
        onCreateNote={onNodeCreateNote}
        onCreateTodo={onNodeCreateTodo}
      />
    ),
    [
      activeNodeId,
      selectedNodeIds,
      focusedIndex,
      nodes,
      renamingNodeId,
      onExpand,
      onCollapse,
      handleClick,
      onRenameCommit,
      onRenameCancel,
      onStartRenameNode,
      onDeleteNode,
      onNodeTerminal,
      onNodeCreateNote,
      onNodeCreateTodo,
    ],
  );

  const renderInjectedRow = useCallback(
    (virtualIndex: number, style: CSSProperties) => {
      if (!pendingCreate || virtualIndex !== createInsertIndex) return null;
      return (
        <InlineInput
          key="__create__"
          node={null}
          depth={pendingCreate.depth}
          style={style}
          onCommit={(name) => onCreateCommit(pendingCreate.parentId, name, pendingCreate.mode)}
          onCancel={onCreateCancel}
        />
      );
    },
    [pendingCreate, createInsertIndex, onCreateCommit, onCreateCancel],
  );

  const resolveNodeIndex = useCallback(
    (virtualIndex: number) => {
      if (pendingCreate && virtualIndex > createInsertIndex) return virtualIndex - 1;
      return virtualIndex;
    },
    [pendingCreate, createInsertIndex],
  );

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <StickyTree<FlatNode>
      nodes={nodes}
      rowHeight={ROW_HEIGHT}
      virtualCount={totalCount}
      renderRow={renderRow}
      renderInjectedRow={renderInjectedRow}
      resolveNodeIndex={resolveNodeIndex}
      className="file-tree__scroll"
      onKeyDown={handleKeyDownWithDelete}
    />
  );
}
