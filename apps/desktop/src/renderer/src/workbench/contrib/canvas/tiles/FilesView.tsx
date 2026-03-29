import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";

// ── Language detection ────────────────────────────────────────────────────────

function detectLang(filePath?: string): string {
  const filename = filePath?.split("/").pop()?.toLowerCase() ?? "";
  if (/^dockerfile(\..+)?$/.test(filename)) return "dockerfile";
  const ext = filename.split(".").pop() ?? "";
  if (ext === "ts" || ext === "tsx" || ext === "mts" || ext === "cts") return "typescript";
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") return "javascript";
  if (ext === "css") return "css";
  if (ext === "scss" || ext === "sass") return "scss";
  if (ext === "less") return "less";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "json" || ext === "jsonc") return "json";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "rs") return "rust";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "sh" || ext === "bash" || ext === "zsh") return "shell";
  if (ext === "sql") return "sql";
  if (ext === "xml" || ext === "svg") return "xml";
  if (ext === "cpp" || ext === "cc") return "cpp";
  if (ext === "c") return "c";
  if (ext === "cs") return "csharp";
  if (ext === "java") return "java";
  if (ext === "kt" || ext === "kts") return "kotlin";
  if (ext === "swift") return "swift";
  if (ext === "rb") return "ruby";
  if (ext === "php") return "php";
  if (ext === "vue" || ext === "svelte") return "html";
  if (ext === "toml") return "ini";
  return "plaintext";
}

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif", "svg", "tiff", "tif",
]);

function isImageFile(fp: string): boolean {
  return IMAGE_EXTS.has(fp.split(".").pop()?.toLowerCase() ?? "");
}

// ── FilesView ──────────────────────────────────────────────────────────────────

interface FilesViewProps {
  tileId: string;
  filePath?: string;
  readOnly?: boolean;
}

export function FilesView({ tileId, filePath, readOnly }: FilesViewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  const currentFile = filePath ?? null;

  // Load file content
  useEffect(() => {
    if (!currentFile || isImageFile(currentFile)) {
      setContent(null);
      setLoadError(null);
      return;
    }
    setContent(null);
    setLoadError(null);
    window.electron.fs
      .readFile(currentFile)
      .then((c) => setContent(c))
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to read file"));
  }, [currentFile]);

  const dispatchReveal = useCallback((fp: string) => {
    window.dispatchEvent(
      new CustomEvent("volt:reveal-file", { detail: { filePath: fp } }),
    );
  }, []);

  // Reveal when this tile is focused (user clicks back on it)
  useEffect(() => {
    const handler = (e: Event) => {
      const { tileId: focused } = (e as CustomEvent).detail as { tileId: string };
      if (focused === tileId && currentFile) dispatchReveal(currentFile);
    };
    window.addEventListener("volt:focus-tile", handler);
    return () => window.removeEventListener("volt:focus-tile", handler);
  }, [tileId, currentFile, dispatchReveal]);

  const handleCopyPath = useCallback(() => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [currentFile]);

  const handleOpenInFinder = useCallback(() => {
    if (!currentFile) return;
    window.electron.shell.showItem(currentFile);
  }, [currentFile]);

  const handleCopyImage = useCallback(async () => {
    if (!currentFile) return;
    try {
      const binary = await window.electron.fs.readBinary(currentFile);
      // binary is a base64 string from readBinary
      const ext = currentFile.split(".").pop()?.toLowerCase() ?? "png";
      const mimeMap: Record<string, string> = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
        gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
        bmp: "image/bmp", ico: "image/x-icon",
      };
      const mime = mimeMap[ext] ?? "image/png";
      const bytes = Uint8Array.from(atob(binary), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mime });
      await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: copy path
      handleCopyPath();
    }
  }, [currentFile, handleCopyPath]);

  const handleSave = useCallback(async () => {
    if (readOnly || !currentFile || !editorRef.current) return;
    const value = editorRef.current.getValue();
    setSaving(true);
    try {
      await window.electron.fs.writeFile(currentFile, value);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  }, [readOnly, currentFile]);

  // Command+S listener
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly, handleSave]);

  const lang = detectLang(currentFile ?? undefined);
  const showImage = currentFile ? isImageFile(currentFile) : false;
  const filename = currentFile?.split("/").pop() ?? "";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      {currentFile && (
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#141416] px-3 py-1">
          <span
            className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/40"
            title={currentFile}
          >
            {filename}
            {readOnly && (
              <span className="ml-2 rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/20 border border-white/[0.05]">
                Read-only
              </span>
            )}
            {saving && (
              <span className="ml-2 animate-pulse text-[9px] text-white/30">Saving...</span>
            )}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Copy */}
            <button
              className="flex h-5 w-5 items-center justify-center rounded border-none bg-transparent text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
              onClick={showImage ? handleCopyImage : handleCopyPath}
              title={showImage ? "Copy image" : "Copy path"}
            >
              {copied ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            {/* Open in Finder */}
            <button
              className="flex h-5 w-5 items-center justify-center rounded border-none bg-transparent text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
              onClick={handleOpenInFinder}
              title="Reveal in Finder"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
        {!currentFile ? (
          <div className="flex h-full items-center justify-center text-[13px] text-white/20 select-none">
            No file selected
          </div>
        ) : showImage ? (
          <div className="flex h-full overflow-auto items-center justify-center p-4">
            <img
              src={`volt-file://${currentFile.split("/").map(encodeURIComponent).join("/")}`}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: "auto" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-[13px] text-red-400/70">
            {loadError}
          </div>
        ) : content === null ? (
          <div className="flex h-full items-center justify-center text-[13px] text-white/20 select-none">
            Loading…
          </div>
        ) : (
          // onWheel stopPropagation prevents the d3-zoom canvas handler from
          // intercepting wheel events, allowing Monaco to scroll normally inside tiles.
          <div className="h-full w-full" onWheel={(e) => e.stopPropagation()}>
            <Editor
              height="100%"
              value={content}
              language={lang}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                readOnly: !!readOnly,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                  alwaysConsumeMouseWheel: true,
                },
                mouseWheelScrollSensitivity: 1,
                smoothScrolling: true,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default FilesView;
