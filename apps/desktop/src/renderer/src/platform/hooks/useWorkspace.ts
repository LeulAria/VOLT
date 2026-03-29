import { useCallback, useEffect, useReducer, useRef } from "react";
import path from "path-browserify";
import type { FlatNode } from "../../../../shared/types";

interface WorkspaceEntry {
  id: string;
  label: string;
  rootNodes: FlatNode[];
}

interface WorkspaceState {
  workspaces: WorkspaceEntry[];
  activeWorkspaceId: string | null;
  flatNodes: FlatNode[];
  activeNodeId: string | null;
}

type Action =
  | { type: "SET_WORKSPACES"; payload: WorkspaceEntry[] }
  | { type: "ADD_WORKSPACE"; id: string; label: string; nodes: FlatNode[] }
  | { type: "SET_ACTIVE"; id: string }
  | { type: "SET_ACTIVE_NODE"; nodeId: string | null }
  | { type: "SPLICE_CHILDREN"; parentId: string; children: FlatNode[] }
  | { type: "REPLACE_CHILDREN"; parentId: string; children: FlatNode[] }
  | { type: "COLLAPSE_NODE"; nodeId: string }
  | { type: "COLLAPSE_ALL" }
  | { type: "EXPAND_TO_DEPTH"; nodes: FlatNode[] }
  | { type: "MARK_NODE"; nodeId: string; status: FlatNode["status"] }
  | { type: "RENAME_NODE"; oldId: string; newId: string; newLabel: string }
  | { type: "INSERT_NODE"; node: FlatNode; afterParentId: string }
  | { type: "REMOVE_WORKSPACE"; id: string }
  | { type: "REMOVE_NODES"; ids: string[] };

function collapseDescendants(nodes: FlatNode[], parentId: string): FlatNode[] {
  const prefix = parentId + "/";
  return nodes.filter((n) => !n.id.startsWith(prefix));
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "SET_WORKSPACES": {
      const ws = action.payload;
      const active = ws[0] ?? null;
      return {
        workspaces: ws,
        activeWorkspaceId: active?.id ?? null,
        flatNodes: active?.rootNodes ?? [],
        activeNodeId: null,
      };
    }
    case "ADD_WORKSPACE": {
      const ws = [
        ...state.workspaces,
        { id: action.id, label: action.label, rootNodes: action.nodes },
      ];
      return { ...state, workspaces: ws, activeWorkspaceId: action.id, flatNodes: action.nodes };
    }
    case "SET_ACTIVE": {
      const ws = state.workspaces.find((w) => w.id === action.id);
      return { ...state, activeWorkspaceId: action.id, flatNodes: ws?.rootNodes ?? [] };
    }
    case "SET_ACTIVE_NODE":
      return { ...state, activeNodeId: action.nodeId };
    case "SPLICE_CHILDREN": {
      const nodes = [...state.flatNodes];
      const parentIdx = nodes.findIndex((n) => n.id === action.parentId);
      if (parentIdx < 0) return state;
      nodes[parentIdx] = { ...nodes[parentIdx], expanded: true, status: "loaded" };
      nodes.splice(parentIdx + 1, 0, ...action.children);
      return { ...state, flatNodes: nodes };
    }
    case "REPLACE_CHILDREN": {
      // Collapse existing children then splice fresh ones
      const nodes = [...state.flatNodes];
      const parentIdx = nodes.findIndex((n) => n.id === action.parentId);
      if (parentIdx < 0) return state;
      const prefix = action.parentId + "/";
      const before = nodes.slice(0, parentIdx + 1);
      const after = nodes.slice(parentIdx + 1).filter((n) => !n.id.startsWith(prefix));
      before[parentIdx] = { ...before[parentIdx], expanded: true, status: "loaded" };
      return { ...state, flatNodes: [...before, ...action.children, ...after] };
    }
    case "COLLAPSE_NODE": {
      const nodes = [...state.flatNodes];
      const parentIdx = nodes.findIndex((n) => n.id === action.nodeId);
      if (parentIdx < 0) return state;
      nodes[parentIdx] = { ...nodes[parentIdx], expanded: false };
      const filtered = [
        ...nodes.slice(0, parentIdx + 1),
        ...collapseDescendants(nodes.slice(parentIdx + 1), action.nodeId),
      ];
      return { ...state, flatNodes: filtered };
    }
    case "COLLAPSE_ALL": {
      // Keep only root-level nodes (depth 0), mark them collapsed
      const roots = state.flatNodes
        .filter((n) => n.depth === 0)
        .map((n) => ({ ...n, expanded: false, status: "idle" as const }));
      return { ...state, flatNodes: roots, activeNodeId: null };
    }
    case "EXPAND_TO_DEPTH": {
      // Replace flatNodes with pre-expanded nodes from the backend
      return { ...state, flatNodes: action.nodes };
    }
    case "MARK_NODE": {
      const nodes = state.flatNodes.map((n) =>
        n.id === action.nodeId ? { ...n, status: action.status } : n,
      );
      return { ...state, flatNodes: nodes };
    }
    case "RENAME_NODE": {
      // Replace node id/label and update all descendants whose ids start with oldId
      const oldPrefix = action.oldId + "/";
      const newPrefix = action.newId + "/";
      const nodes = state.flatNodes.map((n) => {
        if (n.id === action.oldId) {
          return { ...n, id: action.newId, label: action.newLabel };
        }
        if (n.id.startsWith(oldPrefix)) {
          const rest = n.id.slice(oldPrefix.length);
          const newId = newPrefix + rest;
          const newParentId = n.parentId?.startsWith(oldPrefix)
            ? newPrefix + n.parentId.slice(oldPrefix.length)
            : n.parentId === action.oldId
              ? action.newId
              : n.parentId;
          return { ...n, id: newId, parentId: newParentId };
        }
        return n;
      });
      const activeNodeId = state.activeNodeId === action.oldId ? action.newId : state.activeNodeId;
      return { ...state, flatNodes: nodes, activeNodeId };
    }
    case "INSERT_NODE": {
      const nodes = [...state.flatNodes];
      const parentIdx = nodes.findIndex((n) => n.id === action.afterParentId);
      if (parentIdx < 0) return { ...state, flatNodes: [...nodes, action.node] };
      // Insert right after the parent
      nodes.splice(parentIdx + 1, 0, action.node);
      return { ...state, flatNodes: nodes };
    }
    case "REMOVE_NODES": {
      const idSet = new Set(action.ids);
      // Remove the nodes themselves and any descendants
      const nodes = state.flatNodes.filter((n) => {
        if (idSet.has(n.id)) return false;
        for (const id of idSet) {
          if (n.id.startsWith(id + "/")) return false;
        }
        return true;
      });
      const activeNodeId =
        state.activeNodeId && idSet.has(state.activeNodeId) ? null : state.activeNodeId;
      return { ...state, flatNodes: nodes, activeNodeId };
    }
    case "REMOVE_WORKSPACE": {
      const ws = state.workspaces.filter((w) => w.id !== action.id);
      const nextActive = ws[0] ?? null;
      return {
        workspaces: ws,
        activeWorkspaceId: nextActive?.id ?? null,
        flatNodes: nextActive?.rootNodes ?? [],
        activeNodeId: null,
      };
    }
    default:
      return state;
  }
}

export function useWorkspace() {
  const [state, dispatch] = useReducer(reducer, {
    workspaces: [],
    activeWorkspaceId: null,
    flatNodes: [],
    activeNodeId: null,
  });

  const expandCache = useRef<Map<string, Promise<FlatNode[]>>>(new Map());

  useEffect(() => {
    window.electron.workspace.getAll().then((all) => {
      dispatch({
        type: "SET_WORKSPACES",
        payload: all.map((w) => ({ id: w.id, label: w.label, rootNodes: w.nodes })),
      });
    });
  }, []);

  const openWorkspace = useCallback(async () => {
    const result = await window.electron.workspace.open();
    if (!result) return;
    dispatch({
      type: "ADD_WORKSPACE",
      id: result.rootPath,
      label: result.label,
      nodes: result.nodes,
    });
  }, []);

  const expandNode = useCallback(async (node: FlatNode) => {
    if (node.type !== "directory" || node.status === "loading") return;
    dispatch({ type: "MARK_NODE", nodeId: node.id, status: "loading" });
    if (!expandCache.current.has(node.id)) {
      expandCache.current.set(node.id, window.electron.workspace.expandNode(node.id, node.depth));
    }
    try {
      const children = await expandCache.current.get(node.id)!;
      dispatch({ type: "SPLICE_CHILDREN", parentId: node.id, children });
    } catch {
      dispatch({ type: "MARK_NODE", nodeId: node.id, status: "error" });
      expandCache.current.delete(node.id);
    }
  }, []);

  const collapseNode = useCallback((nodeId: string) => {
    dispatch({ type: "COLLAPSE_NODE", nodeId });
  }, []);

  const collapseAll = useCallback(() => {
    dispatch({ type: "COLLAPSE_ALL" });
    expandCache.current.clear();
  }, []);

  const expandToDepth = useCallback(async (rootPath: string, maxDepth: number) => {
    const nodes = await window.electron.workspace.expandToDepth(rootPath, maxDepth);
    dispatch({ type: "EXPAND_TO_DEPTH", nodes });
    expandCache.current.clear();
  }, []);

  const revealPath = useCallback(async (rootPath: string, targetPath: string) => {
    const nodes = await window.electron.workspace.revealPath(rootPath, targetPath);
    dispatch({ type: "EXPAND_TO_DEPTH", nodes });
    expandCache.current.clear();
  }, []);

  const setActiveNode = useCallback((nodeId: string | null) => {
    dispatch({ type: "SET_ACTIVE_NODE", nodeId });
  }, []);

  // Refresh: re-read the parent dir and replace its children in the tree
  const refreshDir = useCallback(async (node: FlatNode) => {
    if (node.type !== "directory") return;
    expandCache.current.delete(node.id);
    dispatch({ type: "MARK_NODE", nodeId: node.id, status: "loading" });
    try {
      const children = await window.electron.workspace.refreshDir(node.id, node.depth);
      dispatch({ type: "REPLACE_CHILDREN", parentId: node.id, children });
    } catch {
      dispatch({ type: "MARK_NODE", nodeId: node.id, status: "error" });
    }
  }, []);

  // Refresh all root-level workspaces
  const refreshAll = useCallback(async () => {
    const roots = state.flatNodes.filter((n) => n.depth === 0);
    for (const root of roots) {
      await refreshDir(root);
    }
  }, [state.flatNodes, refreshDir]);

  // Create a file inside the active directory, then refresh that dir
  const createFile = useCallback(
    async (parentDirId: string, name: string) => {
      const filePath = parentDirId + "/" + name;
      await window.electron.fs.createFile(filePath);
      const parentNode = state.flatNodes.find((n) => n.id === parentDirId);
      if (parentNode) await refreshDir(parentNode);
    },
    [state.flatNodes, refreshDir],
  );

  // Create a sub-directory inside the active directory, then refresh
  const createDir = useCallback(
    async (parentDirId: string, name: string) => {
      const dirPath = parentDirId + "/" + name;
      await window.electron.fs.createDir(dirPath);
      const parentNode = state.flatNodes.find((n) => n.id === parentDirId);
      if (parentNode) await refreshDir(parentNode);
    },
    [state.flatNodes, refreshDir],
  );

  // Rename a node (file or dir) in place
  const renameNode = useCallback(async (node: FlatNode, newName: string) => {
    const newId = path.join(path.dirname(node.id), newName);
    await window.electron.fs.rename(node.id, newId);
    dispatch({ type: "RENAME_NODE", oldId: node.id, newId, newLabel: newName });
  }, []);

  const deleteNodes = useCallback(async (ids: string[]) => {
    await window.electron.fs.delete(ids);
    dispatch({ type: "REMOVE_NODES", ids });
  }, []);

  const removeWorkspace = useCallback(async (id: string) => {
    await window.electron.workspace.remove(id);
    dispatch({ type: "REMOVE_WORKSPACE", id });
    for (const key of expandCache.current.keys()) {
      if (key.startsWith(id)) expandCache.current.delete(key);
    }
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  return {
    workspaces: state.workspaces,
    activeWorkspaceId: state.activeWorkspaceId,
    activeNodeId: state.activeNodeId,
    flatNodes: state.flatNodes,
    openWorkspace,
    expandNode,
    collapseNode,
    collapseAll,
    expandToDepth,
    revealPath,
    setActiveNode,
    refreshAll,
    refreshDir,
    createFile,
    createDir,
    renameNode,
    deleteNodes,
    removeWorkspace,
    setActiveWorkspace,
  };
}
