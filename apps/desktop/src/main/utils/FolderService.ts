import fs from "fs/promises";
import path from "path";
import type { NodeType, NodeStatus, FsPermissions, FlatNode } from "../../shared/types";

export type { NodeType, NodeStatus, FsPermissions, FlatNode };

export interface ReadDirOptions {
  depth?: number;
  showHidden?: boolean;
  sort?: "name" | "type-first";
}

export class FolderService {
  static async readDir(
    dirPath: string,
    parentId: string | null = null,
    currentDepth: number = 0,
    options: ReadDirOptions = {},
  ): Promise<FlatNode[]> {
    const { depth = 1, showHidden = false, sort = "type-first" } = options;
    const nodes: FlatNode[] = [];

    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err: any) {
      if (err.code === "EACCES" || err.code === "EPERM") {
        return [
          {
            id: dirPath,
            label: path.basename(dirPath),
            depth: currentDepth,
            type: "directory",
            expanded: false,
            status: "error",
            parentId,
            hasChildren: false,
            ext: "",
            permissions: { readable: false, writable: false, executable: false },
          },
        ];
      }
      throw err;
    }

    const filtered = showHidden ? entries : entries.filter((e) => !e.name.startsWith("."));

    const sorted =
      sort === "type-first"
        ? [
            ...filtered.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)),
            ...filtered
              .filter((e) => !e.isDirectory())
              .sort((a, b) => a.name.localeCompare(b.name)),
          ]
        : filtered.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of sorted) {
      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();
      const isSymlink = entry.isSymbolicLink();

      const perms = await FolderService.getPermissions(fullPath);

      const node: FlatNode = {
        id: fullPath,
        label: entry.name,
        depth: currentDepth,
        type: isDir ? "directory" : isSymlink ? "symlink" : "file",
        expanded: false,
        status: "idle",
        parentId,
        hasChildren: isDir,
        ext: isDir ? "" : path.extname(entry.name),
        permissions: perms,
      };

      nodes.push(node);

      if (isDir && perms.readable && currentDepth < depth - 1) {
        const children = await FolderService.readDir(fullPath, fullPath, currentDepth + 1, options);
        node.hasChildren = children.length > 0;
        node.expanded = true;
        node.status = "loaded";
        nodes.push(...children);
      } else if (isDir) {
        node.status = "idle";
        node.hasChildren = await FolderService.hasAnyChildren(fullPath, showHidden);
      }
    }

    return nodes;
  }

  static async hasAnyChildren(dirPath: string, showHidden = false): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);
      const visible = showHidden ? entries : entries.filter((e) => !e.startsWith("."));
      return visible.length > 0;
    } catch {
      return false;
    }
  }

  static async getPermissions(filePath: string): Promise<FsPermissions> {
    const { constants } = fs;
    const check = (mode: number): Promise<boolean> =>
      fs
        .access(filePath, mode)
        .then(() => true)
        .catch(() => false);

    const [readable, writable, executable] = await Promise.all([
      check(constants.R_OK),
      check(constants.W_OK),
      check(constants.X_OK),
    ]);
    return { readable, writable, executable };
  }

  static async expandNode(
    nodeId: string,
    currentDepth: number,
    options: ReadDirOptions = {},
  ): Promise<FlatNode[]> {
    return FolderService.readDir(nodeId, nodeId, currentDepth + 1, { ...options, depth: 1 });
  }

  /**
   * Build the minimal flat-node list needed to reveal `targetPath` inside
   * `rootPath`.  All ancestor directories are read in parallel (one IPC hop)
   * and the result is assembled into correct pre-order order.
   */
  static async revealPath(rootPath: string, targetPath: string): Promise<FlatNode[]> {
    const relative = targetPath.slice(rootPath.length + 1);
    const parts = relative.split("/").filter(Boolean);

    // Collect ancestor dir absolute paths (everything except the file itself)
    const ancestorDirs: string[] = [];
    let cur = rootPath;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur + "/" + parts[i];
      ancestorDirs.push(cur);
    }

    // Read root + every ancestor directory in parallel
    const [rootNodes, ...ancestorChildren] = await Promise.all([
      FolderService.readDir(rootPath, null, 0, { depth: 1, sort: "type-first" }),
      ...ancestorDirs.map((dir, i) =>
        FolderService.readDir(dir, dir, i + 1, { depth: 1, sort: "type-first" }),
      ),
    ]);

    // Assemble into pre-order flat list, inserting and marking each ancestor expanded
    const result = [...rootNodes];
    for (let i = 0; i < ancestorDirs.length; i++) {
      const parentId = ancestorDirs[i];
      const parentIdx = result.findIndex((n) => n.id === parentId);
      if (parentIdx >= 0) {
        result[parentIdx] = { ...result[parentIdx], expanded: true, status: "loaded" };
        result.splice(parentIdx + 1, 0, ...ancestorChildren[i]);
      }
    }

    return result;
  }
}
