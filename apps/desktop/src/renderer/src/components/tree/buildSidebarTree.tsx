import type { ReactNode } from "react";
import type { FlatNode } from "../../../../shared/types";
import type { TileState } from "../../workbench/contrib/canvas/store/useTileStore";
import type { UnifiedTreeNode, UnifiedNodeAction } from "./types";
import { iconSrcFor } from "./TreeRow";
import { getFileIconNode } from "../../workbench/contrib/source-control/fileIcon";

// ─── Icon helpers (inline SVGs for sidebar sections) ─────────────────────────

function IconTerminal() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconBrowser() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconActions() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconExplorer() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconScriptFile() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// ─── File node icon ──────────────────────────────────────────────────────────

function FileNodeIcon({ node }: { node: FlatNode }) {
  if (node.type === "directory") {
    return <img src={iconSrcFor(node)} width={16} height={16} alt="" draggable={false} />;
  }
  return <>{getFileIconNode(node.label, 16)}</>;
}

// ─── Script type ─────────────────────────────────────────────────────────────

export interface Script {
  id: string;
  name: string;
  content: string;
  type: string;
}

// ─── Workspace config passed in by the Sidebar ──────────────────────────────

export interface WorkspaceTreeConfig {
  id: string;
  label: string;
  isActive: boolean;
  expanded: boolean;
  terminalsOpen: boolean;
  browsersOpen: boolean;
  actionsOpen: boolean;
  scriptsOpen: boolean;
  explorerOpen: boolean;
  terminalTiles: TileState[];
  browserTiles: TileState[];
  scripts: Script[];
  flatNodes: FlatNode[];
  /** Icon getter for terminal tiles (from presets). */
  getTerminalIcon?: (tile: TileState) => ReactNode;
  // Action callbacks
  onRemoveWorkspace: () => void;
  onFocusTerminal: (tile: TileState) => void;
  onCloseTerminal: (tile: TileState) => void;
  onNewTerminal: () => void;
  onFocusBrowser: (tile: TileState) => void;
  onCloseBrowser: (tile: TileState) => void;
  onNewBrowser: () => void;
  onRunScript: (script: Script) => void;
  onDeleteScript: (id: string) => void;
  onNewScript: () => void;
  onOpenTodos: () => void;
  // Explorer actions
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onOpenTerminalAtRoot: () => void;
}

// ─── Git branch icon ─────────────────────────────────────────────────────────

function IconGitBranch() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="8" r="3" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <path d="M18 11c0 6-12 3-12 9" />
    </svg>
  );
}

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Converts one or more workspace configs into a flat array of UnifiedTreeNodes.
 * This is the single source of truth for sidebar tree structure.
 */
export function buildSidebarTree(configs: WorkspaceTreeConfig[]): UnifiedTreeNode[] {
  const nodes: UnifiedTreeNode[] = [];

  for (const ws of configs) {
    const wsPrefix = `ws:${ws.id}`;

    // ── Root: workspace header (depth 0) ──
    const rootActions: UnifiedNodeAction[] = [
      {
        id: "git",
        icon: <IconGitBranch />,
        title: "Source Control",
        onClick: () =>
          window.dispatchEvent(
            new CustomEvent("volt:toggle-right-sidebar", {
              detail: { view: "git", workspacePath: ws.id },
            }),
          ),
      },
      {
        id: "remove",
        icon: <IconClose />,
        title: "Remove workspace",
        variant: "delete",
        onClick: ws.onRemoveWorkspace,
      },
    ];
    nodes.push({
      id: wsPrefix,
      label: ws.label,
      depth: 0,
      kind: "root",
      expanded: ws.expanded,
      hasChildren: true,
      parentId: null,
      actions: rootActions,
    });

    if (!ws.expanded) continue;

    // ── Terminal section (depth 1) ──
    const termSectionId = `${wsPrefix}:terminal`;
    const termActions: UnifiedNodeAction[] = [
      { id: "new", icon: <IconPlus />, title: "New terminal", onClick: ws.onNewTerminal },
    ];
    nodes.push({
      id: termSectionId,
      label: "Terminal",
      depth: 1,
      kind: "section",
      expanded: ws.terminalsOpen,
      hasChildren: true,
      parentId: wsPrefix,
      icon: <IconTerminal />,
      badge: ws.terminalTiles.length || undefined,
      actions: termActions,
    });

    if (ws.terminalsOpen) {
      if (ws.terminalTiles.length === 0) {
        nodes.push({
          id: `${termSectionId}:empty`,
          label: "No terminals open",
          depth: 2,
          kind: "item",
          expanded: false,
          hasChildren: false,
          parentId: termSectionId,
        });
      } else {
        for (const tile of ws.terminalTiles) {
          nodes.push({
            id: `${termSectionId}:${tile.id}`,
            label: tile.title,
            depth: 2,
            kind: "item",
            expanded: false,
            hasChildren: false,
            parentId: termSectionId,
            icon: ws.getTerminalIcon?.(tile) ?? <IconTerminal />,
            meta: tile.id.slice(-6),
            actions: [
              {
                id: "close",
                icon: <IconClose />,
                title: "Close terminal",
                variant: "delete",
                onClick: () => ws.onCloseTerminal(tile),
              },
            ],
            data: tile,
          });
        }
      }
    }

    // ── Browser section (depth 1) ──
    const brwSectionId = `${wsPrefix}:browser`;
    const brwActions: UnifiedNodeAction[] = ws.browsersOpen
      ? [{ id: "new", icon: <IconPlus />, title: "New browser", onClick: ws.onNewBrowser }]
      : [];
    nodes.push({
      id: brwSectionId,
      label: "Browser",
      depth: 1,
      kind: "section",
      expanded: ws.browsersOpen,
      hasChildren: true,
      parentId: wsPrefix,
      icon: <IconBrowser />,
      badge: ws.browserTiles.length || undefined,
      actions: brwActions,
    });

    if (ws.browsersOpen) {
      if (ws.browserTiles.length === 0) {
        nodes.push({
          id: `${brwSectionId}:empty`,
          label: "No browsers open",
          depth: 2,
          kind: "item",
          expanded: false,
          hasChildren: false,
          parentId: brwSectionId,
        });
      } else {
        for (const tile of ws.browserTiles) {
          nodes.push({
            id: `${brwSectionId}:${tile.id}`,
            label: tile.title,
            depth: 2,
            kind: "item",
            expanded: false,
            hasChildren: false,
            parentId: brwSectionId,
            icon: <IconBrowser />,
            meta: tile.id.slice(-6),
            actions: [
              {
                id: "close",
                icon: <IconClose />,
                title: "Close browser",
                variant: "delete",
                onClick: () => ws.onCloseBrowser(tile),
              },
            ],
            data: tile,
          });
        }
      }
    }

    // ── Actions section (depth 1) ──
    const actSectionId = `${wsPrefix}:actions`;
    nodes.push({
      id: actSectionId,
      label: "Actions",
      depth: 1,
      kind: "section",
      expanded: ws.actionsOpen,
      hasChildren: true,
      parentId: wsPrefix,
      icon: <IconActions />,
    });

    if (ws.actionsOpen) {
      // Scripts sub-section (depth 2)
      const scriptsSectionId = `${actSectionId}:scripts`;
      const scriptActions: UnifiedNodeAction[] = ws.scriptsOpen
        ? [{ id: "new", icon: <IconPlus />, title: "New script", onClick: ws.onNewScript }]
        : [];
      nodes.push({
        id: scriptsSectionId,
        label: "Scripts",
        depth: 2,
        kind: "section",
        expanded: ws.scriptsOpen,
        hasChildren: true,
        parentId: actSectionId,
        icon: <IconScriptFile />,
        badge: ws.scripts.length || undefined,
        actions: scriptActions,
      });

      if (ws.scriptsOpen) {
        for (const script of ws.scripts) {
          nodes.push({
            id: `${scriptsSectionId}:${script.id}`,
            label: script.name,
            depth: 3,
            kind: "item",
            expanded: false,
            hasChildren: false,
            parentId: scriptsSectionId,
            icon: <IconScriptFile />,
            actions: [
              {
                id: "run",
                icon: <IconPlay />,
                title: "Run",
                variant: "play",
                onClick: () => ws.onRunScript(script),
              },
              {
                id: "delete",
                icon: <IconClose />,
                title: "Delete",
                variant: "delete",
                onClick: () => ws.onDeleteScript(script.id),
              },
            ],
            data: script,
          });
        }
      }

      // Todos item (depth 2)
      nodes.push({
        id: `${actSectionId}:todos`,
        label: "Todos",
        depth: 2,
        kind: "item",
        expanded: false,
        hasChildren: false,
        parentId: actSectionId,
        icon: <IconTodo />,
      });
    }

    // ── Explorer section (depth 1) ──
    const expSectionId = `${wsPrefix}:explorer`;
    const expActions: UnifiedNodeAction[] = ws.explorerOpen
      ? [
          { id: "newfile", icon: <IconNewFile />, title: "New File", onClick: ws.onNewFile },
          {
            id: "newfolder",
            icon: <IconNewFolder />,
            title: "New Folder",
            onClick: ws.onNewFolder,
          },
          { id: "refresh", icon: <IconRefresh />, title: "Refresh", onClick: ws.onRefresh },
          {
            id: "collapse",
            icon: <IconCollapseAll />,
            title: "Collapse All",
            onClick: ws.onCollapseAll,
          },
        ]
      : [];
    nodes.push({
      id: expSectionId,
      label: "Explorer",
      depth: 1,
      kind: "section",
      expanded: ws.explorerOpen,
      hasChildren: true,
      parentId: wsPrefix,
      icon: <IconExplorer />,
      actions: expActions,
    });

    if (ws.explorerOpen) {
      // File tree nodes mapped to unified nodes
      for (const fn of ws.flatNodes) {
        const isDir = fn.type === "directory";
        nodes.push({
          id: `${expSectionId}:${fn.id}`,
          label: fn.label,
          depth: 2 + fn.depth, // offset by explorer section depth + 1
          kind: isDir ? "directory" : "file",
          expanded: fn.expanded,
          hasChildren: fn.hasChildren,
          parentId: fn.parentId ? `${expSectionId}:${fn.parentId}` : expSectionId,
          icon: <FileNodeIcon node={fn} />,
          data: fn,
        });
      }
    }
  }

  return nodes;
}

// ─── Small icon components used in actions ──────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconNewFile() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function IconNewFolder() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconCollapseAll() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
