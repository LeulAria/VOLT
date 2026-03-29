import { memo } from "react";
import type { PaletteFile, PaletteViewMode } from "./types";
import type { GitChangeStatus } from "../../workbench/contrib/source-control/types";
import { getFileIconName } from "../tree/TreeRow";
import { CopyPathIcon, QuickViewIcon, GitDiffIcon } from "./icons";

// ─── Icon resolution ──────────────────────────────────────────────────────────

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

// ─── Git status badge ─────────────────────────────────────────────────────────

const GIT_COLORS: Record<string, string> = {
  M: "text-amber-400/80",
  A: "text-emerald-400/80",
  D: "text-red-400/80",
  R: "text-sky-400/80",
  "?": "text-white/35",
};

function GitBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-[10px] font-mono leading-none px-[5px] py-[2px] rounded-[3px] border border-current/25 shrink-0 ${GIT_COLORS[status] ?? "text-white/35"}`}
    >
      {status}
    </span>
  );
}

// ─── PaletteRow ───────────────────────────────────────────────────────────────

export interface PaletteRowProps {
  file: PaletteFile;
  isSelected: boolean;
  /** When true (keyboard navigation active) suppress the hover highlight */
  isKeyboardNav?: boolean;
  gitStatus: GitChangeStatus | undefined;
  viewMode: PaletteViewMode;
  /** Indentation depth in tree mode (undefined = list mode) */
  treeDepth?: number;
  onOpen: (file: PaletteFile) => void;
  onCopy: (file: PaletteFile) => void;
  onQuickView: (file: PaletteFile) => void;
  onGitDiff: (file: PaletteFile) => void;
}

const TREE_INDENT = 14; // px per depth level

export const PaletteRow = memo(
  ({
    file,
    isSelected,
    isKeyboardNav = false,
    gitStatus,
    viewMode,
    treeDepth,
    onOpen,
    onCopy,
    onQuickView,
    onGitDiff,
  }: PaletteRowProps) => {
    const iconSrc = `${ICON_BASE}${getFileIconName(file.ext)}.svg`;
    const paddingLeft = treeDepth !== undefined ? treeDepth * TREE_INDENT + 8 : 12;

    const secondaryLabel =
      viewMode === "tree"
        ? file.rel !== file.basename
          ? file.rel
          : ""
        : file.rel !== file.basename
          ? `${file.project}  ·  ${file.rel}`
          : file.project;

    return (
      <div
        className={[
          "palette-row group flex items-center gap-[9px] h-full cursor-pointer select-none",
          "transition-colors duration-[55ms] pr-2",
          isSelected
            ? "bg-white/[0.09] text-white"
            : isKeyboardNav
              ? "text-white/70"
              : "text-white/60 hover:bg-white/[0.05] hover:text-white data-[hovered]:bg-white/[0.05] data-[hovered]:text-white",
        ].join(" ")}
        style={{ paddingLeft }}
        onClick={() => onOpen(file)}
      >
        {/* File icon */}
        <img
          src={iconSrc}
          width={16}
          height={16}
          alt=""
          draggable={false}
          className="shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${ICON_BASE}document.svg`;
          }}
        />

        {/* Labels */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span
            className={`text-[13px] truncate leading-[1.35] ${isSelected ? "text-white" : "text-inherit"}`}
          >
            {file.basename}
          </span>
          {secondaryLabel && (
            <span className="text-[11px] text-white/35 truncate leading-[1.35]">
              {secondaryLabel}
            </span>
          )}
        </div>

        {/* Git badge */}
        {gitStatus && <GitBadge status={gitStatus} />}

        {/* Action buttons — always visible */}
        <div
          className="flex items-center gap-[1px] shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionBtn title="Copy path" onClick={() => onCopy(file)}>
            <CopyPathIcon size={14} />
          </ActionBtn>
          <ActionBtn title="Quick view  ⌘Q" onClick={() => onQuickView(file)}>
            <QuickViewIcon size={14} />
          </ActionBtn>
          {gitStatus && (
            <ActionBtn title="View git diff" onClick={() => onGitDiff(file)}>
              <GitDiffIcon size={14} />
            </ActionBtn>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.file === next.file &&
    prev.isSelected === next.isSelected &&
    prev.isKeyboardNav === next.isKeyboardNav &&
    prev.gitStatus === next.gitStatus &&
    prev.viewMode === next.viewMode &&
    prev.treeDepth === next.treeDepth,
);

PaletteRow.displayName = "PaletteRow";

// ─── Shared action button ─────────────────────────────────────────────────────

function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center justify-center w-[22px] h-[22px] rounded-[3px] text-white/40 hover:text-white/85 hover:bg-white/10 transition-colors duration-[55ms] [-webkit-app-region:no-drag]"
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
