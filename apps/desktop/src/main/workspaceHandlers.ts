import { app, dialog, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import Store from "electron-store";
import { FolderService } from "./utils/FolderService";
import type { FlatNode } from "./utils/FolderService";

interface WorkspaceRecord {
  id: string;
  label: string;
  addedAt: number;
}

// Suppress missing type declaration — electron-store v11 ships its own types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new (Store as any)({
  defaults: { workspaces: [] },
  name: "workspaces",
});

export function registerWorkspaceHandlers(): void {
  ipcMain.handle(
    "workspace:open",
    async (): Promise<{ rootPath: string; label: string; nodes: FlatNode[] } | null> => {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        title: "Add workspace folder",
      });

      if (result.canceled || !result.filePaths[0]) return null;

      const rootPath = result.filePaths[0];
      const label = path.basename(rootPath);

      const nodes = await FolderService.readDir(rootPath, null, 0, {
        depth: 1,
        sort: "type-first",
      });

      const existing: WorkspaceRecord[] = store.get("workspaces");
      if (!existing.find((w) => w.id === rootPath)) {
        store.set("workspaces", [...existing, { id: rootPath, label, addedAt: Date.now() }]);
      }

      return { rootPath, label, nodes };
    },
  );

  ipcMain.handle(
    "workspace:expand-node",
    async (_, nodeId: string, depth: number): Promise<FlatNode[]> => {
      return FolderService.expandNode(nodeId, depth);
    },
  );

  ipcMain.handle(
    "workspace:get-all",
    async (): Promise<Array<{ id: string; label: string; nodes: FlatNode[] }>> => {
      const workspaces: WorkspaceRecord[] = store.get("workspaces");
      const results = await Promise.allSettled(
        workspaces.map(async (w) => ({
          id: w.id,
          label: w.label,
          nodes: await FolderService.readDir(w.id, null, 0, { depth: 1 }),
        })),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<{ id: string; label: string; nodes: FlatNode[] }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);
    },
  );

  ipcMain.handle("workspace:remove", async (_, rootPath: string): Promise<boolean> => {
    const existing: WorkspaceRecord[] = store.get("workspaces");
    store.set(
      "workspaces",
      existing.filter((w) => w.id !== rootPath),
    );
    return true;
  });

  // Expand a workspace root to a given depth (e.g. 2 levels)
  ipcMain.handle(
    "workspace:expand-to-depth",
    async (_, rootPath: string, maxDepth: number): Promise<FlatNode[]> => {
      return FolderService.readDir(rootPath, null, 0, { depth: maxDepth, sort: "type-first" });
    },
  );

  // Reveal a file path: return the minimal pre-order flat node list with ancestor dirs expanded
  ipcMain.handle(
    "workspace:reveal-path",
    async (_, rootPath: string, targetPath: string): Promise<FlatNode[]> => {
      return FolderService.revealPath(rootPath, targetPath);
    },
  );

  // Re-read a single directory and return fresh FlatNode children
  ipcMain.handle(
    "workspace:refresh-dir",
    async (_, dirPath: string, depth: number): Promise<FlatNode[]> => {
      return FolderService.readDir(dirPath, dirPath, depth, { depth: 1 });
    },
  );

  // Create an empty file at the given absolute path
  ipcMain.handle("fs:create-file", async (_, filePath: string): Promise<void> => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "", { flag: "wx" }); // wx = fail if exists
  });

  // Create a directory at the given absolute path
  ipcMain.handle("fs:create-dir", async (_, dirPath: string): Promise<void> => {
    await fs.mkdir(dirPath, { recursive: true });
  });

  // Rename / move a filesystem entry
  ipcMain.handle("fs:rename", async (_, oldPath: string, newPath: string): Promise<void> => {
    await fs.rename(oldPath, newPath);
  });

  // Delete files or directories (recursive for dirs)
  ipcMain.handle("fs:delete", async (_, paths: string[]): Promise<void> => {
    await Promise.all(paths.map((p) => fs.rm(p, { recursive: true, force: true })));
  });

  // Suppress unused import warning — app is used implicitly by electron-store path resolution
  void app;
}
