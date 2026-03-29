import { useEffect, useState, useRef, memo } from "react";
import Editor from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import { createPortal } from "react-dom";
import type { PaletteFile } from "./types";
import { CopyPathIcon, CloseIcon } from "./icons";
import { Tooltip } from "../ui/Tooltip";
import { getFileIconName } from "../tree/TreeRow";

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

// ─── Language mapping ─────────────────────────────────────────────────────────

function getLanguage(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".json": "json", ".jsonc": "json",
    ".css": "css", ".scss": "scss", ".sass": "scss", ".less": "less",
    ".html": "html", ".htm": "html",
    ".md": "markdown", ".mdx": "markdown",
    ".py": "python", ".go": "go", ".rs": "rust",
    ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml", ".vue": "html", ".svelte": "html",
    ".graphql": "graphql", ".prisma": "prisma",
    ".c": "c", ".cpp": "cpp", ".cs": "csharp",
    ".java": "java", ".rb": "ruby", ".php": "php",
    ".swift": "swift", ".kt": "kotlin", ".dart": "dart",
    ".xml": "xml", ".sql": "sql", ".lua": "lua",
  };
  return map[ext.toLowerCase()] ?? "plaintext";
}

// ─── QuickViewDialog ──────────────────────────────────────────────────────────

interface QuickViewDialogProps {
  file: PaletteFile | null;
}

export const QuickViewDialog = memo(({ file }: QuickViewDialogProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null);

  // Load file content when target changes
  useEffect(() => {
    if (!file) { setContent(null); return; }
    setContent(null);
    setError(null);
    setIsLoading(true);
    window.electron.fs
      .readFile(file.id)
      .then((text) => { setContent(text); setIsLoading(false); })
      .catch((err: unknown) => { setError(String(err)); setIsLoading(false); });
  }, [file?.id]);

  function handleCopy() {
    if (!file) return;
    navigator.clipboard.writeText(file.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const handleEditorMount = (
    editor: MonacoNS.editor.IStandaloneCodeEditor,
    monaco: typeof MonacoNS,
  ) => {
    editorRef.current = editor;

    // Cmd+L → copy path with line range
    editor.addAction({
      id: "volt-quick-view-copy-with-lines",
      label: "Copy Path with Line Numbers",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1,
      run: (ed) => {
        if (!file) return;
        const sel = ed.getSelection();
        if (!sel) {
          navigator.clipboard.writeText(file.id).catch(() => {});
          return;
        }
        const { startLineNumber: s, endLineNumber: e } = sel;
        const ref = s === e ? `${file.id}:${s}` : `${file.id}:${s}-${e}`;
        navigator.clipboard.writeText(ref).catch(() => {});
      },
    });

    // "Add to Chat" context menu item
    editor.addAction({
      id: "volt-add-to-chat",
      label: "Add to Chat History",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 2,
      run: (ed) => {
        const sel = ed.getSelection();
        const model = ed.getModel();
        if (!sel || !model) return;
        const selectedText = model.getValueInRange(sel);
        if (!selectedText.trim()) return;
        window.dispatchEvent(
          new CustomEvent("volt:add-to-chat", {
            detail: { text: selectedText, filePath: file?.id },
          }),
        );
      },
    });

    // Ensure scrolling works inside quick view
    editor.onDidScrollChange(() => {});
  };

  if (!file) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center [-webkit-app-region:no-drag]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/62 backdrop-blur-[5px]" />

      {/* Dialog */}
      <div
        className="relative z-10 w-[82vw] max-w-[1100px] h-[78vh] bg-[#161616] border border-white/[0.1] rounded-[4px] shadow-[0_40px_100px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
        data-canvas-scroll-exempt
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-[9px] border-b border-white/[0.07] shrink-0">
          {/* File type icon */}
          <img
            src={`${ICON_BASE}${getFileIconName(file.ext)}.svg`}
            width={16}
            height={16}
            alt=""
            draggable={false}
            className="shrink-0 opacity-80"
            onError={(e) => { (e.target as HTMLImageElement).src = `${ICON_BASE}document.svg`; }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-white/80 truncate block leading-tight">
              {file.rel}
            </span>
            <span className="text-[11px] text-white/28 truncate block leading-tight">
              {file.project}  ·  {file.id}
            </span>
          </div>

          {/* Copy path — icon only with tooltip */}
          <Tooltip content="Copy full file path" position="bottom">
            <button
              className={[
                "flex items-center justify-center w-[26px] h-[26px] rounded-[4px]",
                "transition-colors duration-[55ms]",
                copied
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-white/35 hover:text-white/70 hover:bg-white/[0.08]",
              ].join(" ")}
              onClick={handleCopy}
            >
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <CopyPathIcon size={13} />
              )}
            </button>
          </Tooltip>

          {/* Cmd+L hint */}
          <span className="text-[10px] text-white/18 shrink-0 hidden sm:block">
            ⌘L  copy with lines
          </span>

          {/* Close */}
          <button
            className="flex items-center justify-center w-[26px] h-[26px] rounded-[4px] text-white/30 hover:text-white/65 hover:bg-white/[0.08] transition-colors duration-[55ms]"
            title="Close  Esc"
            onClick={() => {
              // Dispatch synthetic escape so the parent's Escape handler clears quickViewRef
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: false, cancelable: true }));
            }}
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative" style={{ minHeight: 0 }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/25">
              Loading…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-red-400/60 px-6 text-center">
              {error}
            </div>
          )}
          {content !== null && !isLoading && (
            <Editor
              height="100%"
              language={getLanguage(file.ext)}
              value={content}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                lineNumbers: "on",
                renderLineHighlight: "line",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                  verticalScrollbarSize: 5,
                  horizontalScrollbarSize: 5,
                  useShadows: false,
                  alwaysConsumeMouseWheel: true,
                },
                mouseWheelScrollSensitivity: 1,
                padding: { top: 12, bottom: 12 },
                wordWrap: "off",
                contextmenu: true,
                folding: true,
                smoothScrolling: true,
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
});

QuickViewDialog.displayName = "QuickViewDialog";
