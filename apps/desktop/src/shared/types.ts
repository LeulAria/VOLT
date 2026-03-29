export type NodeType = "file" | "directory" | "symlink" | "unknown";
export type NodeStatus = "idle" | "loading" | "loaded" | "error";

export interface FsPermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export interface FlatNode {
  id: string;
  label: string;
  depth: number;
  type: NodeType;
  expanded: boolean;
  status: NodeStatus;
  parentId: string | null;
  hasChildren: boolean;
  ext: string;
  permissions: FsPermissions;
}
