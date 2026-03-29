import type { UnifiedTreeNode, UnifiedNodeAction } from "../../../components/tree/types";
import type {
  GitStatusResult,
  GitFileChange,
  GitStash,
  GitBranch,
  GitChangeStatus,
  GitCommit,
  GitWorktree,
  GitContributor,
} from "./types";
import { getFileIconNode } from "./fileIcon";
import { getFolderIconName } from "../../../components/tree/TreeRow";

// ─── Icon base (mirrors TreeRow.tsx resolveIconBase) ─────────────────────────

function resolveIconBase(): string {
  try {
    const url = new URL(import.meta.url);
    const base = url.href.includes("/assets/")
      ? url.href.slice(0, url.href.lastIndexOf("/assets/") + 1)
      : `${url.origin}/`;
    return `${base}icons/`;
  } catch {
    return "./icons/";
  }
}
const ICON_BASE = resolveIconBase();

function FolderIcon({ name, expanded }: { name: string; expanded: boolean }) {
  const iconName = getFolderIconName(name, expanded);
  return (
    <img
      src={`${ICON_BASE}${iconName}.svg`}
      width={14}
      height={14}
      alt=""
      style={{ display: "block", flexShrink: 0 }}
      onError={(e) => {
        (e.target as HTMLImageElement).src = `${ICON_BASE}folder-base.svg`;
      }}
    />
  );
}

// ─── Tiny icons ───────────────────────────────────────────────────────────────

function Ico({ d, color }: { d: string; color?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const IcoChanges = () => (
  <Ico d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
);
/** Stage / stage-all */
const IcoPlus = () => <Ico d="M12 5v14M5 12h14" color="#3fb950" />;
/** Unstage (single horizontal bar) */
const IcoMinus = () => <Ico d="M5 12h14" />;
/** Trash outline — neutral (not red); used for staged discard */
const IcoTrashNeutral = () => (
  <Ico d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
);
/** Curved undo arrow */
const IcoUndo = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);
const IcoDiff = () => (
  <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M12 10v6" />
);
const IcoBranch = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="8" r="3" />
    <line x1="6" y1="9" x2="6" y2="15" />
    <path d="M18 11c0 6-12 3-12 9" />
  </svg>
);
const IcoStash = () => (
  <Ico d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
);
const IcoApply = () => <Ico d="M20 6L9 17l-5-5" color="#3fb950" />;
const IcoPop = () => <Ico d="M12 5v14M5 12l7 7 7-7" color="#3fb950" />;
const IcoDelete = () => <Ico d="M18 6L6 18M6 6l12 12" color="#f85149" />;
const IcoCommit = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <line x1="1.05" y1="12" x2="7" y2="12" />
    <line x1="17.01" y1="12" x2="22.96" y2="12" />
  </svg>
);
const IcoCopy = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IcoEdit = () => (
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
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcoRename = () => (
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
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);
const IcoWorktree = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
  </svg>
);
const IcoContrib = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ─── Status badge label ───────────────────────────────────────────────────────

function statusLabel(s: GitChangeStatus): string {
  switch (s) {
    case "A":
      return "A";
    case "D":
      return "D";
    case "R":
      return "R";
    case "U":
      return "U";
    case "?":
      return "U";
    default:
      return "M";
  }
}

// ─── File item builder ────────────────────────────────────────────────────────

function makeFileNode(
  file: GitFileChange,
  parentId: string,
  depth: number,
  staged: boolean,
  workspacePath: string,
  onOpenDiff: (file: GitFileChange, staged: boolean) => void,
  onStage: (file: GitFileChange) => void,
  onUnstage: (file: GitFileChange) => void,
  onDiscard: (file: GitFileChange) => void,
  onDiscardStagedFile: (file: GitFileChange) => void,
  showDir = true,
  forceReadOnly = false,
): UnifiedTreeNode {
  const fileName = file.path.split("/").pop() ?? file.path;
  const relDir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";

  const actions: UnifiedNodeAction[] = staged
    ? [
        {
          id: "diff",
          icon: <IcoDiff />,
          title: "Open diff",
          onClick: () => onOpenDiff(file, true),
        },
        { id: "unstage", icon: <IcoMinus />, title: "Unstage", onClick: () => onUnstage(file) },
        {
          id: "discard-staged-file",
          icon: <IcoTrashNeutral />,
          title: "Discard staged changes",
          onClick: () => onDiscardStagedFile(file),
        },
      ]
    : [
        {
          id: "diff",
          icon: <IcoDiff />,
          title: "Open diff",
          onClick: () => onOpenDiff(file, false),
        },
        {
          id: "discard",
          icon: <IcoUndo />,
          title: "Discard changes",
          onClick: () => onDiscard(file),
        },
        { id: "stage", icon: <IcoPlus />, title: "Stage", onClick: () => onStage(file) },
      ];

  return {
    id: `${parentId}:${file.path}`,
    label: fileName,
    depth,
    kind: "item",
    expanded: false,
    hasChildren: false,
    parentId,
    icon: getFileIconNode(file.path),
    meta: showDir && relDir ? relDir : undefined,
    statusBadge: statusLabel(file.status),
    badge: undefined,
    actions,
    data: { file, staged, workspacePath, readOnly: forceReadOnly },
  };
}

// ─── Tree-mode directory grouping ────────────────────────────────────────────

interface DirTree {
  dirs: Map<string, DirTree>;
  files: GitFileChange[];
}

function insertIntoTree(tree: DirTree, segments: string[], file: GitFileChange) {
  if (segments.length === 1) {
    tree.files.push(file);
    return;
  }
  const [head, ...rest] = segments;
  if (!tree.dirs.has(head!)) tree.dirs.set(head!, { dirs: new Map(), files: [] });
  insertIntoTree(tree.dirs.get(head!)!, rest, file);
}

function flattenDirTree(
  tree: DirTree,
  parentId: string,
  depth: number,
  staged: boolean,
  workspacePath: string,
  expandedSections: Set<string>,
  onOpenDiff: (file: GitFileChange, staged: boolean) => void,
  onStage: (file: GitFileChange) => void,
  onUnstage: (file: GitFileChange) => void,
  onDiscard: (file: GitFileChange) => void,
  onDiscardStagedFile: (file: GitFileChange) => void,
  actionsFor?: (f: GitFileChange) => UnifiedNodeAction[],
  forceReadOnly?: boolean,
): UnifiedTreeNode[] {
  const nodes: UnifiedTreeNode[] = [];

  // Directories first
  for (const [dirName, subTree] of tree.dirs) {
    const dirId = `${parentId}:dir:${dirName}`;
    const dirOpen = expandedSections.has(dirId);
    const count = countFiles(subTree);
    nodes.push({
      id: dirId,
      label: dirName,
      depth,
      kind: "directory",
      expanded: dirOpen,
      hasChildren: true,
      parentId,
      icon: <FolderIcon name={dirName} expanded={dirOpen} />,
      badge: count || undefined,
    });
    if (dirOpen) {
      nodes.push(
        ...flattenDirTree(
          subTree,
          dirId,
          depth + 1,
          staged,
          workspacePath,
          expandedSections,
          onOpenDiff,
          onStage,
          onUnstage,
          onDiscard,
          onDiscardStagedFile,
          actionsFor,
          forceReadOnly,
        ),
      );
    }
  }

  // Files
  for (const f of tree.files) {
    if (actionsFor) {
      const fileName = f.path.split("/").pop() ?? f.path;
      nodes.push({
        id: `${parentId}:${f.path}`,
        label: fileName,
        depth: depth,
        kind: "item",
        expanded: false,
        hasChildren: false,
        parentId: parentId,
        icon: getFileIconNode(f.path),
        meta: statusLabel(f.status as GitChangeStatus),
        badge: undefined,
        actions: actionsFor(f),
        data: { file: f, staged, workspacePath, readOnly: forceReadOnly },
      });
    } else {
      nodes.push(
        makeFileNode(
          f,
          parentId,
          depth,
          staged,
          workspacePath,
          onOpenDiff,
          onStage,
          onUnstage,
          onDiscard,
          onDiscardStagedFile,
          false,
          forceReadOnly,
        ),
      );
    }
  }

  return nodes;
}

function countFiles(tree: DirTree): number {
  let n = tree.files.length;
  for (const sub of tree.dirs.values()) n += countFiles(sub);
  return n;
}

function buildTreeModeNodes(
  files: GitFileChange[],
  parentId: string,
  baseDepth: number,
  staged: boolean,
  workspacePath: string,
  expandedSections: Set<string>,
  onOpenDiff: (file: GitFileChange, staged: boolean) => void,
  onStage: (file: GitFileChange) => void,
  onUnstage: (file: GitFileChange) => void,
  onDiscard: (file: GitFileChange) => void,
  onDiscardStagedFile: (file: GitFileChange) => void,
  actionsFor?: (f: GitFileChange) => UnifiedNodeAction[],
  forceReadOnly?: boolean,
): UnifiedTreeNode[] {
  const root: DirTree = { dirs: new Map(), files: [] };
  for (const f of files) {
    insertIntoTree(root, f.path.split("/"), f);
  }
  return flattenDirTree(
    root,
    parentId,
    baseDepth,
    staged,
    workspacePath,
    expandedSections,
    onOpenDiff,
    onStage,
    onUnstage,
    onDiscard,
    onDiscardStagedFile,
    actionsFor,
    forceReadOnly,
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export interface GitTreeCallbacks {
  workspacePath: string;
  onOpenDiff(file: GitFileChange, staged: boolean, forceReadOnly?: boolean): void;
  onStage(file: GitFileChange): void;
  onUnstage(file: GitFileChange): void;
  onDiscard(file: GitFileChange): void;
  /** Restore staged file(s) to HEAD (index + worktree). */
  onDiscardStagedFile(file: GitFileChange): void;
  onStageAll(): void;
  onUnstageAll(): void;
  onDiscardAll(): void;
  /** Discard all currently staged changes (restore to HEAD). */
  onDiscardAllStaged(): void;
  onStashStaged(): void;
  onStashApply(index: number): void;
  onStashPop(index: number): void;
  onStashDrop(index: number): void;
  onStashEdit(index: number): void;
  onBranchCheckout(name: string): void;
  expandedSections: Set<string>;
  onToggleSection(id: string): void;
  viewMode: "flat" | "tree";
  stashFilesCache: Record<string, GitFileChange[]>;
  commits: GitCommit[];
  commitFilesCache: Record<string, GitFileChange[]>;
  onLoadMoreCommits(): void;
  onCopyCommitHash(hash: string): void;
  onOpenCommitDiff(file: GitFileChange, hash: string): void;
  worktrees: GitWorktree[];
  contributors: GitContributor[];
  renamingStashIndex: number | null;
  onStartStashRename(index: number): void;
  onCancelStashRename(): void;
  onStashRename(index: number, message: string): void;
}

export function buildGitTree(
  status: GitStatusResult,
  stashes: GitStash[],
  branches: GitBranch[],
  cb: GitTreeCallbacks,
): UnifiedTreeNode[] {
  const nodes: UnifiedTreeNode[] = [];
  const { workspacePath } = cb;

  // ── CHANGES root ──────────────────────────────────────────────────────────
  const changesId = "scm:changes";
  const changesOpen = cb.expandedSections.has(changesId);

  nodes.push({
    id: changesId,
    label: "Changes",
    depth: 0,
    kind: "root",
    expanded: changesOpen,
    hasChildren: true,
    parentId: null,
    icon: <IcoChanges />,
    badge: status.staged.length + status.unstaged.length + status.untracked.length || undefined,
    actions: [],
  });

  if (changesOpen) {
    // ── Staged Changes ──────────────────────────────────────────────────────
    const stagedId = "scm:changes:staged";
    const stagedOpen = cb.expandedSections.has(stagedId);

    nodes.push({
      id: stagedId,
      label: "Staged Changes",
      depth: 1,
      kind: "section",
      expanded: stagedOpen,
      hasChildren: status.staged.length > 0,
      parentId: changesId,
      badge: status.staged.length || undefined,
      actions:
        status.staged.length > 0
          ? [
              {
                id: "stash-staged",
                icon: <IcoStash />,
                title: "Stash staged changes",
                onClick: cb.onStashStaged,
              },
              {
                id: "unstage-all",
                icon: <IcoMinus />,
                title: "Unstage all",
                onClick: cb.onUnstageAll,
              },
              {
                id: "discard-staged",
                icon: <IcoTrashNeutral />,
                title: "Discard all staged",
                onClick: cb.onDiscardAllStaged,
              },
            ]
          : [],
    });

    if (stagedOpen) {
      if (cb.viewMode === "tree") {
        nodes.push(
          ...buildTreeModeNodes(
            status.staged,
            stagedId,
            2,
            true,
            workspacePath,
            cb.expandedSections,
            cb.onOpenDiff,
            cb.onStage,
            cb.onUnstage,
            cb.onDiscard,
            cb.onDiscardStagedFile,
            undefined,
            false,
          ),
        );
      } else {
        for (const f of status.staged) {
          nodes.push(
            makeFileNode(
              f,
              stagedId,
              2,
              true,
              workspacePath,
              cb.onOpenDiff,
              cb.onStage,
              cb.onUnstage,
              cb.onDiscard,
              cb.onDiscardStagedFile,
            ),
          );
        }
      }
    }

    // ── Changes (unstaged + untracked) ──────────────────────────────────────
    const unstagedId = "scm:changes:unstaged";
    const unstagedOpen = cb.expandedSections.has(unstagedId);
    const allUnstaged = [...status.unstaged, ...status.untracked];

    nodes.push({
      id: unstagedId,
      label: "Changes",
      depth: 1,
      kind: "section",
      expanded: unstagedOpen,
      hasChildren: allUnstaged.length > 0,
      parentId: changesId,
      badge: allUnstaged.length || undefined,
      actions:
        allUnstaged.length > 0
          ? [
              { id: "stage-all", icon: <IcoPlus />, title: "Stage all", onClick: cb.onStageAll },
              {
                id: "discard-all",
                icon: <IcoTrashNeutral />,
                title: "Discard all",
                onClick: cb.onDiscardAll,
              },
            ]
          : [],
    });

    if (unstagedOpen) {
      if (cb.viewMode === "tree") {
        nodes.push(
          ...buildTreeModeNodes(
            allUnstaged,
            unstagedId,
            2,
            false,
            workspacePath,
            cb.expandedSections,
            cb.onOpenDiff,
            cb.onStage,
            cb.onUnstage,
            cb.onDiscard,
            () => {},
            undefined,
            false,
          ),
        );
      } else {
        for (const f of allUnstaged) {
          nodes.push(
            makeFileNode(
              f,
              unstagedId,
              2,
              false,
              workspacePath,
              cb.onOpenDiff,
              cb.onStage,
              cb.onUnstage,
              cb.onDiscard,
              () => {},
            ),
          );
        }
      }
    }
  }

  // ── COMMITS root ─────────────────────────────────────────────────────────────
  const commitsId = "scm:commits";
  const commitsOpen = cb.expandedSections.has(commitsId);

  nodes.push({
    id: commitsId,
    label: "Commits",
    depth: 0,
    kind: "root",
    expanded: commitsOpen,
    hasChildren: cb.commits.length > 0,
    parentId: null,
    icon: <IcoCommit />,
    badge: undefined,
  });

  if (commitsOpen) {
    for (const commit of cb.commits) {
      const commitItemId = `${commitsId}:${commit.hash}`;
      const commitExpanded = cb.expandedSections.has(commitItemId);
      const commitFiles = cb.commitFilesCache[commit.hash] ?? [];

      const initials = commit.author
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

      nodes.push({
        id: commitItemId,
        label: commit.message,
        depth: 1,
        kind: "item",
        expanded: commitExpanded,
        hasChildren: true,
        parentId: commitsId,
        icon: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              fontSize: 8,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
        ),
        meta: commit.date,
        actions: [
          {
            id: "copy-hash",
            icon: <IcoCopy />,
            title: "Copy commit hash",
            onClick: () => cb.onCopyCommitHash(commit.hash),
          },
        ],
        data: commit,
      });

      if (commitExpanded) {
        if (commitFiles.length === 0) {
          nodes.push({
            id: `${commitItemId}:loading`,
            label: "Loading files…",
            depth: 2,
            kind: "item",
            expanded: false,
            hasChildren: false,
            parentId: commitItemId,
          });
        } else if (cb.viewMode === "tree") {
          nodes.push(
            ...buildTreeModeNodes(
              commitFiles,
              commitItemId,
              2,
              false,
              workspacePath,
              cb.expandedSections,
              cb.onOpenDiff,
              () => {},
              () => {},
              () => {},
              () => {},
              (f) => [
                {
                  id: "diff",
                  icon: <IcoDiff />,
                  title: "Open diff",
                  onClick: () => cb.onOpenCommitDiff(f, commit.hash),
                },
              ],
              true,
            ),
          );
        } else {
          for (const f of commitFiles) {
            nodes.push({
              id: `${commitItemId}:${f.path}`,
              label: f.path.split("/").pop() ?? f.path,
              depth: 2,
              kind: "item",
              expanded: false,
              hasChildren: false,
              parentId: commitItemId,
              icon: getFileIconNode(f.path),
              meta: f.path.includes("/")
                ? f.path.slice(0, f.path.lastIndexOf("/"))
                : statusLabel(f.status as GitChangeStatus),
              actions: [
                {
                  id: "diff",
                  icon: <IcoDiff />,
                  title: "Open diff",
                  onClick: () => cb.onOpenCommitDiff(f, commit.hash),
                },
              ],
              data: { file: f, staged: false, workspacePath, commitHash: commit.hash },
            });
          }
        }
      }
    }

    nodes.push({
      id: `${commitsId}:load-more`,
      label: "Load more commits",
      depth: 1,
      kind: "item",
      expanded: false,
      hasChildren: false,
      parentId: commitsId,
      actions: [],
      data: { isLoadMore: true },
    });
  }

  // ── STASHES root ──────────────────────────────────────────────────────────
  const stashesId = "scm:stashes";
  const stashesOpen = cb.expandedSections.has(stashesId);

  nodes.push({
    id: stashesId,
    label: "Stashes",
    depth: 0,
    kind: "root",
    expanded: stashesOpen,
    hasChildren: stashes.length > 0,
    parentId: null,
    icon: <IcoStash />,
    badge: stashes.length || undefined,
  });

  if (stashesOpen) {
    for (const s of stashes) {
      const label = s.message.replace(/^On \S+: /, "").replace(/^WIP on \S+: /, "") || s.message;
      const stashItemId = `${stashesId}:${s.index}`;
      const stashItemExpanded = cb.expandedSections.has(stashItemId);
      const cacheKey = `${workspacePath}:${s.index}`;
      const stashFiles = cb.stashFilesCache[cacheKey] ?? [];

      // Inline rename mode: inject an input node instead of the stash row
      if (cb.renamingStashIndex === s.index) {
        nodes.push({
          id: stashItemId,
          label: label,
          depth: 1,
          kind: "item",
          expanded: false,
          hasChildren: false,
          parentId: stashesId,
          data: {
            isRenameInput: true,
            defaultValue: label,
            onSave: (v: string) => cb.onStashRename(s.index, v),
            onCancel: cb.onCancelStashRename,
          },
        });
        continue;
      }

      nodes.push({
        id: stashItemId,
        label: `stash@{${s.index}}: ${label}`,
        depth: 1,
        kind: "item",
        expanded: stashItemExpanded,
        hasChildren: true,
        parentId: stashesId,
        meta: s.date ? new Date(s.date).toLocaleDateString() : undefined,
        actions: [
          {
            id: "apply",
            icon: <IcoApply />,
            title: "Apply stash",
            onClick: () => cb.onStashApply(s.index),
          },
          {
            id: "pop",
            icon: <IcoPop />,
            title: "Pop stash",
            onClick: () => cb.onStashPop(s.index),
          },
          {
            id: "rename",
            icon: <IcoRename />,
            title: "Rename stash",
            onClick: () => cb.onStartStashRename(s.index),
          },
          {
            id: "edit",
            icon: <IcoEdit />,
            title: "Edit stash (pops to working tree)",
            onClick: () => cb.onStashEdit(s.index),
          },
          {
            id: "drop",
            icon: <IcoDelete />,
            title: "Drop stash",
            variant: "delete" as const,
            onClick: () => cb.onStashDrop(s.index),
          },
        ],
        data: s,
      });

      if (stashItemExpanded) {
        if (cb.viewMode === "tree" && stashFiles.length > 0) {
          nodes.push(
            ...buildTreeModeNodes(
              stashFiles,
              stashItemId,
              2,
              false,
              workspacePath,
              cb.expandedSections,
              cb.onOpenDiff,
              () => {},
              () => {},
              () => {},
              () => {},
              (f) => [
                {
                  id: "diff",
                  icon: <IcoDiff />,
                  title: "Open diff",
                  onClick: () => cb.onOpenDiff(f, false, true),
                },
              ],
              true,
            ),
          );
        } else if (stashFiles.length > 0) {
          for (const f of stashFiles) {
            const fileName = f.path.split("/").pop() ?? f.path;
            const relDir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "";
            nodes.push({
              id: `${stashItemId}:${f.path}`,
              label: fileName,
              depth: 2,
              kind: "item",
              expanded: false,
              hasChildren: false,
              parentId: stashItemId,
              icon: getFileIconNode(f.path),
              meta: relDir || statusLabel(f.status as GitChangeStatus),
              badge: undefined,
              actions: [
                {
                  id: "diff",
                  icon: <IcoDiff />,
                  title: "Open diff",
                  onClick: () => cb.onOpenDiff(f, false, true),
                },
              ],
              data: { file: f, staged: false, workspacePath, readOnly: true },
            });
          }
        } else {
          nodes.push({
            id: `${stashItemId}:loading`,
            label: "Loading files…",
            depth: 2,
            kind: "item",
            expanded: false,
            hasChildren: false,
            parentId: stashItemId,
          });
        }
      }
    }
  }

  // ── BRANCHES root ─────────────────────────────────────────────────────────
  const branchesId = "scm:branches";
  const branchesOpen = cb.expandedSections.has(branchesId);

  nodes.push({
    id: branchesId,
    label: "Branches",
    depth: 0,
    kind: "root",
    expanded: branchesOpen,
    hasChildren: branches.length > 0,
    parentId: null,
    icon: <IcoBranch />,
    badge: branches.filter((b) => !b.isRemote).length || undefined,
  });

  if (branchesOpen) {
    for (const b of branches.filter((br) => !br.isRemote)) {
      nodes.push({
        id: `${branchesId}:${b.name}`,
        label: b.name,
        depth: 1,
        kind: "item",
        expanded: false,
        hasChildren: false,
        parentId: branchesId,
        meta: b.current ? "current" : undefined,
        actions: b.current
          ? []
          : [
              {
                id: "checkout",
                icon: <IcoApply />,
                title: "Checkout",
                onClick: () => cb.onBranchCheckout(b.name),
              },
            ],
        data: b,
      });
    }
  }

  // ── WORKTREES root ────────────────────────────────────────────────────────
  const worktreesId = "scm:worktrees";
  const worktreesOpen = cb.expandedSections.has(worktreesId);

  nodes.push({
    id: worktreesId,
    label: "Worktrees",
    depth: 0,
    kind: "root",
    expanded: worktreesOpen,
    hasChildren: cb.worktrees.length > 0,
    parentId: null,
    icon: <IcoWorktree />,
    badge: cb.worktrees.length || undefined,
  });

  if (worktreesOpen) {
    for (const wt of cb.worktrees) {
      const name = wt.path.split("/").pop() ?? wt.path;
      nodes.push({
        id: `${worktreesId}:${wt.path}`,
        label: name,
        depth: 1,
        kind: "item",
        expanded: false,
        hasChildren: false,
        parentId: worktreesId,
        icon: wt.isMain ? <IcoStash /> : <IcoBranch />,
        meta: wt.branch || undefined,
        data: wt,
      });
    }
  }

  // ── CONTRIBUTORS root ─────────────────────────────────────────────────────
  const contribId = "scm:contributors";
  const contribOpen = cb.expandedSections.has(contribId);

  nodes.push({
    id: contribId,
    label: "Contributors",
    depth: 0,
    kind: "root",
    expanded: contribOpen,
    hasChildren: cb.contributors.length > 0,
    parentId: null,
    icon: <IcoContrib />,
    badge: cb.contributors.length || undefined,
  });

  if (contribOpen) {
    for (const c of cb.contributors) {
      const initials = c.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase();
      nodes.push({
        id: `${contribId}:${c.name}`,
        label: c.name,
        depth: 1,
        kind: "item",
        expanded: false,
        hasChildren: false,
        parentId: contribId,
        icon: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              fontSize: 7,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
        ),
        meta: `${c.commits} commits`,
        data: c,
      });
    }
  }

  return nodes;
}
