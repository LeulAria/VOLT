import { memo, useState, useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { UnifiedTreeNode } from "./types";
import { Tooltip } from "../ui/Tooltip";

// ─── Context menu ─────────────────────────────────────────────────────────────

function NodeContextMenu({
  x,
  y,
  node,
  onClose,
  onStartRename,
}: {
  x: number;
  y: number;
  node: UnifiedTreeNode;
  onClose: () => void;
  onStartRename: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("keydown", keyHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("keydown", keyHandler, true);
    };
  }, [onClose]);

  const filePath = (node.data as any)?.id ?? "";

  const invoke = (channel: string, ...args: any[]) => {
    try {
      (window.electron as any).ipcRenderer?.invoke(channel, ...args);
    } catch {
      /* */
    }
    onClose();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    onClose();
  };

  const getRelative = () => {
    const root: string = (window as any).__voltWorkspaceRoot ?? "";
    if (root && filePath.startsWith(root)) return filePath.slice(root.length).replace(/^\//, "");
    return filePath.split("/").slice(-3).join("/");
  };

  const isFile = node.kind === "file";

  const itemCls =
    "flex items-center gap-2 w-full px-[10px] py-[6px] border-none rounded-[5px] bg-transparent text-white/75 text-[12.5px] text-left cursor-pointer transition-[background,color] duration-100 whitespace-nowrap hover:bg-white/[0.09] hover:text-white/95 [-webkit-app-region:no-drag]";
  const sepCls = "h-px bg-white/[0.08] my-1 mx-[6px]";

  return (
    <div
      ref={ref}
      className="fixed z-[999999] min-w-[180px] bg-[#1e1e1e] border border-white/10 rounded-lg p-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[12px]"
      style={{ left: x, top: y }}
    >
      {isFile && (
        <>
          <button
            className={itemCls}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("volt:open-file-tab", { detail: { filePath, title: node.label } }),
              );
              onClose();
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Open Preview
          </button>
          <div className={sepCls} />
        </>
      )}
      <button className={itemCls} onClick={() => { window.electron.shell.showItem(filePath); onClose(); }}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6l4-4h10l4 4M3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6M3 6h18" />
        </svg>
        Reveal in Finder
      </button>
      <div className={sepCls} />
      <button className={itemCls} onClick={() => copy(filePath)}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy Path
      </button>
      <button className={itemCls} onClick={() => copy(getRelative())}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="8 6 2 12 8 18" />
          <polyline points="16 6 22 12 16 18" />
        </svg>
        Copy Relative Path
      </button>
      <div className={sepCls} />
      <button
        className={itemCls}
        onClick={() => invoke("shell:open-editor", { path: filePath, editor: "cursor" })}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        Open in Cursor
      </button>
      <button
        className={itemCls}
        onClick={() => invoke("shell:open-editor", { path: filePath, editor: "vscode" })}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        Open in VS Code
      </button>
      <div className={sepCls} />
      <button
        className={itemCls}
        onClick={() => {
          onStartRename();
          onClose();
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Rename
      </button>
      <button
        className={`${itemCls} !text-[rgba(248,81,73,0.85)] hover:!bg-[rgba(248,81,73,0.12)] hover:!text-[#f85149]`}
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("volt:tree-delete-node", { detail: { nodeId: filePath } }),
          );
          onClose();
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Delete
      </button>
    </div>
  );
}

const INDENT = 16;

// ─── Chevron ─────────────────────────────────────────────────────────────────

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.06s linear",
        flexShrink: 0,
      }}
    >
      <path
        d="M8 4L16 12L8 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Row props ───────────────────────────────────────────────────────────────

export interface UnifiedTreeRowProps {
  node: UnifiedTreeNode;
  style: CSSProperties;
  isFocused: boolean;
  isActive: boolean;
  isSticky?: boolean;
  /** When true, directory rows accept intra-tree drops to move files/folders */
  draggable?: boolean;
  onToggle: (node: UnifiedTreeNode) => void;
  onActivate: (
    node: UnifiedTreeNode,
    modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
  ) => void;
}

// ─── UnifiedTreeRow ──────────────────────────────────────────────────────────

// ─── Inline rename input ─────────────────────────────────────────────────────

function RenameInput({ node, style }: { node: UnifiedTreeNode; style: CSSProperties }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const data = node.data as {
    defaultValue?: string;
    onSave?: (v: string) => void;
    onCancel?: () => void;
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className="flex items-center w-full h-6 border-none bg-transparent text-[13px] cursor-pointer select-none [-webkit-app-region:no-drag] absolute left-0 box-border [contain:layout_style]"
      style={style}
    >
      <input
        ref={inputRef}
        defaultValue={data.defaultValue ?? node.label}
        style={{
          marginLeft: node.depth * INDENT + INDENT + 2,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 3,
          color: "#fff",
          fontSize: 12,
          padding: "1px 5px",
          outline: "none",
          width: `calc(100% - ${node.depth * INDENT + INDENT + 18}px)`,
          fontFamily: "inherit",
          flexShrink: 0,
        }}
        onKeyDown={(e) => {
          e.stopPropagation(); // prevent tree keyboard handler from intercepting
          if (e.key === "Enter") {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) data.onSave?.(v);
            else data.onCancel?.();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            data.onCancel?.();
          }
        }}
        onBlur={() => data.onCancel?.()}
        onClick={(e) => e.stopPropagation()}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

// ─── UnifiedTreeRow ──────────────────────────────────────────────────────────

const UnifiedTreeRow = memo(
  ({
    node,
    style,
    isFocused,
    isActive,
    isSticky = false,
    draggable = false,
    onToggle,
    onActivate,
  }: UnifiedTreeRowProps) => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isRenamingLocal, setIsRenamingLocal] = useState(false);
    const [isDropTarget, setIsDropTarget] = useState(false);

    // Inline rename mode (pending-create injection OR local rename from context menu)
    if ((node.data as any)?.isRenameInput) {
      return <RenameInput node={node} style={style} />;
    }

    // Local rename triggered by context menu
    if (isRenamingLocal) {
      const filePath = (node.data as any)?.id ?? "";
      const dir = filePath.lastIndexOf("/");
      const parentPath = dir >= 0 ? filePath.slice(0, dir) : filePath;
      return (
        <RenameInput
          node={{
            ...node,
            data: {
              isRenameInput: true,
              defaultValue: node.label,
              onSave: async (newName: string) => {
                const newPath = `${parentPath}/${newName}`;
                try {
                  await window.electron.fs.rename(filePath, newPath);
                  window.dispatchEvent(new CustomEvent("volt:refresh-workspace"));
                } catch (e) {
                  console.error("[rename]", e);
                }
                setIsRenamingLocal(false);
              },
              onCancel: () => setIsRenamingLocal(false),
            },
          }}
          style={style}
        />
      );
    }

    const indent = node.depth * INDENT;
    const isExpandable = node.hasChildren;
    const isRoot = node.kind === "root";
    const isSection = node.kind === "section";
    const isFileOrDir = node.kind === "file" || node.kind === "directory";
    const filePath = (node.data as any)?.id ?? "";
    // For git change items: data has { file: { absPath } }
    const gitItemPath: string = node.kind === "item" ? ((node.data as any)?.file?.absPath ?? "") : "";
    const dragFilePath = filePath || gitItemPath;
    // Dragging is gated by the `draggable` prop — disabled by default
    const canDrag = !!draggable && !!dragFilePath;

    // ── Drag handlers ──────────────────────────────────────────────────────────

    function handleDragStart(e: React.DragEvent) {
      if (!canDrag) return;
      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData("volt/canvas-drop", JSON.stringify({ filePath: dragFilePath, title: node.label }));
      if (isFileOrDir) {
        e.dataTransfer.setData("volt/tree-move", JSON.stringify({ srcPath: dragFilePath, title: node.label }));
      }

      // Custom drag ghost — square pill with filename, dark bg, blur
      const ghost = document.createElement("div");
      ghost.style.cssText = [
        "position:fixed",
        "top:-9999px",
        "left:-9999px",
        "display:inline-flex",
        "align-items:center",
        "gap:5px",
        "padding:4px 10px",
        "background:rgba(22,22,22,0.6)",
        "backdrop-filter:blur(2px)",
        "-webkit-backdrop-filter:blur(2px)",
        "border:1px solid rgba(255,255,255,0.18)",
        "border-radius:6px",
        "color:rgba(255,255,255,0.85)",
        "font-size:12px",
        "font-family:Geist,-apple-system,sans-serif",
        "white-space:nowrap",
        "pointer-events:none",
        "z-index:99999",
      ].join(";");
      ghost.textContent = node.label;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 10, 14);
      setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); }, 0);

      e.stopPropagation();
    }

    function handleDragOver(e: React.DragEvent) {
      if (!draggable || node.kind !== "directory") return;
      if (!e.dataTransfer.types.includes("volt/tree-move")) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDropTarget(true);
    }

    function handleDragLeave(e: React.DragEvent) {
      if (!draggable || node.kind !== "directory") return;
      // Only clear if we're actually leaving this element (not entering a child)
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        setIsDropTarget(false);
      }
    }

    async function handleDrop(e: React.DragEvent) {
      if (!draggable || node.kind !== "directory") return;
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(false);
      const json = e.dataTransfer.getData("volt/tree-move");
      if (!json) return;
      const { srcPath } = JSON.parse(json) as { srcPath: string };
      if (!srcPath || !filePath || srcPath === filePath) return;
      // Prevent moving into own subtree
      if (filePath.startsWith(srcPath + "/")) return;
      const fileName = srcPath.split("/").pop()!;
      const newPath = `${filePath}/${fileName}`;
      try {
        await window.electron.fs.rename(srcPath, newPath);
        window.dispatchEvent(new CustomEvent("volt:refresh-workspace"));
      } catch (err) {
        console.error("[tree-move]", err);
      }
    }

    function handleChevronClick(e: React.MouseEvent) {
      e.stopPropagation();
      onToggle(node);
    }

    function handleClick(e: React.MouseEvent) {
      if (isExpandable) {
        onToggle(node);
      }
      onActivate(node, { metaKey: e.metaKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey });
    }

    function handleContextMenu(e: React.MouseEvent) {
      if (!isFileOrDir) return;
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }

    // Build Tailwind class list (utree-row kept for JS .closest() selector)
    const baseRow =
      "utree-row group flex items-center w-full h-6 pr-2 border-0 bg-transparent " +
      "text-[#656a73] text-[13px] cursor-pointer select-none transition-none " +
      "absolute left-0 box-border [contain:layout_style] [-webkit-app-region:no-drag] " +
      "hover:bg-white/7 hover:text-white data-[hovered]:bg-white/7 data-[hovered]:text-white";

    const cls = [
      baseRow,
      isSticky ? "!bg-[#191919]" : "",
      isFocused ? "bg-white/[0.08] text-white" : "",
      isActive ? "!bg-white/[0.09] text-white hover:!bg-white/[0.11]" : "",
      isRoot
        ? "!text-[11px] !font-semibold !uppercase !tracking-[0.05em] !text-[#9ca3af] !py-1.5 hover:!bg-white/[0.03]"
        : "",
      isSection
        ? "!text-[12px] !font-medium !text-white/50 hover:!bg-white/[0.04] hover:!text-white/70"
        : "",
      isDropTarget ? "!bg-blue-500/[0.18] outline outline-1 outline-blue-400/50" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <>
        <div
          className={cls}
          style={style}
          draggable={canDrag}
          onClick={(e) => handleClick(e)}
          onContextMenu={handleContextMenu}
          onDragStart={canDrag ? handleDragStart : undefined}
          onDragOver={draggable && node.kind === "directory" ? handleDragOver : undefined}
          onDragLeave={draggable && node.kind === "directory" ? handleDragLeave : undefined}
          onDrop={draggable && node.kind === "directory" ? handleDrop : undefined}
          data-nodeid={node.id}
        >
          {/* Indent guides */}
          {node.depth > 0 &&
            Array.from({ length: node.depth }, (_, i) => (
              <span
                key={i}
                className="absolute top-0 w-px h-full bg-white/[0.06] pointer-events-none group-hover:bg-white/10"
                style={{ left: i * INDENT + INDENT / 2 }}
              />
            ))}

          {/* Chevron area */}
          <span
            className="absolute top-0 flex items-center justify-center w-5 h-full shrink-0 text-white/25 hover:text-white/50"
            style={{ left: indent }}
            onClick={isExpandable ? handleChevronClick : undefined}
          >
            {isExpandable && <Chevron expanded={node.expanded} />}
          </span>

          {/* Icon */}
          {node.icon && (
            <span
              className="absolute top-0 flex items-center justify-center w-5 h-full shrink-0 text-white/35 group-hover:text-white/60"
              style={{ left: indent + 20 }}
            >
              {node.icon}
            </span>
          )}

          {/* Label + meta path */}
          <span
            className="flex flex-1 items-center min-w-0 overflow-hidden"
            style={{ paddingLeft: indent + (node.icon ? 40 : 20) + 2 }}
          >
            <span className="shrink-0 whitespace-nowrap">{node.label}</span>
            {node.meta && (
              <span className="ml-1.5 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-mono text-white/25">
                {node.meta}
              </span>
            )}
          </span>

          {/* Actions, then numeric badge, then file status — badge count stays at the right end */}
          <span className="flex items-center gap-0.5 shrink-0 ml-auto">
            {node.actions && node.actions.length > 0 && (
              <span
                className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-data-[hovered]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                {node.actions.map((action) => {
                  const variantCls =
                    action.variant === "play"
                      ? "hover:!bg-green-500/15 hover:!text-green-400/90"
                      : action.variant === "delete"
                        ? "hover:!bg-red-500/15 hover:!text-red-400/90"
                        : "";
                  return (
                    <Tooltip key={action.id} content={action.title} position="top">
                      <button
                        className={`flex items-center justify-center w-[18px] h-[18px] rounded-[3px] border-0 bg-transparent text-white/30 cursor-pointer p-0 transition-[background,color] duration-100 hover:bg-white/10 hover:text-white/80 ${variantCls}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                      >
                        {action.icon}
                      </button>
                    </Tooltip>
                  );
                })}
              </span>
            )}
            {node.badge != null && node.badge > 0 && (
              <span className="text-[10px] font-mono text-white/35 bg-white/[0.08] rounded px-1 leading-4 shrink-0">
                {node.badge}
              </span>
            )}
            {node.statusBadge && (
              <span
                className={[
                  "text-[10px] font-mono font-bold shrink-0 pr-1.5 tracking-[0.02em] transition-opacity duration-100 group-hover:opacity-0",
                  node.statusBadge.toLowerCase() === "m" ? "text-[#e3a840]" : "",
                  node.statusBadge.toLowerCase() === "a" ? "text-[#4ade80]" : "",
                  node.statusBadge.toLowerCase() === "d" ? "text-[#f87171]" : "",
                  node.statusBadge.toLowerCase() === "r" ? "text-[#60a5fa]" : "",
                  node.statusBadge.toLowerCase() === "u" ? "text-[#a78bfa]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {node.statusBadge}
              </span>
            )}
          </span>
        </div>

        {/* Context menu — rendered in document.body via portal to escape sidebar backdrop-filter containing block */}
        {contextMenu && isFileOrDir && createPortal(
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={node}
            onClose={() => setContextMenu(null)}
            onStartRename={() => setIsRenamingLocal(true)}
          />,
          document.body,
        )}
      </>
    );
  },
  (prev, next) =>
    prev.node === next.node &&
    prev.isFocused === next.isFocused &&
    prev.isActive === next.isActive &&
    prev.isSticky === next.isSticky &&
    prev.draggable === next.draggable &&
    (prev.style as { top?: number }).top === (next.style as { top?: number }).top,
);

UnifiedTreeRow.displayName = "UnifiedTreeRow";
export default UnifiedTreeRow;
