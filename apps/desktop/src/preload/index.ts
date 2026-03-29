import { contextBridge, ipcRenderer } from "electron";
import type { FlatNode } from "../shared/types";

const electronAPI = {
  ipcRenderer,
  pty: {
    create: (opts: { cwd?: string; command?: string }): Promise<string> =>
      ipcRenderer.invoke("pty:create", opts),
    write: (id: string, data: string): void => ipcRenderer.send("pty:write", { id, data }),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send("pty:resize", { id, cols, rows }),
    kill: (id: string): Promise<void> => ipcRenderer.invoke("pty:kill", { id }),
    onData: (cb: (payload: { id: string; data: string }) => void) => {
      const handler = (_: unknown, payload: { id: string; data: string }) => cb(payload);
      ipcRenderer.on("pty:data", handler as any);
      return () => ipcRenderer.off("pty:data", handler as any);
    },
    onExit: (cb: (payload: { id: string; exitCode: number }) => void) => {
      const handler = (_: unknown, payload: { id: string; exitCode: number }) => cb(payload);
      ipcRenderer.on("pty:exit", handler as any);
      return () => ipcRenderer.off("pty:exit", handler as any);
    },
  },
  workspace: {
    open: (): Promise<{ rootPath: string; label: string; nodes: FlatNode[] } | null> =>
      ipcRenderer.invoke("workspace:open"),
    expandNode: (nodeId: string, depth: number): Promise<FlatNode[]> =>
      ipcRenderer.invoke("workspace:expand-node", nodeId, depth),
    getAll: (): Promise<Array<{ id: string; label: string; nodes: FlatNode[] }>> =>
      ipcRenderer.invoke("workspace:get-all"),
    remove: (rootPath: string): Promise<boolean> =>
      ipcRenderer.invoke("workspace:remove", rootPath),
    refreshDir: (dirPath: string, depth: number): Promise<FlatNode[]> =>
      ipcRenderer.invoke("workspace:refresh-dir", dirPath, depth),
    expandToDepth: (rootPath: string, maxDepth: number): Promise<FlatNode[]> =>
      ipcRenderer.invoke("workspace:expand-to-depth", rootPath, maxDepth),
    revealPath: (rootPath: string, targetPath: string): Promise<FlatNode[]> =>
      ipcRenderer.invoke("workspace:reveal-path", rootPath, targetPath),
  },
  fs: {
    createFile: (filePath: string): Promise<void> => ipcRenderer.invoke("fs:create-file", filePath),
    createDir: (dirPath: string): Promise<void> => ipcRenderer.invoke("fs:create-dir", dirPath),
    rename: (oldPath: string, newPath: string): Promise<void> =>
      ipcRenderer.invoke("fs:rename", oldPath, newPath),
    delete: (paths: string[]): Promise<void> => ipcRenderer.invoke("fs:delete", paths),
    readFile: (filePath: string): Promise<string> => ipcRenderer.invoke("fs:read-file", filePath),
    writeFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke("fs:write-file", { filePath, content }),
    stat: (filePath: string): Promise<{ size: number; mtimeMs: number }> =>
      ipcRenderer.invoke("fs:stat", filePath),
    readBinary: (filePath: string): Promise<string> =>
      ipcRenderer.invoke("fs:read-binary", filePath),
  },
  browser: {
    saveState: (
      sessions: Array<{ id: string; partition: string; url: string; title: string }>,
    ): Promise<void> => ipcRenderer.invoke("browser:save-state", sessions),
    getSaved: (): Promise<Array<{ id: string; partition: string; url: string; title: string }>> =>
      ipcRenderer.invoke("browser:get-saved"),
    clearSession: (partition: string): Promise<void> =>
      ipcRenderer.invoke("browser:clear-session", { partition }),
    openDevTools: (
      targetId: number,
      devtoolsId: number,
      tileId: string,
    ): Promise<{ ok: boolean; error?: string; url?: string }> =>
      ipcRenderer.invoke("browser:open-devtools", { targetId, devtoolsId, tileId }),
    closeDevTools: (targetId: number, tileId: string): Promise<void> =>
      ipcRenderer.invoke("browser:close-devtools", { targetId, tileId }),
    inspectElement: (
      targetId: number,
      devtoolsId: number,
      tileId: string,
      x?: number,
      y?: number,
    ): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("browser:inspect-element", { targetId, devtoolsId, tileId, x, y }),
    toggleSidePanel: (targetId: number, tileId: string, open: boolean): Promise<void> =>
      ipcRenderer.invoke("browser:toggle-side-panel", { targetId, tileId, open }),
    getResponseBody: (
      targetId: number,
      tileId: string,
      requestId: string,
    ): Promise<{ body: string; base64Encoded: boolean }> =>
      ipcRenderer.invoke("browser:cdp-get-response-body", { targetId, tileId, requestId }),
    onCdpConsole: (cb: (tileId: string, params: any) => void) => {
      const handler = (_: any, tileId: string, params: any) => cb(tileId, params);
      ipcRenderer.on("cdp-console", handler);
      return () => ipcRenderer.off("cdp-console", handler);
    },
    onCdpNetwork: (cb: (tileId: string, method: string, params: any) => void) => {
      const handler = (_: any, tileId: string, method: string, params: any) =>
        cb(tileId, method, params);
      ipcRenderer.on("cdp-network", handler);
      return () => ipcRenderer.off("cdp-network", handler);
    },
  },
  image: {
    load: (
      filePath: string,
    ): Promise<{
      type: "url" | "base64";
      url: string;
      width?: number;
      height?: number;
      ext: string;
    }> => ipcRenderer.invoke("image:load", filePath),
    meta: (filePath: string): Promise<{ width: number; height: number; format: string; space: string; channels: number; depth: string; density: number; hasAlpha: boolean }> =>
      ipcRenderer.invoke("image:meta", filePath),
  },
  shell: {
    showItem: (filePath: string): Promise<void> => ipcRenderer.invoke("shell:show-item", filePath),
  },
  scripts: {
    run: (content: string): Promise<string> => ipcRenderer.invoke("script:run", { content }),
  },
  voice: {
    toggle: (): Promise<void> => ipcRenderer.invoke("voice:toggle"),
    clipboardWrite: (text: string): Promise<void> =>
      ipcRenderer.invoke("voice:clipboard-write", text),
    transcribe: (
      audioData: Float32Array,
      sampleRate: number,
    ): Promise<{ ok: boolean; text: string; error?: string }> => {
      // Slice to only the valid range — audioData may be a view with non-zero byteOffset
      const slice = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength,
      );
      return ipcRenderer.invoke("voice:transcribe", Buffer.from(slice), sampleRate);
    },
    onWindowClosed: (cb: () => void): (() => void) => {
      const handler = () => cb();
      ipcRenderer.on("voice:window-closed", handler);
      return () => ipcRenderer.off("voice:window-closed", handler);
    },
  },
  git: {
    status: (workspacePath: string) => ipcRenderer.invoke("git:status", workspacePath),
    stage: (workspacePath: string, paths: string[]) =>
      ipcRenderer.invoke("git:stage", { workspacePath, paths }),
    unstage: (workspacePath: string, paths: string[]) =>
      ipcRenderer.invoke("git:unstage", { workspacePath, paths }),
    stageAll: (workspacePath: string) => ipcRenderer.invoke("git:stage-all", workspacePath),
    unstageAll: (workspacePath: string) => ipcRenderer.invoke("git:unstage-all", workspacePath),
    discard: (workspacePath: string, paths: string[]) =>
      ipcRenderer.invoke("git:discard", { workspacePath, paths }),
    discardAll: (workspacePath: string) => ipcRenderer.invoke("git:discard-all", workspacePath),
    discardStaged: (workspacePath: string, paths?: string[]) =>
      ipcRenderer.invoke("git:discard-staged", { workspacePath, paths }),
    commit: (workspacePath: string, message: string) =>
      ipcRenderer.invoke("git:commit", { workspacePath, message }),
    diff: (workspacePath: string, filePath: string, cached: boolean) =>
      ipcRenderer.invoke("git:diff", { workspacePath, filePath, cached }),
    branches: (workspacePath: string) => ipcRenderer.invoke("git:branches", workspacePath),
    checkout: (workspacePath: string, branch: string) =>
      ipcRenderer.invoke("git:checkout", { workspacePath, branch }),
    createBranch: (workspacePath: string, name: string, startPoint?: string) =>
      ipcRenderer.invoke("git:create-branch", { workspacePath, name, startPoint }),
    stashList: (workspacePath: string) => ipcRenderer.invoke("git:stash-list", workspacePath),
    stashSave: (workspacePath: string, message?: string, staged?: boolean) =>
      ipcRenderer.invoke("git:stash-save", { workspacePath, message, staged }),
    stashPop: (workspacePath: string, index: number) =>
      ipcRenderer.invoke("git:stash-pop", { workspacePath, index }),
    stashApply: (workspacePath: string, index: number) =>
      ipcRenderer.invoke("git:stash-apply", { workspacePath, index }),
    stashDrop: (workspacePath: string, index: number) =>
      ipcRenderer.invoke("git:stash-drop", { workspacePath, index }),
    showFile: (workspacePath: string, ref: string, filePath: string) =>
      ipcRenderer.invoke("git:show-file", { workspacePath, ref, filePath }),
    stashFiles: (workspacePath: string, index: number) =>
      ipcRenderer.invoke("git:stash-files", { workspacePath, index }),
    generateCommitMessage: (workspacePath: string) =>
      ipcRenderer.invoke("git:generate-commit-message", workspacePath),
    canGenerateCommit: () => ipcRenderer.invoke("git:can-generate-commit"),
    worktrees: (workspacePath: string) => ipcRenderer.invoke("git:worktrees", workspacePath),
    commits: (workspacePath: string, branch: string | undefined, offset: number, limit: number) =>
      ipcRenderer.invoke("git:commits", { workspacePath, branch, offset, limit }),
    commitFiles: (workspacePath: string, hash: string) =>
      ipcRenderer.invoke("git:commit-files", { workspacePath, hash }),
    stashEdit: (workspacePath: string, index: number) =>
      ipcRenderer.invoke("git:stash-edit", { workspacePath, index }),
    stashRename: (workspacePath: string, index: number, message: string) =>
      ipcRenderer.invoke("git:stash-rename", { workspacePath, index, message }),
    contributors: (workspacePath: string) => ipcRenderer.invoke("git:contributors", workspacePath),
    init: (workspacePath: string) => ipcRenderer.invoke("git:init", workspacePath),
    fetch: (workspacePath: string) => ipcRenderer.invoke("git:fetch", workspacePath),
    pull: (workspacePath: string) => ipcRenderer.invoke("git:pull", workspacePath),
    push: (workspacePath: string) => ipcRenderer.invoke("git:push", workspacePath),
    commitAmend: (workspacePath: string, message?: string) =>
      ipcRenderer.invoke("git:commit-amend", { workspacePath, message }),
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", {});
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = {};
}
