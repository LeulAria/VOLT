import { memo, useRef, useEffect, useState, type CSSProperties } from "react";
import type { FlatNode } from "../../../../shared/types";
import { Tooltip } from "../ui/Tooltip";

// ─── Icon helpers ────────────────────────────────────────────────────────────

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

export function getFileIconName(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "react",
    ".js": "javascript",
    ".jsx": "react",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".json": "json",
    ".jsonc": "json",
    ".css": "css",
    ".scss": "sass",
    ".sass": "sass",
    ".less": "less",
    ".html": "html",
    ".htm": "html",
    ".md": "markdown",
    ".mdx": "markdown",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".sh": "powershell",
    ".bash": "powershell",
    ".zsh": "powershell",
    ".svg": "svg",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".webp": "image",
    ".ico": "image",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".toml": "toml",
    ".lock": "lock",
    ".xml": "xml",
    ".vue": "vue",
    ".svelte": "svelte",
    ".astro": "astro",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".prisma": "prisma",
    ".env": "tune",
    ".gitignore": "git",
    ".gitattributes": "git",
    ".npmrc": "npm",
    ".zip": "zip",
    ".tar": "zip",
    ".gz": "zip",
    ".wasm": "webassembly",
    ".vim": "vim",
    ".lua": "lua",
    ".rb": "ruby",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".cs": "csharp",
    ".dart": "dart",
    ".php": "php",
    ".tf": "terraform",
    ".dockerfile": "docker",
  };
  return map[ext.toLowerCase()] ?? "document";
}

export function getFolderIconName(label: string, expanded: boolean): string {
  const lower = label.toLowerCase();
  const suffix = expanded ? "-open" : "";
  const named: Record<string, string> = {
    src: "folder-src",
    source: "folder-src",
    components: "folder-components",
    component: "folder-components",
    pages: "folder-views",
    views: "folder-views",
    hooks: "folder-hook",
    utils: "folder-utils",
    util: "folder-utils",
    helpers: "folder-helper",
    lib: "folder-lib",
    libs: "folder-lib",
    assets: "folder-resource",
    static: "folder-resource",
    public: "folder-public",
    styles: "folder-theme",
    style: "folder-theme",
    css: "folder-css",
    sass: "folder-sass",
    images: "folder-images",
    img: "folder-images",
    icons: "folder-images",
    fonts: "folder-font",
    font: "folder-font",
    api: "folder-routes",
    routes: "folder-routes",
    router: "folder-routes",
    store: "folder-store",
    stores: "folder-store",
    redux: "folder-redux-reducer",
    context: "folder-context",
    contexts: "folder-context",
    types: "folder-typescript",
    "@types": "folder-typescript",
    interfaces: "folder-typescript",
    models: "folder-base",
    model: "folder-base",
    schemas: "folder-base",
    schema: "folder-base",
    config: "folder-config",
    configs: "folder-config",
    configuration: "folder-config",
    test: "folder-test",
    tests: "folder-test",
    __tests__: "folder-test",
    spec: "folder-test",
    specs: "folder-test",
    e2e: "folder-test",
    dist: "folder-dist",
    build: "folder-dist",
    out: "folder-dist",
    output: "folder-dist",
    node_modules: "folder-node",
    ".git": "folder-git",
    ".github": "folder-github",
    ".vscode": "folder-vscode",
    docs: "folder-docs",
    doc: "folder-docs",
    documentation: "folder-docs",
    scripts: "folder-scripts",
    script: "folder-scripts",
    tools: "folder-tools",
    tool: "folder-tools",
    ci: "folder-ci",
    docker: "folder-docker",
    kubernetes: "folder-kubernetes",
    k8s: "folder-kubernetes",
    serverless: "folder-serverless",
    functions: "folder-functions",
    lambda: "folder-functions",
    middleware: "folder-middleware",
    database: "folder-database",
    db: "folder-database",
    migrations: "folder-database",
    seeds: "folder-database",
    audio: "folder-audio",
    video: "folder-video",
    locale: "folder-i18n",
    locales: "folder-i18n",
    i18n: "folder-i18n",
    translations: "folder-i18n",
    lang: "folder-i18n",
    temp: "folder-temp",
    tmp: "folder-temp",
    cache: "folder-temp",
    backup: "folder-backup",
    backups: "folder-backup",
    logs: "folder-log",
    log: "folder-log",
    coverage: "folder-coverage",
    packages: "folder-packages",
    apps: "folder-app",
    app: "folder-app",
    backend: "folder-base",
    frontend: "folder-base",
    server: "folder-server",
    client: "folder-client",
    shared: "folder-shared",
    common: "folder-base",
    core: "folder-core",
    main: "folder-base",
    renderer: "folder-base",
    preload: "folder-base",
    desktop: "folder-base",
    electron: "folder-base",
  };
  return `${named[lower] ?? "folder-base"}${suffix}`;
}

export function iconSrcFor(node: FlatNode): string {
  const name =
    node.type === "directory"
      ? getFolderIconName(node.label, node.expanded)
      : getFileIconName(node.ext);
  return `${ICON_BASE}${name}.svg`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.1s ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M8 4L16 12L8 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <circle
        cx="5"
        cy="5"
        r="3.5"
        stroke="#e5e7eb"
        strokeWidth="2"
        fill="currentColor"
        strokeDasharray="16"
        strokeDashoffset="6"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect
        x="2"
        y="4"
        width="6"
        height="5"
        rx="1"
        stroke="#e5e7eb"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M3.5 4V3a1.5 1.5 0 0 1 3 0v1"
        stroke="#e5e7eb"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

const IMAGE_THUMBNAIL_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "ico"]);

function NodeIcon({ node, opacity }: { node: FlatNode; opacity?: number }) {
  const isDir = node.type === "directory";
  const ext = node.ext?.toLowerCase() ?? "";
  const isRasterImage = !isDir && IMAGE_THUMBNAIL_EXTS.has(ext.replace(".", ""));

  if (isRasterImage) {
    const encoded = node.id.split("/").map(encodeURIComponent).join("/");
    return (
      <img
        src={`volt-file://${encoded}`}
        width={16}
        height={16}
        alt=""
        draggable={false}
        style={{
          opacity: opacity ?? 1,
          objectFit: "cover",
          borderRadius: 2,
          imageRendering: "auto",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = `${ICON_BASE}image.svg`;
        }}
      />
    );
  }

  return (
    <img
      src={iconSrcFor(node)}
      width={16}
      height={16}
      alt=""
      draggable={false}
      style={{ opacity: opacity ?? 1 }}
      onError={(e) => {
        const fallback = isDir ? `${ICON_BASE}folder-base.svg` : `${ICON_BASE}document.svg`;
        if ((e.target as HTMLImageElement).src !== fallback) {
          (e.target as HTMLImageElement).src = fallback;
        }
      }}
    />
  );
}

// ─── Inline rename/create input ──────────────────────────────────────────────

interface InlineInputProps {
  node: FlatNode | null; // null = new file/dir (no existing node)
  depth: number;
  style: CSSProperties;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

export function InlineInput({ node, depth, style, onCommit, onCancel }: InlineInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const indent = depth * INDENT;

  // Determine icon from current typed value
  const getPreviewSrc = (value: string): string => {
    if (!node) {
      const ext = value.includes(".") ? "." + value.split(".").pop()! : "";
      return `${ICON_BASE}${getFileIconName(ext)}.svg`;
    }
    return iconSrcFor({ ...node, label: value });
  };

  useEffect(() => {
    inputRef.current?.focus();
    if (node) {
      const dot = node.label.lastIndexOf(".");
      inputRef.current?.setSelectionRange(0, dot > 0 ? dot : node.label.length);
    } else {
      inputRef.current?.select();
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = inputRef.current?.value.trim() ?? "";
      if (v) onCommit(v);
      else onCancel();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  const previewValue = inputRef.current?.value ?? node?.label ?? "";

  return (
    <div
      className="tree-row absolute flex items-center text-[13px] cursor-pointer select-none [-webkit-app-region:no-drag] pointer-events-auto bg-transparent [contain:style]"
      style={style}
    >
      {Array.from({ length: depth }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 bottom-0 w-px bg-white/[0.06] pointer-events-none"
          style={{ left: i * INDENT + INDENT / 2 }}
        />
      ))}
      <span
        className="absolute w-5 h-full flex items-center justify-center shrink-0"
        style={{ left: indent }}
      />
      <span
        className="absolute w-5 h-full flex items-center justify-center shrink-0 pointer-events-none"
        style={{ left: indent + ICON_AREA }}
      >
        <img
          src={getPreviewSrc(previewValue)}
          width={16}
          height={16}
          alt=""
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${ICON_BASE}document.svg`;
          }}
        />
      </span>
      <input
        ref={inputRef}
        className="flex-1 h-5 bg-[#1e293b] border border-blue-500 rounded-[3px] text-[#f3f4f6] text-[13px] font-[inherit] px-[5px] outline-none min-w-0 [-webkit-app-region:no-drag] focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
        style={{ marginLeft: indent + ICON_AREA * 2 + 2 }}
        defaultValue={node?.label ?? ""}
        onKeyDown={handleKeyDown}
        onBlur={() => onCancel()}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INDENT = 16;
const ICON_AREA = 20;

// ─── TreeRow ─────────────────────────────────────────────────────────────────

export interface TreeRowProps {
  node: FlatNode;
  style: CSSProperties;
  isActive: boolean;
  isSelected?: boolean;
  isFocused: boolean;
  isSticky?: boolean;
  isRenaming?: boolean;
  /** When true, directory rows accept intra-tree drops to move files/folders */
  draggable?: boolean;
  onExpand: (node: FlatNode) => void;
  onCollapse: (nodeId: string) => void;
  onClick: (node: FlatNode, shiftKey: boolean) => void;
  onRenameCommit?: (node: FlatNode, newName: string) => void;
  onRenameCancel?: () => void;
  onStartRename?: (node: FlatNode) => void;
  onDelete?: (node: FlatNode) => void;
  onTerminal?: (node: FlatNode) => void;
  onCreateNote?: (node: FlatNode) => void;
  onCreateTodo?: (node: FlatNode) => void;
}

// ─── Row-level hover icons ────────────────────────────────────────────────────

function IconTerm() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

// ─── Context menu ────────────────────────────────────────────────────────────

function ContextMenu({
  x,
  y,
  node,
  onClose,
  onStartRename,
  onDelete,
}: {
  x: number;
  y: number;
  node: FlatNode;
  onClose: () => void;
  onStartRename?: () => void;
  onDelete?: () => void;
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

  const invoke = (channel: string, ...args: any[]) => {
    try {
      (window.electron as any).ipcRenderer?.invoke(channel, ...args);
    } catch {
      /* */
    }
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    onClose();
  };

  const getRelativePath = () => {
    const root: string = (window as any).__voltWorkspaceRoot ?? "";
    if (root && node.id.startsWith(root)) {
      return node.id.slice(root.length).replace(/^\//, "");
    }
    return node.id.split("/").slice(-3).join("/");
  };

  const itemCls =
    "flex items-center gap-2 w-full px-[10px] py-[6px] border-none rounded-[5px] bg-transparent text-white/75 text-[12.5px] text-left cursor-pointer transition-[background,color] duration-100 whitespace-nowrap hover:bg-white/[0.09] hover:text-white/95 [-webkit-app-region:no-drag]";
  const sepCls = "h-px bg-white/[0.08] my-1 mx-[6px]";

  return (
    <div
      ref={ref}
      className="fixed z-[999999] min-w-[180px] bg-[#1e1e1e] border border-white/10 rounded-lg p-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[12px]"
      style={{ left: x, top: y }}
    >
      {node.type === "file" && (
        <>
          <button
            className={itemCls}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("volt:open-file-tab", {
                  detail: { filePath: node.id, title: node.label },
                }),
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

      <button className={itemCls} onClick={() => invoke("shell:show-item", node.id)}>
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

      <button className={itemCls} onClick={() => copyToClipboard(node.id)}>
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy Path
      </button>
      <button className={itemCls} onClick={() => copyToClipboard(getRelativePath())}>
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
        onClick={() => invoke("shell:open-editor", { path: node.id, editor: "cursor" })}
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
        onClick={() => invoke("shell:open-editor", { path: node.id, editor: "vscode" })}
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
          onStartRename?.();
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
          onDelete?.();
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

const TreeRow = memo(
  ({
    node,
    style,
    isActive,
    isSelected,
    isFocused,
    isSticky,
    isRenaming,
    draggable = false,
    onExpand,
    onCollapse,
    onClick,
    onRenameCommit,
    onRenameCancel,
    onStartRename,
    onDelete,
    onTerminal,
  }: TreeRowProps) => {
    const indent = node.depth * INDENT;
    const isDir = node.type === "directory";
    const isUnreadable = !node.permissions.readable;
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isRenamingLocal, setIsRenamingLocal] = useState(false);
    const [isDropTarget, setIsDropTarget] = useState(false);

    // ── Drag handlers ─────────────────────────────────────────────────────────

    function handleDragStart(e: React.DragEvent) {
      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData(
        "volt/canvas-drop",
        JSON.stringify({ filePath: node.id, title: node.label }),
      );
      e.dataTransfer.setData(
        "volt/tree-move",
        JSON.stringify({ srcPath: node.id, title: node.label }),
      );
      e.stopPropagation();
    }

    function handleDragOver(e: React.DragEvent) {
      if (!draggable || !isDir) return;
      if (!e.dataTransfer.types.includes("volt/tree-move")) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDropTarget(true);
    }

    function handleDragLeave(e: React.DragEvent) {
      if (!draggable || !isDir) return;
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        setIsDropTarget(false);
      }
    }

    async function handleDrop(e: React.DragEvent) {
      if (!draggable || !isDir) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(false);
      const json = e.dataTransfer.getData("volt/tree-move");
      if (!json) return;
      const { srcPath } = JSON.parse(json) as { srcPath: string };
      if (!srcPath || srcPath === node.id) return;
      if (node.id.startsWith(srcPath + "/")) return;
      const fileName = srcPath.split("/").pop()!;
      const newPath = `${node.id}/${fileName}`;
      try {
        await window.electron.fs.rename(srcPath, newPath);
        window.dispatchEvent(new CustomEvent("volt:refresh-workspace"));
      } catch (err) {
        console.error("[tree-move]", err);
      }
    }

    function handleArrowClick(e: React.MouseEvent) {
      e.stopPropagation();
      if (isUnreadable) return;
      if (node.expanded) onCollapse(node.id);
      else onExpand(node);
    }

    function handleContextMenu(e: React.MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }

    // Rename mode — render inline input in place (external or local context-menu triggered)
    if (isRenaming || isRenamingLocal) {
      return (
        <InlineInput
          node={node}
          depth={node.depth}
          style={style}
          onCommit={(v) => {
            setIsRenamingLocal(false);
            onRenameCommit?.(node, v);
          }}
          onCancel={() => {
            setIsRenamingLocal(false);
            onRenameCancel?.();
          }}
        />
      );
    }

    // ── Row class computation ─────────────────────────────────────────────────
    // Keep "tree-row" for JS .closest(".tree-row") in StickyTree hover tracking

    const baseColor =
      isSelected || isActive ? "text-white" : isUnreadable ? "text-[#6b7280]" : "text-[#b0b4bc]";

    const bgColor = isSelected
      ? "bg-white/[0.07]"
      : isActive
        ? "bg-white/[0.09]"
        : isFocused
          ? "bg-white/[0.08]"
          : isSticky
            ? "bg-[#191919]"
            : "";

    const hoverBg = isActive
      ? "hover:bg-white/[0.12] data-[hovered]:bg-white/[0.12]"
      : isSelected
        ? "hover:bg-white/[0.07] data-[hovered]:bg-white/[0.07]"
        : isFocused
          ? "hover:bg-white/[0.11] data-[hovered]:bg-white/[0.11]"
          : "hover:bg-white/[0.07] data-[hovered]:bg-white/[0.07]";

    const dropTargetCls = isDropTarget
      ? "outline outline-1 outline-blue-400/60 bg-blue-400/[0.08]"
      : "";

    const rowCls = [
      "tree-row group",
      "absolute flex items-center text-[13px] cursor-pointer select-none",
      "[-webkit-app-region:no-drag] pointer-events-auto bg-transparent",
      "[transition:background-color_80ms_ease-out,color_80ms_ease-out] [will-change:background-color]",
      "[contain:style]",
      baseColor,
      bgColor,
      hoverBg,
      "hover:text-white data-[hovered]:text-white",
      dropTargetCls,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <>
        <div
          className={rowCls}
          style={style}
          draggable
          onClick={(e) => onClick(node, e.shiftKey)}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          onDragOver={draggable && isDir ? handleDragOver : undefined}
          onDragLeave={draggable && isDir ? handleDragLeave : undefined}
          onDrop={draggable && isDir ? handleDrop : undefined}
          title={node.id}
          data-nodeid={node.id}
        >
          {Array.from({ length: node.depth }).map((_, i) => (
            <span
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/[0.06] pointer-events-none [transition:background_80ms_ease-out] group-hover:bg-white/[0.12]"
              style={{ left: i * INDENT + INDENT / 2 }}
            />
          ))}

          <span
            className="absolute w-5 h-full flex items-center justify-center shrink-0"
            style={{ left: indent }}
            onClick={handleArrowClick}
          >
            {isDir &&
              !isUnreadable &&
              (node.status === "loading" ? <Spinner /> : <ChevronIcon expanded={node.expanded} />)}
            {isUnreadable && <LockIcon />}
          </span>

          <span
            className="absolute w-5 h-full flex items-center justify-center shrink-0 pointer-events-none"
            style={{ left: indent + ICON_AREA }}
          >
            <NodeIcon node={node} opacity={isUnreadable ? 0.35 : 1} />
          </span>

          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 leading-6"
            style={{ paddingLeft: indent + ICON_AREA * 2 + 2 }}
          >
            {node.label}
          </span>

          {!node.permissions.writable && !isDir && (
            <span className="text-[9px] font-mono text-white/30 border border-white/[0.15] rounded-[3px] px-[3px] mr-1.5 shrink-0">
              RO
            </span>
          )}

          {isDir && (
            <span
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-px opacity-0 pointer-events-none transition-opacity duration-100 group-hover:opacity-100 group-hover:pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip content="Open in terminal tile" position="top">
                <button
                  className="flex items-center justify-center w-[18px] h-[18px] border-none rounded-[3px] bg-transparent text-white/40 cursor-pointer p-0 [-webkit-app-region:no-drag] transition-[background,color] duration-100 hover:bg-white/10 hover:text-white/85"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTerminal?.(node);
                  }}
                >
                  <IconTerm />
                </button>
              </Tooltip>
            </span>
          )}
        </div>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={node}
            onClose={() => setContextMenu(null)}
            onStartRename={() => {
              if (onStartRename) onStartRename(node);
              else setIsRenamingLocal(true);
            }}
            onDelete={() => onDelete?.(node)}
          />
        )}
      </>
    );
  },
  (prev, next) =>
    prev.node === next.node &&
    prev.isActive === next.isActive &&
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.isSticky === next.isSticky &&
    prev.isRenaming === next.isRenaming &&
    prev.draggable === next.draggable &&
    (prev.style as { top?: number }).top === (next.style as { top?: number }).top,
);

TreeRow.displayName = "TreeRow";
export default TreeRow;
