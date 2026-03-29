// ─── Git types (renderer side) ────────────────────────────────────────────────

export type GitChangeStatus = "M" | "A" | "D" | "R" | "U" | "?";

export interface GitFileChange {
  path: string;
  absPath: string;
  status: GitChangeStatus;
  oldPath?: string;
}

export interface GitStatusResult {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: GitFileChange[];
  isGitRepo: boolean;
}

export interface GitBranch {
  name: string;
  current: boolean;
  upstream?: string;
  isRemote: boolean;
}

export interface GitStash {
  index: number;
  message: string;
  date: string;
}

export interface GitWorktree {
  path: string;
  branch: string;
  isMain: boolean;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface GitContributor {
  name: string;
  commits: number;
}

// ─── IPC facade ───────────────────────────────────────────────────────────────

export const gitApi = {
  status: (workspacePath: string): Promise<GitStatusResult> =>
    window.electron.git.status(workspacePath),
  stage: (workspacePath: string, paths: string[]): Promise<void> =>
    window.electron.git.stage(workspacePath, paths),
  unstage: (workspacePath: string, paths: string[]): Promise<void> =>
    window.electron.git.unstage(workspacePath, paths),
  stageAll: (workspacePath: string): Promise<void> => window.electron.git.stageAll(workspacePath),
  unstageAll: (workspacePath: string): Promise<void> =>
    window.electron.git.unstageAll(workspacePath),
  discard: (workspacePath: string, paths: string[]): Promise<void> =>
    window.electron.git.discard(workspacePath, paths),
  discardAll: (workspacePath: string): Promise<void> =>
    window.electron.git.discardAll(workspacePath),
  discardStaged: (workspacePath: string, paths?: string[]): Promise<void> =>
    window.electron.git.discardStaged(workspacePath, paths),
  commit: (workspacePath: string, message: string): Promise<{ hash: string }> =>
    window.electron.git.commit(workspacePath, message),
  diff: (workspacePath: string, filePath: string, cached: boolean): Promise<string> =>
    window.electron.git.diff(workspacePath, filePath, cached),
  branches: (workspacePath: string): Promise<GitBranch[]> =>
    window.electron.git.branches(workspacePath),
  checkout: (workspacePath: string, branch: string): Promise<void> =>
    window.electron.git.checkout(workspacePath, branch),
  stashList: (workspacePath: string): Promise<GitStash[]> =>
    window.electron.git.stashList(workspacePath),
  stashSave: (workspacePath: string, message?: string, staged?: boolean): Promise<void> =>
    window.electron.git.stashSave(workspacePath, message, staged),
  stashPop: (workspacePath: string, index: number): Promise<void> =>
    window.electron.git.stashPop(workspacePath, index),
  stashApply: (workspacePath: string, index: number): Promise<void> =>
    window.electron.git.stashApply(workspacePath, index),
  stashDrop: (workspacePath: string, index: number): Promise<void> =>
    window.electron.git.stashDrop(workspacePath, index),
  showFile: (workspacePath: string, ref: string, filePath: string): Promise<string> =>
    window.electron.git.showFile(workspacePath, ref, filePath),
  stashFiles: (workspacePath: string, index: number): Promise<GitFileChange[]> =>
    window.electron.git.stashFiles(workspacePath, index),
  generateCommitMessage: (workspacePath: string): Promise<{ message: string; agent: string }> =>
    window.electron.git.generateCommitMessage(workspacePath),
  canGenerateCommit: (): Promise<{ available: boolean; agent?: string }> =>
    window.electron.git.canGenerateCommit(),
  worktrees: (workspacePath: string): Promise<GitWorktree[]> =>
    window.electron.git.worktrees(workspacePath),
  commits: (
    workspacePath: string,
    branch: string | undefined,
    offset: number,
    limit: number,
  ): Promise<GitCommit[]> => window.electron.git.commits(workspacePath, branch, offset, limit),
  commitFiles: (workspacePath: string, hash: string): Promise<GitFileChange[]> =>
    window.electron.git.commitFiles(workspacePath, hash),
  stashEdit: (workspacePath: string, index: number): Promise<void> =>
    window.electron.git.stashEdit(workspacePath, index),
  stashRename: (workspacePath: string, index: number, message: string): Promise<void> =>
    window.electron.git.stashRename(workspacePath, index, message),
  contributors: (workspacePath: string): Promise<GitContributor[]> =>
    window.electron.git.contributors(workspacePath),
  init: (workspacePath: string): Promise<void> => window.electron.git.init(workspacePath),
  fetch: (workspacePath: string): Promise<void> => window.electron.git.fetch(workspacePath),
  pull: (workspacePath: string): Promise<void> => window.electron.git.pull(workspacePath),
  push: (workspacePath: string): Promise<void> => (window.electron.git as any).push(workspacePath),
  commitAmend: (workspacePath: string, message?: string): Promise<{ hash: string }> =>
    (window.electron.git as any).commitAmend(workspacePath, message),
};
