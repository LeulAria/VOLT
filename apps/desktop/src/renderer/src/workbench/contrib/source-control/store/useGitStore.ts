import { create } from "zustand";
import type {
  GitStatusResult,
  GitBranch,
  GitStash,
  GitFileChange,
  GitWorktree,
  GitCommit,
  GitContributor,
} from "../types";

export type ViewMode = "flat" | "tree";

interface GitStore {
  // Per-workspace caches
  statusByPath: Record<string, GitStatusResult>;
  branchesByPath: Record<string, GitBranch[]>;
  stashesByPath: Record<string, GitStash[]>;
  stashFilesCache: Record<string, GitFileChange[]>;
  worktreesByPath: Record<string, GitWorktree[]>;
  commitsByPath: Record<string, GitCommit[]>;
  commitFilesCacheByHash: Record<string, GitFileChange[]>;
  contributorsByPath: Record<string, GitContributor[]>;

  // UI state
  viewMode: ViewMode;
  expandedSections: Set<string>;

  // Actions
  setStatus(workspacePath: string, status: GitStatusResult): void;
  setBranches(workspacePath: string, branches: GitBranch[]): void;
  setStashes(workspacePath: string, stashes: GitStash[]): void;
  setStashFiles(key: string, files: GitFileChange[]): void;
  setWorktrees(workspacePath: string, worktrees: GitWorktree[]): void;
  setCommits(workspacePath: string, commits: GitCommit[]): void;
  appendCommits(workspacePath: string, commits: GitCommit[]): void;
  setCommitFiles(hash: string, files: GitFileChange[]): void;
  setContributors(workspacePath: string, contributors: GitContributor[]): void;
  setViewMode(mode: ViewMode): void;
  toggleSection(id: string): void;
  isSectionExpanded(id: string): boolean;
}

export const useGitStore = create<GitStore>((set, get) => ({
  statusByPath: {},
  branchesByPath: {},
  stashesByPath: {},
  stashFilesCache: {},
  worktreesByPath: {},
  commitsByPath: {},
  commitFilesCacheByHash: {},
  contributorsByPath: {},
  viewMode: "flat",
  // These IDs must match what buildGitTree produces
  expandedSections: new Set(["scm:changes", "scm:changes:staged", "scm:changes:unstaged"]),

  setStatus(workspacePath, status) {
    set((s) => ({ statusByPath: { ...s.statusByPath, [workspacePath]: status } }));
  },
  setBranches(workspacePath, branches) {
    set((s) => ({ branchesByPath: { ...s.branchesByPath, [workspacePath]: branches } }));
  },
  setStashes(workspacePath, stashes) {
    set((s) => ({ stashesByPath: { ...s.stashesByPath, [workspacePath]: stashes } }));
  },
  setStashFiles(key, files) {
    set((s) => ({ stashFilesCache: { ...s.stashFilesCache, [key]: files } }));
  },
  setWorktrees(workspacePath, worktrees) {
    set((s) => ({ worktreesByPath: { ...s.worktreesByPath, [workspacePath]: worktrees } }));
  },
  setCommits(workspacePath, commits) {
    set((s) => ({ commitsByPath: { ...s.commitsByPath, [workspacePath]: commits } }));
  },
  appendCommits(workspacePath, commits) {
    set((s) => {
      const existing = s.commitsByPath[workspacePath] ?? [];
      return { commitsByPath: { ...s.commitsByPath, [workspacePath]: [...existing, ...commits] } };
    });
  },
  setCommitFiles(hash, files) {
    set((s) => ({ commitFilesCacheByHash: { ...s.commitFilesCacheByHash, [hash]: files } }));
  },
  setContributors(workspacePath, contributors) {
    set((s) => ({
      contributorsByPath: { ...s.contributorsByPath, [workspacePath]: contributors },
    }));
  },
  setViewMode(mode) {
    set({ viewMode: mode });
  },
  toggleSection(id) {
    set((s) => {
      const next = new Set(s.expandedSections);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedSections: next };
    });
  },
  isSectionExpanded(id) {
    return get().expandedSections.has(id);
  },
}));
