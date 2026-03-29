import {
  useState,
  useEffect,
  useRef,
  useDeferredValue,
  useMemo,
  useCallback,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PaletteFile, PaletteViewMode, VItem } from "./types";
import type { GitChangeStatus } from "../../workbench/contrib/source-control/types";
import { searchFiles } from "./fuzzy";
import { useFileIndex, type GitStatusMap } from "./useFileIndex";
import { PaletteRow } from "./PaletteRow";
import { QuickViewDialog } from "./QuickViewDialog";
import { useTabStore } from "../../workbench/contrib/canvas/store/useTabStore";
import {
  SearchIcon,
  ListViewIcon,
  TreeViewIcon,
  GitChangesIcon,
  ChevronRightIcon,
} from "./icons";
import { getFolderIconName } from "../tree/TreeRow";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 50;
const FOLDER_HEIGHT = 32;
const GROUP_HEIGHT = 26;
const MAX_LIST_HEIGHT = 520;
const TREE_INDENT = 14; // px per depth level

// ─── Icon base (mirrors TreeRow) ──────────────────────────────────────────────

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

// ─── Tree building ────────────────────────────────────────────────────────────

interface TreeNode {
  children: Map<string, TreeNode>;
  files: PaletteFile[];
}

function insertIntoTree(root: TreeNode, file: PaletteFile): void {
  const parts = file.rel.split("/");
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!node.children.has(part)) {
      node.children.set(part, { children: new Map(), files: [] });
    }
    node = node.children.get(part)!;
  }
  node.files.push(file);
}

function flattenTree(
  node: TreeNode,
  relPath: string,
  projectRoot: string,
  depth: number,
  collapsed: Set<string>,
  items: VItem[],
): void {
  // Folders first (sorted), then files (sorted)
  const sortedFolders = [...node.children.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const sortedFiles = [...node.files].sort((a, b) =>
    a.basename.localeCompare(b.basename, undefined, { sensitivity: "base" }),
  );

  for (const folderName of sortedFolders) {
    const folderRelPath = relPath ? `${relPath}/${folderName}` : folderName;
    const folderKey = `${projectRoot}::${folderRelPath}`;
    const isExpanded = !collapsed.has(folderKey);

    items.push({
      key: `folder::${folderKey}`,
      type: "folder",
      folderKey,
      folderName,
      depth,
    });

    if (isExpanded) {
      flattenTree(
        node.children.get(folderName)!,
        folderRelPath,
        projectRoot,
        depth + 1,
        collapsed,
        items,
      );
    }
  }

  for (const file of sortedFiles) {
    items.push({ key: file.id, type: "file", file, depth });
  }
}

// ─── Virtual item builder ─────────────────────────────────────────────────────

function buildVItems(
  files: PaletteFile[],
  viewMode: PaletteViewMode,
  collapsed: Set<string>,
): VItem[] {
  if (viewMode === "list") {
    return files.map((f) => ({ key: f.id, type: "file" as const, file: f }));
  }

  // Tree mode — group by project, then build folder tree per project
  const projects = new Map<string, PaletteFile[]>();
  for (const f of files) {
    const arr = projects.get(f.project) ?? [];
    arr.push(f);
    projects.set(f.project, arr);
  }

  const items: VItem[] = [];
  for (const [project, pFiles] of projects) {
    items.push({ key: `__group__${project}`, type: "group", groupLabel: project });
    const root: TreeNode = { children: new Map(), files: [] };
    for (const f of pFiles) insertIntoTree(root, f);
    const projectRoot = pFiles[0]?.projectRoot ?? project;
    flattenTree(root, "", projectRoot, 0, collapsed, items);
  }
  return items;
}

/** O(1) isSelected lookup: vItem index → file index (null for non-file items) */
function buildFileIndexMap(vItems: VItem[]): (number | null)[] {
  const map: (number | null)[] = new Array(vItems.length).fill(null);
  let count = 0;
  for (let i = 0; i < vItems.length; i++) {
    if (vItems[i]!.type === "file") map[i] = count++;
  }
  return map;
}

// ─── Folder row ───────────────────────────────────────────────────────────────

const FolderRow = memo(
  ({
    item,
    collapsed,
    onToggle,
  }: {
    item: VItem;
    collapsed: Set<string>;
    onToggle: (key: string) => void;
  }) => {
    const depth = item.depth ?? 0;
    const isExpanded = !collapsed.has(item.folderKey!);
    const iconName = getFolderIconName(item.folderName ?? "", isExpanded);
    const iconSrc = `${ICON_BASE}${iconName}.svg`;
    const paddingLeft = depth * TREE_INDENT + 8;

    return (
      <div
        className="palette-row flex items-center gap-[8px] h-full cursor-pointer select-none hover:bg-white/[0.05] data-[hovered]:bg-white/[0.05] transition-colors duration-[55ms] pr-2"
        style={{ paddingLeft }}
        onClick={() => onToggle(item.folderKey!)}
      >
        <span
          className="text-white/30 shrink-0 transition-transform duration-[80ms]"
          style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <ChevronRightIcon size={9} />
        </span>
        <img
          src={iconSrc}
          width={15}
          height={15}
          alt=""
          draggable={false}
          className="shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${ICON_BASE}folder-base${isExpanded ? "-open" : ""}.svg`;
          }}
        />
        <span className="text-[12.5px] text-white/60 truncate leading-none">
          {item.folderName}
        </span>
      </div>
    );
  },
);
FolderRow.displayName = "FolderRow";

// ─── View toggle button ───────────────────────────────────────────────────────

function ToggleBtn({
  children,
  active,
  onClick,
  title,
  accent,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
  accent?: boolean;
}) {
  return (
    <button
      className={[
        "flex items-center justify-center w-[26px] h-[26px] rounded-[4px] transition-colors duration-[55ms] [-webkit-app-region:no-drag]",
        active
          ? accent
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-white/[0.12] text-white/80"
          : "text-white/30 hover:text-white/55 hover:bg-white/[0.07]",
      ].join(" ")}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

// ─── PaletteDialog (inner) ────────────────────────────────────────────────────

const PaletteDialog = memo(
  ({
    files,
    gitStatus,
    isBuilding,
    onClose,
  }: {
    files: PaletteFile[];
    gitStatus: GitStatusMap;
    isBuilding: boolean;
    onClose: () => void;
  }) => {
    const [query, setQuery] = useState("");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [viewMode, setViewMode] = useState<PaletteViewMode>("list");
    const [gitOnly, setGitOnly] = useState(false);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [quickViewFile, setQuickViewFileState] = useState<PaletteFile | null>(null);
    // Track keyboard vs mouse navigation to suppress hover effect during keyboard use
    const [isKeyboardNav, setIsKeyboardNav] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const quickViewRef = useRef<PaletteFile | null>(null);

    // ── DOM-driven hover — no React re-renders (mirrors UnifiedTree) ──────────
    const hoveredRef = useRef<HTMLElement | null>(null);
    const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
    const rafIdRef = useRef(0);

    const setHovered = useCallback((el: HTMLElement | null) => {
      if (el === hoveredRef.current) return;
      if (hoveredRef.current) hoveredRef.current.removeAttribute("data-hovered");
      hoveredRef.current = el;
      if (el) el.setAttribute("data-hovered", "");
    }, []);

    const hoverHitTest = useCallback(() => {
      const pos = pointerPosRef.current;
      if (!pos) return;
      const hit = document.elementFromPoint(pos.x, pos.y);
      const row = hit?.closest(".palette-row") as HTMLElement | null;
      setHovered(row);
    }, [setHovered]);

    const setQuickViewFile = useCallback((f: PaletteFile | null) => {
      quickViewRef.current = f;
      setQuickViewFileState(f);
    }, []);

    // Defer search to keep typing instant even on large indexes
    const deferredQuery = useDeferredValue(query);

    const baseFiltered = useMemo(
      () => searchFiles(files, deferredQuery),
      [files, deferredQuery],
    );

    // Apply git-only filter on top of fuzzy results
    const filteredFiles = useMemo(
      () =>
        gitOnly
          ? baseFiltered.filter((f) => gitStatus[f.id] !== undefined)
          : baseFiltered,
      [baseFiltered, gitOnly, gitStatus],
    );

    const vItems = useMemo(
      () => buildVItems(filteredFiles, viewMode, collapsedFolders),
      [filteredFiles, viewMode, collapsedFolders],
    );

    const fileIndexMap = useMemo(() => buildFileIndexMap(vItems), [vItems]);
    const totalFiles = filteredFiles.length;

    // Reset selection and collapsed state when results change
    useEffect(() => {
      setSelectedIdx(0);
      setCollapsedFolders(new Set()); // auto-expand all for new search
    }, [deferredQuery, viewMode]);

    // ── Virtualizer ──────────────────────────────────────────────────────────
    const virtualizer = useVirtualizer({
      count: vItems.length,
      getScrollElement: () => listRef.current,
      estimateSize: (i) => {
        const type = vItems[i]?.type;
        if (type === "group") return GROUP_HEIGHT;
        if (type === "folder") return FOLDER_HEIGHT;
        return ROW_HEIGHT;
      },
      overscan: 12,
      getItemKey: (i) => vItems[i]!.key,
    });

    // Scroll selected item into view
    useEffect(() => {
      for (let i = 0; i < vItems.length; i++) {
        if (fileIndexMap[i] === selectedIdx) {
          virtualizer.scrollToIndex(i, { align: "auto" });
          break;
        }
      }
    }, [selectedIdx, vItems, fileIndexMap, virtualizer]);

    // Auto-focus on mount
    useEffect(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    // ── Folder toggle ────────────────────────────────────────────────────────
    const toggleFolder = useCallback((key: string) => {
      setCollapsedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }, []);

    // ── Navigation ───────────────────────────────────────────────────────────
    const navigateDown = useCallback(() => {
      setIsKeyboardNav(true);
      setSelectedIdx((i) => Math.min(i + 1, Math.max(0, totalFiles - 1)));
    }, [totalFiles]);
    const navigateUp = useCallback(() => {
      setIsKeyboardNav(true);
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }, []);

    // ── File actions ─────────────────────────────────────────────────────────
    const openFile = useCallback(
      (file: PaletteFile) => {
        window.dispatchEvent(
          new CustomEvent("volt:open-file-tab", {
            detail: { filePath: file.id, title: file.basename },
          }),
        );
        onClose();
      },
      [onClose],
    );

    const openSelected = useCallback(() => {
      const file = filteredFiles[selectedIdx];
      if (file) openFile(file);
    }, [filteredFiles, selectedIdx, openFile]);

    const openQuickViewSelected = useCallback(() => {
      const file = filteredFiles[selectedIdx];
      if (file) setQuickViewFile(file);
    }, [filteredFiles, selectedIdx, setQuickViewFile]);

    const copyPath = useCallback((file: PaletteFile) => {
      navigator.clipboard.writeText(file.id).catch(() => {});
    }, []);

    const openGitDiff = useCallback(
      (file: PaletteFile) => {
        const status = gitStatus[file.id] as GitChangeStatus | undefined;
        if (!status) return;
        const { openDiffTab } = useTabStore.getState();
        openDiffTab({
          workspacePath: file.projectRoot,
          filePath: file.id,
          cached: false,
          statusChar: status,
        });
        onClose();
      },
      [gitStatus, onClose],
    );

    // ── Keyboard handling ────────────────────────────────────────────────────
    // Global capture: Escape closes quick view first, then palette
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        if (quickViewRef.current) setQuickViewFile(null);
        else onClose();
      };
      window.addEventListener("keydown", handler, { capture: true });
      return () => window.removeEventListener("keydown", handler, { capture: true });
    }, [onClose, setQuickViewFile]);

    // j/k navigation when input is not focused
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (document.activeElement === inputRef.current) return;
        if (quickViewRef.current) return;
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          if (e.key === "j") { e.preventDefault(); navigateDown(); }
          if (e.key === "k") { e.preventDefault(); navigateUp(); }
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [navigateDown, navigateUp]);

    function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); navigateDown(); break;
        case "ArrowUp":   e.preventDefault(); navigateUp();   break;
        case "Enter":     e.preventDefault(); openSelected();            break;
      }
      // Cmd+Q → open quick view for selected
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "q") {
        e.preventDefault();
        openQuickViewSelected();
      }
    }

    // ── List height: shrink to fit when fewer results, cap at MAX ────────────
    const listHeight = Math.min(
      MAX_LIST_HEIGHT,
      Math.max(0, virtualizer.getTotalSize()),
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return createPortal(
      <div
        className="fixed inset-0 z-[99998] flex items-start justify-center pt-[11vh] [-webkit-app-region:no-drag]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[#161616]/20 backdrop-blur-[2px]" onMouseDown={onClose} />

        {/* Panel */}
        <div
          className="relative z-10 w-full max-w-[660px] mx-4 bg-[#161616] border border-white/[0.11] rounded-[4px] shadow-[0_24px_64px_rgba(0,0,0,0.75)] flex flex-col"
          data-canvas-scroll-exempt
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Search row */}
          <div className="flex items-center gap-3 px-4 py-[10px] border-b border-white/[0.07]">
            <span className="text-white/25 shrink-0">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search files… (*.ts · /regex/ · fuzzy)"
              className="flex-1 bg-transparent text-[14px] text-white/90 placeholder:text-white/22 outline-none min-w-0 [-webkit-app-region:no-drag]"
              spellCheck={false}
              autoComplete="off"
            />

            {/* View toggle group */}
            <div className="flex items-center gap-[3px] shrink-0">
              <ToggleBtn
                active={viewMode === "list"}
                onClick={() => setViewMode("list")}
                title="Show as list"
              >
                <ListViewIcon />
              </ToggleBtn>
              <ToggleBtn
                active={viewMode === "tree"}
                onClick={() => setViewMode("tree")}
                title="Show as file tree"
              >
                <TreeViewIcon />
              </ToggleBtn>
              <ToggleBtn
                active={gitOnly}
                onClick={() => setGitOnly((v) => !v)}
                title={gitOnly ? "Showing changed files only — click to clear" : "Show changed files only"}
                accent
              >
                <GitChangesIcon size={14} />
              </ToggleBtn>
            </div>

            {/* Building spinner */}
            {isBuilding && (
              <span className="w-3 h-3 border border-white/15 border-t-white/55 rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* Results */}
          {vItems.length === 0 ? (
            <div className="flex items-center justify-center text-[13px] text-white/22 px-6" style={{ height: 100 }}>
              {isBuilding
                ? "Building index…"
                : gitOnly && filteredFiles.length === 0 && baseFiltered.length > 0
                ? "No changed files matching this query"
                : query
                ? `No results for "${query}"`
                : gitOnly
                ? "No changed files in workspaces"
                : "Type to search across all workspaces"}
            </div>
          ) : (
            <div
              ref={listRef}
              className="volt-scroll [-webkit-app-region:no-drag]"
              style={{ height: listHeight, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}
              data-canvas-scroll-exempt=""
              onScroll={() => {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = requestAnimationFrame(hoverHitTest);
              }}
              onPointerMove={(e) => {
                setIsKeyboardNav(false);
                pointerPosRef.current = { x: e.clientX, y: e.clientY };
                const target = (e.target as HTMLElement).closest(".palette-row") as HTMLElement | null;
                setHovered(target);
              }}
              onPointerLeave={() => {
                pointerPosRef.current = null;
                setHovered(null);
              }}
            >
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                  const item = vItems[vRow.index]!;
                  const rowStyle: React.CSSProperties = {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vRow.start}px)`,
                    height: vRow.size,
                  };

                  if (item.type === "group") {
                    return (
                      <div
                        key={vRow.key}
                        style={rowStyle}
                        className="flex items-center px-3 text-[10px] font-semibold text-white/28 uppercase tracking-[0.12em] bg-[#111] border-b border-white/[0.04]"
                      >
                        {item.groupLabel}
                      </div>
                    );
                  }

                  if (item.type === "folder") {
                    return (
                      <div key={vRow.key} style={rowStyle}>
                        <FolderRow
                          item={item}
                          collapsed={collapsedFolders}
                          onToggle={toggleFolder}
                        />
                      </div>
                    );
                  }

                  const fileIdx = fileIndexMap[vRow.index];

                  return (
                    <div key={vRow.key} style={rowStyle}>
                      <PaletteRow
                        file={item.file!}
                        isSelected={fileIdx === selectedIdx}
                        isKeyboardNav={isKeyboardNav}
                        gitStatus={gitStatus[item.file!.id] as GitChangeStatus | undefined}
                        viewMode={viewMode}
                        treeDepth={viewMode === "tree" ? (item.depth ?? 0) : undefined}
                        onOpen={openFile}
                        onCopy={copyPath}
                        onQuickView={setQuickViewFile}
                        onGitDiff={openGitDiff}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          {totalFiles > 0 && (
            <div className="flex items-center gap-3 px-4 py-[6px] border-t border-white/[0.05] text-[11px] text-white/22 select-none">
              <span>{totalFiles.toLocaleString()} file{totalFiles !== 1 ? "s" : ""}</span>
              <span className="text-white/12">·</span>
              <span>↑↓ / j·k  navigate</span>
              <span className="text-white/12">·</span>
              <span>↵  open</span>
              <span className="text-white/12">·</span>
              <span>⌘Q  quick view</span>
              <span className="text-white/12">·</span>
              <span>esc  close</span>
            </div>
          )}
        </div>

        {/* Quick view — rendered above the palette */}
        <QuickViewDialog file={quickViewFile} />
      </div>,
      document.body,
    );
  },
);
PaletteDialog.displayName = "PaletteDialog";

// ─── Root export — unconditionally mounted so index builds in background ──────

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const { files, gitStatus, isBuilding, buildIndex } = useFileIndex();

  // Cmd+P / Ctrl+P — capture phase to beat Monaco and other listeners
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => {
          if (!prev && files.length === 0 && !isBuilding) buildIndex();
          return true;
        });
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [files.length, isBuilding, buildIndex]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("volt:open-palette", handler);
    return () => window.removeEventListener("volt:open-palette", handler);
  }, []);

  if (!isOpen) return null;

  return (
    <PaletteDialog
      files={files}
      gitStatus={gitStatus}
      isBuilding={isBuilding}
      onClose={() => setIsOpen(false)}
    />
  );
}
