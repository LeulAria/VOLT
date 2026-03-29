import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "../../platform/hooks/useWorkspace";
import { useTileStore, type TileState } from "../../workbench/contrib/canvas/store/useTileStore";
import { useWorkspaceStore } from "../../workbench/contrib/canvas/store/useWorkspaceStore";
import { getPresetIcon, AI_PRESETS, type AIPreset } from "../../lib/ai-presets";
import type { FlatNode } from "../../../../shared/types";
import {
  UnifiedTree,
  buildSidebarTree,
  type UnifiedTreeNode,
  type WorkspaceTreeConfig,
  type Script,
} from "../tree/index";
import { Tooltip } from "../ui/Tooltip";
import { useTabStore } from "../../workbench/contrib/canvas/store/useTabStore";
import { VOLTCODE_ENABLED } from "../../workbench/contrib/voltcode/feature-flag";
import { DeleteDialog } from "./DeleteDialog";
import { TerminalPopover } from "./TerminalPopover";

// ─── Workspace open state ────────────────────────────────────────────────────

interface WsOpenState {
  expanded: boolean;
  terminalsOpen: boolean;
  browsersOpen: boolean;
  actionsOpen: boolean;
  scriptsOpen: boolean;
  explorerOpen: boolean;
}

const defaultWsOpen = (): WsOpenState => ({
  expanded: false,
  terminalsOpen: false,
  browsersOpen: false,
  actionsOpen: false,
  scriptsOpen: false,
  explorerOpen: false,
});

// ─── Sidebar ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { t } = useTranslation();
  const [focusedWorkspaceId, setFocusedWorkspaceId] = useState<string | null>(null);
  const [wsOpenState, setWsOpenState] = useState<Record<string, WsOpenState>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [termPopoverOpen, setTermPopoverOpen] = useState(false);
  const [termPopoverPos, setTermPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodes: FlatNode[]; hasDir: boolean } | null>(
    null,
  );
  const [scriptsMap, setScriptsMap] = useState<Record<string, Script[]>>({});

  const setWsOpen = useCallback(
    (id: string, patch: Partial<WsOpenState>) =>
      setWsOpenState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? defaultWsOpen()), ...patch },
      })),
    [],
  );

  // ── Workspace hook ──────────────────────────────────────────────────────────
  const {
    workspaces,
    activeWorkspaceId,
    activeNodeId,
    flatNodes,
    openWorkspace,
    expandNode,
    collapseNode,
    collapseAll,
    revealPath,
    setActiveNode,
    setActiveWorkspace,
    refreshAll,
    deleteNodes,
    removeWorkspace,
  } = useWorkspace();

  // ── Tile store ──────────────────────────────────────────────────────────────
  const {
    addTerminalTile: _addTerminalTile,
    addBrowserTile: _addBrowserTile,
    addTerminalTileAtCenter,
    addBrowserTileAtCenter,
    addVoltCodeTileAtCenter,
    removeTile,
    bringToFront,
    setFocusedId,
  } = useTileStore();
  const tiles = useTileStore((s: { tiles: Record<string, TileState> }) => s.tiles);
  const tileOrder = useTileStore((s: { tileOrder: string[] }) => s.tileOrder);
  const setActiveWorkspacePath = useWorkspaceStore(
    (s: { setActiveWorkspacePath: (path: string | null) => void }) => s.setActiveWorkspacePath,
  );

  useEffect(() => {
    setActiveWorkspacePath(activeWorkspaceId);
  }, [activeWorkspaceId, setActiveWorkspacePath]);

  const terminalTiles = useMemo(
    () =>
      tileOrder
        .map((id: string) => tiles[id])
        .filter((t: TileState | undefined): t is TileState => t != null && t.type === "terminal"),
    [tiles, tileOrder],
  );

  const browserTiles = useMemo(
    () =>
      tileOrder
        .map((id: string) => tiles[id])
        .filter((t: TileState | undefined): t is TileState => t != null && t.type === "browser"),
    [tiles, tileOrder],
  );

  const voltCodeTiles = useMemo(
    () =>
      tileOrder
        .map((id: string) => tiles[id])
        .filter((t: TileState | undefined): t is TileState => t != null && t.type === "voltcode"),
    [tiles, tileOrder],
  );

  // ── Scripts ─────────────────────────────────────────────────────────────────

  // Initialize scripts from localStorage for each workspace
  useEffect(() => {
    const map: Record<string, Script[]> = {};
    for (const ws of workspaces) {
      try {
        map[ws.id] = JSON.parse(localStorage.getItem(`volt-scripts-${ws.id}`) ?? "[]");
      } catch {
        map[ws.id] = [];
      }
    }
    setScriptsMap(map);
  }, [workspaces]);

  const persistScripts = useCallback((wsId: string, scripts: Script[]) => {
    setScriptsMap((prev) => ({ ...prev, [wsId]: scripts }));
    localStorage.setItem(`volt-scripts-${wsId}`, JSON.stringify(scripts));
  }, []);

  // ── Callbacks ───────────────────────────────────────────────────────────────

  const handleFocusTerminal = useCallback(
    (tile: TileState) => {
      bringToFront(tile.id);
      setFocusedId(tile.id);
      window.dispatchEvent(new CustomEvent("volt:focus-tile", { detail: { tileId: tile.id } }));
    },
    [bringToFront, setFocusedId],
  );

  const handleCloseTerminal = useCallback((tile: TileState) => removeTile(tile.id), [removeTile]);

  const handleOpenTerminal = useCallback(
    (nodeId: string) => addTerminalTileAtCenter(nodeId),
    [addTerminalTileAtCenter],
  );

  const handleLaunchPreset = useCallback(
    (preset: AIPreset) => {
      const cwd = activeWorkspaceId ?? "/";
      addTerminalTileAtCenter(cwd, preset.command || undefined);
    },
    [addTerminalTileAtCenter, activeWorkspaceId],
  );

  const handleFocusBrowser = useCallback(
    (tile: TileState) => {
      bringToFront(tile.id);
      setFocusedId(tile.id);
      window.dispatchEvent(new CustomEvent("volt:focus-tile", { detail: { tileId: tile.id } }));
    },
    [bringToFront, setFocusedId],
  );

  const handleCloseBrowser = useCallback((tile: TileState) => removeTile(tile.id), [removeTile]);

  const handleLaunchBrowser = useCallback(() => addBrowserTileAtCenter(), [addBrowserTileAtCenter]);

  const handleRunScript = useCallback(
    async (content: string) => {
      const tempPath = await window.electron.scripts.run(content);
      addTerminalTileAtCenter(activeWorkspaceId ?? "/", tempPath);
    },
    [addTerminalTileAtCenter, activeWorkspaceId],
  );

  // ── New file/folder (inline creation in explorer) ────────────────────────
  const [pendingCreate, setPendingCreate] = useState<{
    type: "file" | "dir";
    parentPath: string;
    workspaceId: string;
  } | null>(null);

  // Handle delete from context menu
  useEffect(() => {
    const handler = async (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail as { nodeId: string };
      const node = flatNodes.find((n) => n.id === nodeId);
      if (!node) return;
      const hasDir = node.type === "directory";
      setDeleteConfirm({ nodes: [node], hasDir });
    };
    window.addEventListener("volt:tree-delete-node", handler);
    return () => window.removeEventListener("volt:tree-delete-node", handler);
  }, [flatNodes]);

  // Handle refresh from context menu rename
  useEffect(() => {
    const handler = () => refreshAll();
    window.addEventListener("volt:refresh-workspace", handler);
    return () => window.removeEventListener("volt:refresh-workspace", handler);
  }, [refreshAll]);

  // Cancellation token: bumped each time a new reveal fires so stale async reveals abort early
  const revealGenRef = useRef(0);

  // Reveal a file in the sidebar: single IPC call builds the full expanded tree, instant
  useEffect(() => {
    const handler = async (e: Event) => {
      const { filePath } = (e as CustomEvent).detail as { filePath: string };
      const gen = ++revealGenRef.current;

      const ws = workspaces.find(
        (w) => filePath === w.id || filePath.startsWith(w.id + "/"),
      );
      if (!ws) return;

      setActiveWorkspace(ws.id);
      setWsOpen(ws.id, { expanded: true, explorerOpen: true });

      const relative = filePath.slice(ws.id.length + 1);
      if (!relative) {
        setActiveNode(ws.id);
        return;
      }

      // One IPC call: main process reads root + all ancestor dirs in parallel,
      // returns the complete pre-order flat node list ready to render.
      await revealPath(ws.id, filePath);
      if (revealGenRef.current !== gen) return;

      setActiveNode(filePath);
    };

    window.addEventListener("volt:reveal-file", handler);
    return () => window.removeEventListener("volt:reveal-file", handler);
  }, [workspaces, revealPath, setActiveNode, setActiveWorkspace, setWsOpen]);

  // ── Build the unified tree ─────────────────────────────────────────────────

  const treeNodes = useMemo(() => {
    const configs: WorkspaceTreeConfig[] = workspaces
      .filter((ws) => {
        if (focusedWorkspaceId !== null && focusedWorkspaceId !== ws.id) return false;
        return true;
      })
      .map((ws) => {
        const open = wsOpenState[ws.id] ?? defaultWsOpen();
        const wsTerminals = terminalTiles;
        const wsScripts = scriptsMap[ws.id] ?? [];
        return {
          id: ws.id,
          label: ws.label,
          isActive: ws.id === activeWorkspaceId,
          expanded: open.expanded,
          terminalsOpen: open.terminalsOpen,
          browsersOpen: open.browsersOpen,
          actionsOpen: open.actionsOpen,
          scriptsOpen: open.scriptsOpen,
          explorerOpen: open.explorerOpen,
          terminalTiles: wsTerminals,
          browserTiles,
          scripts: wsScripts,
          flatNodes: ws.id === activeWorkspaceId ? flatNodes : ws.rootNodes,
          getTerminalIcon: (tile: TileState) => getPresetIcon(tile.initialCommand, 16),
          onRemoveWorkspace: () => removeWorkspace(ws.id),
          onFocusTerminal: handleFocusTerminal,
          onCloseTerminal: handleCloseTerminal,
          onNewTerminal: () => {
            if (sidebarRef.current) {
              const rect = sidebarRef.current.getBoundingClientRect();
              setTermPopoverPos({ x: rect.right + 4, y: Math.max(80, rect.top + 160) });
            }
            setTermPopoverOpen(true);
          },
          onFocusBrowser: handleFocusBrowser,
          onCloseBrowser: handleCloseBrowser,
          onNewBrowser: handleLaunchBrowser,
          onRunScript: (script: Script) => handleRunScript(script.content),
          onDeleteScript: (id: string) => {
            const updated = wsScripts.filter((s) => s.id !== id);
            persistScripts(ws.id, updated);
          },
          onNewScript: () => {
            const newScript: Script = {
              id: `script-${Date.now()}`,
              name: "setup",
              content: "#!/bin/bash\n\n",
              type: "Bash Script",
            };
            persistScripts(ws.id, [...wsScripts, newScript]);
          },
          onOpenTodos: () => {},
          onNewFile: () => {
            // Use the currently selected node's directory as parent, else workspace root
            const selected = flatNodes.find((n) => n.id === activeNodeId);
            const parentPath = selected?.type === "directory"
              ? selected.id
              : selected?.id
                ? selected.id.slice(0, selected.id.lastIndexOf("/")) || ws.id
                : ws.id;
            setPendingCreate({ type: "file", parentPath, workspaceId: ws.id });
          },
          onNewFolder: () => {
            const selected = flatNodes.find((n) => n.id === activeNodeId);
            const parentPath = selected?.type === "directory"
              ? selected.id
              : selected?.id
                ? selected.id.slice(0, selected.id.lastIndexOf("/")) || ws.id
                : ws.id;
            setPendingCreate({ type: "dir", parentPath, workspaceId: ws.id });
          },
          onRefresh: refreshAll,
          onCollapseAll: collapseAll,
          onOpenTerminalAtRoot: () => handleOpenTerminal(ws.id),
        } satisfies WorkspaceTreeConfig;
      });

    const nodes = buildSidebarTree(configs);

    // Inject inline create-input node if pending
    if (pendingCreate) {
      const explorerSectionId = `ws:${pendingCreate.workspaceId}:explorer`;
      const explorerIdx = nodes.findIndex((n) => n.id === explorerSectionId);
      if (explorerIdx >= 0) {
        const defaultName = pendingCreate.type === "dir" ? "NewFolder" : "untitled";
        const createNode: import("../tree/types").UnifiedTreeNode = {
          id: `ws:${pendingCreate.workspaceId}:pending-create`,
          kind: "file",
          label: defaultName,
          depth: 2,
          parentId: explorerSectionId,
          hasChildren: false,
          expanded: false,
          data: {
            isRenameInput: true,
            defaultValue: defaultName,
            onSave: async (name: string) => {
              const fullPath = `${pendingCreate.parentPath}/${name}`;
              try {
                if (pendingCreate.type === "dir") {
                  await window.electron.fs.createDir(fullPath);
                } else {
                  await window.electron.fs.createFile(fullPath);
                }
                refreshAll();
              } catch (e) {
                console.error("[create]", e);
              }
              setPendingCreate(null);
            },
            onCancel: () => setPendingCreate(null),
          },
        };
        nodes.splice(explorerIdx + 1, 0, createNode);
      }
    }

    return nodes;
  }, [
    workspaces,
    focusedWorkspaceId,
    wsOpenState,
    activeWorkspaceId,
    terminalTiles,
    browserTiles,
    flatNodes,
    scriptsMap,
    removeWorkspace,
    handleFocusTerminal,
    handleCloseTerminal,
    handleFocusBrowser,
    handleCloseBrowser,
    handleLaunchBrowser,
    handleRunScript,
    persistScripts,
    refreshAll,
    collapseAll,
    handleOpenTerminal,
    pendingCreate,
  ]);

  // ── Tree callbacks ─────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (node: UnifiedTreeNode) => {
      // Parse the node ID to determine what to toggle
      // Format: ws:{wsId}, ws:{wsId}:terminal, ws:{wsId}:browser, etc.
      const parts = node.id.split(":");

      if (node.kind === "root") {
        // Toggle workspace expanded
        const wsId = parts[1];
        if (node.expanded) {
          // Collapsing: reset all child sections to collapsed too
          setWsOpen(wsId, {
            expanded: false,
            terminalsOpen: false,
            browsersOpen: false,
            actionsOpen: false,
            scriptsOpen: false,
            explorerOpen: false,
          });
          // Also collapse all file tree nodes for this workspace
          collapseAll();
        } else {
          setWsOpen(wsId, { expanded: true });
          setActiveWorkspace(wsId);
        }
        return;
      }

      if (node.kind === "section") {
        const wsId = parts[1];
        const section = parts[2];
        if (section === "terminal") setWsOpen(wsId, { terminalsOpen: !node.expanded });
        else if (section === "browser") setWsOpen(wsId, { browsersOpen: !node.expanded });
        else if (section === "actions") {
          // Check if this is the scripts sub-section (ws:{id}:actions:scripts)
          if (parts.length >= 4 && parts[3] === "scripts") {
            setWsOpen(wsId, { scriptsOpen: !node.expanded });
          } else {
            if (node.expanded) {
              // Collapsing actions: also collapse scripts subsection
              setWsOpen(wsId, { actionsOpen: false, scriptsOpen: false });
            } else {
              setWsOpen(wsId, { actionsOpen: true });
            }
          }
        } else if (section === "explorer") {
          if (node.expanded) {
            // Collapsing explorer: also collapse all file tree nodes
            setWsOpen(wsId, { explorerOpen: false });
            collapseAll();
          } else {
            setWsOpen(wsId, { explorerOpen: true });
          }
        }
        return;
      }

      // File/directory nodes
      if (node.kind === "directory" || node.kind === "file") {
        const fn = node.data as FlatNode | undefined;
        if (fn) {
          if (fn.type === "directory") {
            if (fn.expanded) collapseNode(fn.id);
            else expandNode(fn);
          }
        }
      }
    },
    [setWsOpen, setActiveWorkspace, collapseNode, collapseAll, expandNode],
  );

  const handleActivate = useCallback(
    (
      node: UnifiedTreeNode,
      modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
    ) => {
      // Activate workspace when clicking any node within it
      const parts = node.id.split(":");
      const wsId = parts[1];
      if (wsId && wsId !== activeWorkspaceId) {
        setActiveWorkspace(wsId);
      }

      // For item nodes (terminal, browser items) — focus them
      if (node.kind === "item") {
        const tile = node.data as TileState | undefined;
        if (tile && tile.type === "terminal") {
          handleFocusTerminal(tile);
        } else if (tile && tile.type === "browser") {
          handleFocusBrowser(tile);
        }
        // Todos node
        if (node.id.endsWith(":todos")) {
          window.dispatchEvent(
            new CustomEvent("volt:toggle-right-sidebar", { detail: { view: "todos" } }),
          );
        }
      }

      // File/directory — set active node (don't toggle expand/collapse here,
      // that's already handled by handleToggle via the row's onClick)
      if (node.kind === "file") {
        const fn = node.data as FlatNode | undefined;
        if (fn && fn.type === "file") {
          // Trigger the reveal logic to ensure it centers and collapses others
          window.dispatchEvent(new CustomEvent("volt:reveal-file", { detail: { filePath: fn.id } }));
          
          // Open the tab
          const forceNew = !!(modifiers?.metaKey && modifiers?.shiftKey);
          const store = useTabStore.getState();
          if (forceNew) {
            const tabId = `file:${fn.id}`;
            // Remove existing tab for this file so a fresh one opens
            if (store.tabs.find((t) => t.id === tabId)) {
              store.closeTab(tabId);
            }
          }
          store.openFileTab({ filePath: fn.id, title: fn.label });
        } else if (fn) {
          setActiveNode(fn.id);
        }
      } else if (node.kind === "directory") {
        const fn = node.data as FlatNode | undefined;
        if (fn) setActiveNode(fn.id);
      }
    },
    [activeWorkspaceId, setActiveWorkspace, setActiveNode],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={sidebarRef} className="flex flex-col h-full overflow-hidden">
      <div className="drag-region" />

      {/* App header */}
      <div className="flex items-center justify-between px-[10px] pt-[50px] pb-[8px] flex-shrink-0 [-webkit-app-region:drag]">
        <div className="flex items-center gap-1">
          <Tooltip content={t("sidebar.addWorkspaceFolder")} position="right">
            <button
              className="w-5 h-5 flex items-center justify-center border-none bg-transparent text-white/40 text-lg leading-none cursor-pointer rounded p-0 hover:text-white/85 hover:bg-white/[0.08] transition-colors [-webkit-app-region:no-drag]"
              onClick={openWorkspace}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                id="Widget-Add--Streamline-Solar-Broken"
                height="18"
                width="18"
              >
                <desc>Widget Add Streamline Icon: https://streamlinehq.com</desc>
                <path
                  d="M14.5 6.5h3m0 0h3m-3 0v3m0 -3v-3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M2.55078 15.5c0.06394 -0.6501 0.20845 -1.0876 0.53504 -1.4142 0.58579 -0.5858 1.5286 -0.5858 3.41422 -0.5858 1.88561 0 2.82842 0 3.41421 0.5858C10.5 14.6716 10.5 15.6144 10.5 17.5c0 1.8856 0 2.8284 -0.58575 3.4142 -0.58579 0.5858 -1.5286 0.5858 -3.41421 0.5858 -1.88562 0 -2.82843 0 -3.41422 -0.5858 -0.30937 -0.3094 -0.45535 -0.7183 -0.52424 -1.3131"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M2.5 6.5c0 -1.88562 0 -2.82843 0.58579 -3.41421C3.67157 2.5 4.61438 2.5 6.5 2.5c1.88562 0 2.82843 0 3.41421 0.58579C10.5 3.67157 10.5 4.61438 10.5 6.5c0 1.88562 0 2.82843 -0.58579 3.41421C9.32843 10.5 8.38562 10.5 6.5 10.5c-1.88562 0 -2.82843 0 -3.41421 -0.58579C2.5 9.32843 2.5 8.38562 2.5 6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M13.5 17.5c0 -1.8856 0 -2.8284 0.5858 -3.4142C14.6716 13.5 15.6144 13.5 17.5 13.5c1.8856 0 2.8284 0 3.4142 0.5858 0.5858 0.5858 0.5858 1.5286 0.5858 3.4142 0 1.8856 0 2.8284 -0.5858 3.4142 -0.5858 0.5858 -1.5286 0.5858 -3.4142 0.5858 -1.8856 0 -2.8284 0 -3.4142 -0.5858C13.5 20.3284 13.5 19.3856 13.5 17.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></path>
              </svg>
            </button>
          </Tooltip>
          {workspaces.length > 1 && (
            <Tooltip content={t("sidebar.focusMode")} position="right">
              <button
                className={`w-5 h-5 flex items-center justify-center border-none bg-transparent text-white/40 cursor-pointer rounded p-0 hover:text-white/85 hover:bg-white/[0.08] transition-colors [-webkit-app-region:no-drag] ${focusedWorkspaceId ? "text-blue-400" : ""}`}
                onClick={() => setFocusedWorkspaceId((v) => (v ? null : activeWorkspaceId))}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Target--Streamline-Solar-Broken"
                  height="18"
                  width="18"
                >
                  <desc>Target Streamline Icon: https://streamlinehq.com</desc>
                  <path
                    d="m2 12 3 0"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="m19 12 3 0"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="m12 22 0 -3"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="m12 5 0 -3"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="M10 12h4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="m12 14 0 -2 0 -2"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2c5.5228 0 10 4.47715 10 10 0 5.5228 -4.4772 10 -10 10 -5.52285 0 -10 -4.4772 -10 -10 0 -1.8214 0.48697 -3.52913 1.33782 -5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  ></path>
                </svg>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* VOLT CODE section */}
      {VOLTCODE_ENABLED && (
        <div className="flex-shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", userSelect: "none" }}>
              VOLT CODE
            </span>
            <div className="flex items-center gap-0.5">
              {/* Open as tab */}
              <Tooltip content="Open Volt Code" position="right">
                <button
                  onClick={() => useTabStore.getState().openVoltCodeTab()}
                  className="flex h-5 w-5 items-center justify-center rounded text-white/35 hover:text-white/70 hover:bg-white/[0.07] transition-colors [-webkit-app-region:no-drag]"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="13" width="13">
                    <path d="M15.2683 18.2287c-1.9794 2.678-2.9691 4.0171-3.8925 3.7341-0.9233-0.283-0.9233-1.9253-0.9233-5.21l0.0001-0.3095c0-1.1848 0-1.7771-0.3786-2.1487l-0.02-0.0192c-0.3867-0.3637-1.00321-0.3637-2.23625-0.3637-2.21887 0-3.3283 0-3.70325-0.673-0.00621-0.0111-0.01225-0.0223-0.01811-0.0337-0.35395-0.6833 0.28841-1.5524 1.57314-3.29064l3.06214-4.14303C10.711 3.09327 11.7007 1.75425 12.6241 2.03721c0.9233 0.28297 0.9233 1.92528 0.9233 5.20991v0.3097c0 1.18469 0 1.77704 0.3786 2.14859l0.02 0.01925c0.3867 0.36374 1.0032 0.36374 2.2362 0.36374 2.2189 0 3.3284 0 3.7033 0.6729 0.0062 0.0111 0.0122 0.0224 0.0181 0.0337 0.354 0.6834-0.2884 1.5525-1.5732 3.2907" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                  </svg>
                </button>
              </Tooltip>
              {/* Open as canvas tile */}
              <Tooltip content="Open as canvas tile" position="right">
                <button
                  onClick={() => addVoltCodeTileAtCenter()}
                  className="flex h-5 w-5 items-center justify-center rounded text-white/35 hover:text-white/70 hover:bg-white/[0.07] transition-colors [-webkit-app-region:no-drag]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
          {voltCodeTiles.length > 0 && (
            <div className="pb-1.5">
              {voltCodeTiles.map((tile) => (
                <div
                  key={tile.id}
                  className="group flex items-center gap-2 px-3 py-1 hover:bg-white/[0.04] cursor-pointer [-webkit-app-region:no-drag]"
                  onClick={() => {
                    bringToFront(tile.id);
                    setFocusedId(tile.id);
                    window.dispatchEvent(new CustomEvent("volt:focus-tile", { detail: { tileId: tile.id } }));
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="12" width="12" className="text-white/30 flex-shrink-0">
                    <path d="M15.2683 18.2287c-1.9794 2.678-2.9691 4.0171-3.8925 3.7341-0.9233-0.283-0.9233-1.9253-0.9233-5.21l0.0001-0.3095c0-1.1848 0-1.7771-0.3786-2.1487l-0.02-0.0192c-0.3867-0.3637-1.00321-0.3637-2.23625-0.3637-2.21887 0-3.3283 0-3.70325-0.673-0.00621-0.0111-0.01225-0.0223-0.01811-0.0337-0.35395-0.6833 0.28841-1.5524 1.57314-3.29064l3.06214-4.14303C10.711 3.09327 11.7007 1.75425 12.6241 2.03721c0.9233 0.28297 0.9233 1.92528 0.9233 5.20991v0.3097c0 1.18469 0 1.77704 0.3786 2.14859l0.02 0.01925c0.3867 0.36374 1.0032 0.36374 2.2362 0.36374 2.2189 0 3.3284 0 3.7033 0.6729 0.0062 0.0111 0.0122 0.0224 0.0181 0.0337 0.354 0.6834-0.2884 1.5525-1.5732 3.2907" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                  </svg>
                  <span className="flex-1 text-[12px] text-white/55 truncate">{tile.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTile(tile.id); }}
                    className="opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded text-white/30 hover:text-white/70 transition-all"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKSPACES label */}
      <div
        style={{
          padding: "6px 10px 4px 12px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          fontFamily: "Geist, -apple-system, sans-serif",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        WORKSPACES
      </div>

      {/* Unified tree */}
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 flex-1 text-white/35 text-[13px]">
          <p className="m-0">{t("sidebar.noFolderOpen")}</p>
          <button
            className="px-[14px] py-[6px] rounded-md border border-white/15 bg-white/[0.06] text-white/70 text-[13px] cursor-pointer hover:bg-white/10 [-webkit-app-region:no-drag]"
            onClick={openWorkspace}
          >
            {t("sidebar.openFolder")}
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <UnifiedTree
            nodes={treeNodes}
            activeNodeId={activeNodeId ? `ws:${activeWorkspaceId}:explorer:${activeNodeId}` : null}
            draggable
            onToggle={handleToggle}
            onActivate={handleActivate}
            className="flex min-h-0 flex-1 flex-col outline-none"
          />
        </div>
      )}

      {/* Terminal preset popover — portalled to escape sidebar backdrop-filter containing block */}
      {termPopoverOpen && createPortal(
        <TerminalPopover
          presets={AI_PRESETS}
          onLaunch={handleLaunchPreset}
          onClose={() => setTermPopoverOpen(false)}
          pos={termPopoverPos}
        />,
        document.body,
      )}

      {/* Delete confirmation — portalled so fixed inset-0 covers the full viewport */}
      {deleteConfirm && createPortal(
        <DeleteDialog
          nodes={deleteConfirm.nodes}
          hasDir={deleteConfirm.hasDir}
          onConfirm={async () => {
            await deleteNodes(deleteConfirm.nodes.map((n) => n.id));
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />,
        document.body,
      )}
    </div>
  );
}
