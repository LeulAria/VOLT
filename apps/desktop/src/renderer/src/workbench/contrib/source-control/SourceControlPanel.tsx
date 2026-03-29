import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/ui/Tooltip";
import UnifiedTree from "../../../components/tree/UnifiedTree";
import type { UnifiedTreeNode } from "../../../components/tree/types";
import { buildGitTree } from "./buildGitTree";
import { CommitBox } from "./CommitBox";
import { useGitStore } from "./store/useGitStore";
import { useGitStatus } from "./hooks/useGitStatus";
import { gitApi } from "./types";
import { useTabStore } from "../canvas/store/useTabStore";
import type {
  GitFileChange,
  GitStash,
  GitBranch,
  GitCommit,
  GitWorktree,
  GitContributor,
} from "./types";
import type { ViewMode } from "./store/useGitStore";

// Stable empty fallbacks so Zustand selectors don't return new [] each render
const NO_STASHES: GitStash[] = [];
const NO_BRANCHES: GitBranch[] = [];
const NO_COMMITS: GitCommit[] = [];
const NO_WORKTREES: GitWorktree[] = [];
const NO_CONTRIBUTORS: GitContributor[] = [];

const COMMIT_PAGE = 10;

interface SourceControlPanelProps {
  workspacePath: string | null;
}

export function SourceControlPanel({ workspacePath }: SourceControlPanelProps) {
  const { t } = useTranslation();
  const { refresh } = useGitStatus(workspacePath);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const status = useGitStore((s) =>
    workspacePath ? (s.statusByPath[workspacePath] ?? null) : null,
  );
  const stashes = useGitStore(
    (s) => (workspacePath ? s.stashesByPath[workspacePath] : undefined) ?? NO_STASHES,
  );
  const branches = useGitStore(
    (s) => (workspacePath ? s.branchesByPath[workspacePath] : undefined) ?? NO_BRANCHES,
  );
  const commits = useGitStore(
    (s) => (workspacePath ? s.commitsByPath[workspacePath] : undefined) ?? NO_COMMITS,
  );
  const worktrees = useGitStore(
    (s) => (workspacePath ? s.worktreesByPath[workspacePath] : undefined) ?? NO_WORKTREES,
  );
  const contributors = useGitStore(
    (s) => (workspacePath ? s.contributorsByPath[workspacePath] : undefined) ?? NO_CONTRIBUTORS,
  );
  const commitFilesCache = useGitStore((s) => s.commitFilesCacheByHash);
  const expandedSections = useGitStore((s) => s.expandedSections);
  const toggleSection = useGitStore((s) => s.toggleSection);
  const viewMode = useGitStore((s) => s.viewMode);
  const setViewMode = useGitStore((s) => s.setViewMode);
  const stashFilesCache = useGitStore((s) => s.stashFilesCache);
  const setStashFiles = useGitStore((s) => s.setStashFiles);
  const setCommits = useGitStore((s) => s.setCommits);
  const appendCommits = useGitStore((s) => s.appendCommits);
  const setCommitFiles = useGitStore((s) => s.setCommitFiles);
  const setContributors = useGitStore((s) => s.setContributors);

  // Inline stash rename state
  const [renamingStashIndex, setRenamingStashIndex] = useState<number | null>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  const openDiffTab = useTabStore((s) => s.openDiffTab);

  // ── Fetch commits/branches/worktrees on workspace change ──────────────────

  useEffect(() => {
    if (!workspacePath) return;
    const ws = workspacePath;
    // Guard: new IPC methods may not exist in old preload sessions; catch silently
    try {
      gitApi
        .commits(ws, undefined, 0, COMMIT_PAGE)
        .then((c) => setCommits(ws, c))
        .catch(() => {});
    } catch {
      /* */
    }
    try {
      gitApi
        .branches(ws)
        .then((b) => useGitStore.getState().setBranches(ws, b))
        .catch(() => {});
    } catch {
      /* */
    }
    try {
      gitApi
        .worktrees(ws)
        .then((w) => useGitStore.getState().setWorktrees(ws, w))
        .catch(() => {});
    } catch {
      /* */
    }
    try {
      gitApi
        .contributors(ws)
        .then((c) => setContributors(ws, c))
        .catch(() => {});
    } catch {
      /* */
    }
  }, [workspacePath, setCommits, setContributors]);

  useEffect(() => {
    if (!branchMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [branchMenuOpen]);

  // ── Git action callbacks ───────────────────────────────────────────────────

  const onOpenDiff = useCallback(
    (file: GitFileChange, staged: boolean) => {
      if (!workspacePath) return;
      // Open traditional diff tab
      openDiffTab({
        workspacePath,
        filePath: file.path,
        cached: staged,
        statusChar: (file.status === "?" ? "A" : file.status) as "A" | "M" | "D" | "R" | "U",
      });
    },
    [workspacePath, openDiffTab],
  );

  const onStage = useCallback(
    async (file: GitFileChange) => {
      if (!workspacePath) return;
      await gitApi.stage(workspacePath, [file.path]);
      refresh();
    },
    [workspacePath, refresh],
  );
  const onUnstage = useCallback(
    async (file: GitFileChange) => {
      if (!workspacePath) return;
      await gitApi.unstage(workspacePath, [file.path]);
      refresh();
    },
    [workspacePath, refresh],
  );
  const onDiscard = useCallback(
    async (file: GitFileChange) => {
      if (!workspacePath) return;
      await gitApi.discard(workspacePath, [file.path]);
      refresh();
    },
    [workspacePath, refresh],
  );

  const onStageAll = useCallback(async () => {
    if (!workspacePath) return;
    await gitApi.stageAll(workspacePath);
    refresh();
  }, [workspacePath, refresh]);
  const onUnstageAll = useCallback(async () => {
    if (!workspacePath) return;
    await gitApi.unstageAll(workspacePath);
    refresh();
  }, [workspacePath, refresh]);
  const onDiscardAll = useCallback(async () => {
    if (!workspacePath) return;
    await gitApi.discardAll(workspacePath);
    refresh();
  }, [workspacePath, refresh]);

  const onDiscardStagedFile = useCallback(
    async (file: GitFileChange) => {
      if (!workspacePath) return;
      await gitApi.discardStaged(workspacePath, [file.path]);
      refresh();
    },
    [workspacePath, refresh],
  );

  const onDiscardAllStaged = useCallback(async () => {
    if (!workspacePath) return;
    await gitApi.discardStaged(workspacePath);
    refresh();
  }, [workspacePath, refresh]);

  const onStashStaged = useCallback(async () => {
    if (!workspacePath) return;
    try {
      await gitApi.stashSave(workspacePath, undefined, true);
    } catch (e) {
      console.error("[stash-staged]", e);
    } finally {
      refresh();
    }
  }, [workspacePath, refresh]);

  const onStashApply = useCallback(
    async (index: number) => {
      if (!workspacePath) return;
      try {
        await gitApi.stashApply(workspacePath, index);
      } catch (e) {
        console.error("[stash-apply]", e);
      } finally {
        refresh();
      }
    },
    [workspacePath, refresh],
  );

  const onStashPop = useCallback(
    async (index: number) => {
      if (!workspacePath) return;
      try {
        await gitApi.stashPop(workspacePath, index);
      } catch (e) {
        console.error("[stash-pop]", e);
      } finally {
        refresh();
      }
    },
    [workspacePath, refresh],
  );

  const onStashDrop = useCallback(
    async (index: number) => {
      if (!workspacePath) return;
      try {
        await gitApi.stashDrop(workspacePath, index);
      } catch (e) {
        console.error("[stash-drop]", e);
      } finally {
        refresh();
      }
    },
    [workspacePath, refresh],
  );

  const onStashEdit = useCallback(
    async (index: number) => {
      if (!workspacePath) return;
      try {
        await gitApi.stashEdit(workspacePath, index);
      } catch {
        return;
      }
      refresh();
    },
    [workspacePath, refresh],
  );

  const onStartStashRename = useCallback((index: number) => {
    setRenamingStashIndex(index);
  }, []);
  const onCancelStashRename = useCallback(() => {
    setRenamingStashIndex(null);
  }, []);
  const onStashRename = useCallback(
    async (index: number, message: string) => {
      setRenamingStashIndex(null);
      if (!workspacePath) return;
      try {
        await gitApi.stashRename(workspacePath, index, message);
      } catch {
        /* */
      }
      refresh();
    },
    [workspacePath, refresh],
  );

  const onBranchCheckout = useCallback(
    async (name: string) => {
      if (!workspacePath || name === (status?.branch ?? null)) return;
      setCheckingOut(true);
      setCheckoutError(null);
      setBranchMenuOpen(false);
      try {
        await gitApi.checkout(workspacePath, name);
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : "Checkout failed");
        setCheckingOut(false);
        return;
      }
      refresh();
      try {
        gitApi
          .branches(workspacePath)
          .then((b) => useGitStore.getState().setBranches(workspacePath, b))
          .catch(() => {});
      } catch {
        /* */
      }
      setCheckingOut(false);
    },
    [workspacePath, status, refresh],
  );

  const onSync = useCallback(async () => {
    if (!workspacePath) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await gitApi.fetch(workspacePath);
      await gitApi.pull(workspacePath);
      refresh();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [workspacePath, refresh]);

  const onLoadMoreCommits = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const more = await gitApi.commits(workspacePath, undefined, commits.length, COMMIT_PAGE);
      appendCommits(workspacePath, more);
    } catch {
      /* */
    }
  }, [workspacePath, commits.length, appendCommits]);

  const onCopyCommitHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
  }, []);

  const onOpenCommitDiff = useCallback(
    (file: GitFileChange, _hash: string) => {
      if (!workspacePath) return;
      // Open diff tab
      openDiffTab({
        workspacePath,
        filePath: file.path,
        cached: false,
        statusChar: (file.status === "?" ? "A" : file.status) as "A" | "M" | "D" | "R" | "U",
      });

    },
    [workspacePath, openDiffTab],
  );

  // ── Build tree nodes ───────────────────────────────────────────────────────

  const nodes = useMemo<UnifiedTreeNode[]>(() => {
    if (!workspacePath || !status) return [];
    return buildGitTree(status, stashes, branches, {
      workspacePath,
      onOpenDiff,
      onStage,
      onUnstage,
      onDiscard,
      onDiscardStagedFile,
      onStageAll,
      onUnstageAll,
      onDiscardAll,
      onDiscardAllStaged,
      onStashStaged,
      onStashApply,
      onStashPop,
      onStashDrop,
      onStashEdit,
      onBranchCheckout,
      expandedSections,
      onToggleSection: toggleSection,
      viewMode,
      stashFilesCache,
      commits,
      commitFilesCache,
      onLoadMoreCommits,
      onCopyCommitHash,
      onOpenCommitDiff,
      worktrees,
      contributors,
      renamingStashIndex,
      onStartStashRename,
      onCancelStashRename,
      onStashRename,
    });
  }, [
    workspacePath,
    status,
    stashes,
    branches,
    expandedSections,
    toggleSection,
    onOpenDiff,
    onStage,
    onUnstage,
    onDiscard,
    onDiscardStagedFile,
    onStageAll,
    onUnstageAll,
    onDiscardAll,
    onDiscardAllStaged,
    onStashStaged,
    onStashApply,
    onStashPop,
    onStashDrop,
    onStashEdit,
    onBranchCheckout,
    viewMode,
    stashFilesCache,
    commits,
    commitFilesCache,
    onLoadMoreCommits,
    onCopyCommitHash,
    onOpenCommitDiff,
    worktrees,
    contributors,
    renamingStashIndex,
    onStartStashRename,
    onCancelStashRename,
    onStashRename,
  ]);

  // ── Callbacks for UnifiedTree ──────────────────────────────────────────────

  const handleToggle = useCallback(
    (node: UnifiedTreeNode) => {
      if (
        node.kind === "item" &&
        node.id.startsWith("scm:stashes:") &&
        node.id.split(":").length === 3
      ) {
        const stashIndex = parseInt(node.id.split(":")[2]!, 10);
        if (workspacePath) {
          const key = `${workspacePath}:${stashIndex}`;
          if (!stashFilesCache[key]) {
            try {
              gitApi
                .stashFiles(workspacePath, stashIndex)
                .then((files) => setStashFiles(key, files))
                .catch(() => {});
            } catch {
              /* */
            }
          }
        }
      }
      if (
        node.kind === "item" &&
        node.id.startsWith("scm:commits:") &&
        node.id.split(":").length === 3
      ) {
        const hash = node.id.split(":")[2]!;
        if (workspacePath && !commitFilesCache[hash]) {
          try {
            gitApi
              .commitFiles(workspacePath, hash)
              .then((files) => setCommitFiles(hash, files))
              .catch(() => {});
          } catch {
            /* */
          }
        }
      }
      toggleSection(node.id);
    },
    [
      toggleSection,
      workspacePath,
      stashFilesCache,
      setStashFiles,
      commitFilesCache,
      setCommitFiles,
    ],
  );

  const handleActivate = useCallback(
    (
      node: UnifiedTreeNode,
      _modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
    ) => {
      if ((node.data as any)?.isLoadMore) {
        onLoadMoreCommits();
        return;
      }
      if (node.kind === "item" && node.data && (node.data as any).file) {
        const { file, staged } = node.data as { file: GitFileChange; staged: boolean };
        onOpenDiff(file, staged);
      } else if (
        node.kind === "item" &&
        node.id.startsWith("scm:branches:") &&
        !(node.data as any)?.current
      ) {
        // Clicking a non-current branch → checkout it
        const branch = node.data as GitBranch;
        if (branch?.name) onBranchCheckout(branch.name);
      }
      // Note: expand/collapse for nodes with hasChildren is already handled by
      // onToggle (called first in UnifiedTreeRow.handleClick). Don't toggleSection
      // here or the two calls would cancel each other out.
    },
    [onOpenDiff, onBranchCheckout, onLoadMoreCommits],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!workspacePath) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-white/30">
        {t("git.noWorkspace")}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-white/30">
        {t("git.loading")}
      </div>
    );
  }

  if (!status.isGitRepo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span
          className="text-xs text-white/25"
          style={{ fontFamily: "Geist, system-ui, -apple-system, sans-serif" }}
        >
          {t("git.noGitRepo")}
        </span>
        <button
          className="text-xs text-white/50 transition-colors hover:text-white/75"
          style={{
            fontFamily: "Geist, system-ui, -apple-system, sans-serif",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "9999px",
            padding: "5px 18px",
            cursor: "pointer",
          }}
          onClick={async () => {
            if (!workspacePath) return;
            try {
              await gitApi.init(workspacePath);
            } catch {
              /* */
            }
            refresh();
          }}
        >
          {t("git.initRepository")}
        </button>
      </div>
    );
  }

  const currentBranch = status.branch ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Branch header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-1.5">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-white/60"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="8" r="3" />
            <line x1="6" y1="9" x2="6" y2="15" />
            <path d="M18 11c0 6-12 3-12 9" />
          </svg>
          <div ref={branchMenuRef} className="relative min-w-0 flex-1">
            <button
              className="flex w-full min-w-0 items-center gap-1 overflow-hidden bg-transparent font-mono text-[11px] text-white/60 outline-none [-webkit-app-region:no-drag] hover:text-white/85 disabled:opacity-50"
              onClick={() => setBranchMenuOpen((v) => !v)}
              disabled={checkingOut}
              title={currentBranch ?? ""}
            >
              {checkingOut ? (
                <span className="inline-block h-2 w-2 shrink-0 animate-spin rounded-full border border-current border-t-transparent" />
              ) : null}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{currentBranch ?? "—"}</span>
              <svg className="ml-0.5 shrink-0 text-white/30" width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {branchMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 180,
                  maxHeight: 220,
                  overflowY: "auto",
                  background: "#1c1c1f",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  zIndex: 1000,
                  padding: 4,
                }}
              >
                {branches.filter((b) => !b.isRemote).map((b) => (
                  <button
                    key={b.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      textAlign: "left",
                      padding: "5px 10px",
                      background: b.current ? "rgba(255,255,255,0.07)" : "none",
                      border: "none",
                      borderRadius: 5,
                      color: b.current ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { if (!b.current) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { if (!b.current) e.currentTarget.style.background = "none"; }}
                    onClick={() => onBranchCheckout(b.name)}
                  >
                    {b.current ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : <span style={{ width: 9 }} />}
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {/* View mode toggle — single icon button, cycles tree ↔ list */}
          <Tooltip
            content={viewMode === "tree" ? t("git.listView") : t("git.treeView")}
            position="bottom"
          >
            <button
              className={`flex items-center justify-center rounded border-none bg-transparent p-1 transition-colors ${viewMode === "tree" ? "text-white/75 bg-white/[0.08] hover:bg-white/[0.12]" : "text-white/35 hover:bg-white/[0.07] hover:text-white/60"}`}
              onClick={() => setViewMode((viewMode === "tree" ? "flat" : "tree") as ViewMode)}
            >
              {viewMode === "tree" ? (
                /* tree icon — folder */
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              ) : (
                /* list icon */
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              )}
            </button>
          </Tooltip>
          {/* Sync with origin — fetch then pull */}
          <Tooltip content={t("git.syncWithOrigin")} position="bottom">
            <button
              className="flex items-center justify-center rounded border-none bg-transparent p-1 text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white/80 disabled:opacity-40 disabled:cursor-default"
              onClick={onSync}
              disabled={syncing}
            >
              {syncing ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              )}
            </button>
          </Tooltip>
          <Tooltip content={t("git.refresh")} position="bottom">
            <button
              className="flex items-center justify-center rounded border-none bg-transparent p-1 text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white/80"
              onClick={refresh}
            >
              <svg
                width="12"
                height="12"
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
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Checkout error */}
      {checkoutError && (
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1 font-mono text-[10.5px] text-red-400">
          <span className="truncate">{checkoutError}</span>
          <button className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-sm leading-none text-white/30 hover:text-white/60" onClick={() => setCheckoutError(null)}>×</button>
        </div>
      )}

      {/* Sync error */}
      {syncError && (
        <div className="shrink-0 px-3 py-1 font-mono text-[10.5px] text-red-400 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <span className="truncate">{syncError}</span>
          <button className="shrink-0 text-white/30 hover:text-white/60 border-none bg-transparent cursor-pointer p-0 text-sm leading-none" onClick={() => setSyncError(null)}>×</button>
        </div>
      )}

      {/* Commit box */}
      <CommitBox
        workspacePath={workspacePath}
        hasStagedChanges={status.staged.length > 0}
        hasUnstagedChanges={status.unstaged.length + status.untracked.length > 0}
        onCommitted={refresh}
      />

      {/* Tree */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <UnifiedTree nodes={nodes} draggable onToggle={handleToggle} onActivate={handleActivate} />
      </div>
    </div>
  );
}
