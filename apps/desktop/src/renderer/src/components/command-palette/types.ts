export interface PaletteFile {
  id: string;          // absolute path — unique key
  project: string;     // workspace label (folder name)
  projectRoot: string; // absolute workspace root — used for git ops
  rel: string;         // path relative to project root
  basename: string;    // filename only
  ext: string;         // ".ts", ".tsx", etc.
}

export type PaletteViewMode = "list" | "tree";

export interface VItem {
  key: string;
  type: "file" | "group" | "folder";
  file?: PaletteFile;
  groupLabel?: string;
  /** Tree-mode: unique folder identifier "projectRoot::rel/path" */
  folderKey?: string;
  /** Display name */
  folderName?: string;
  /** Visual indent level (tree mode only) */
  depth?: number;
}
