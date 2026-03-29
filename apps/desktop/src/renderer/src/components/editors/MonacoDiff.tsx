import { useEffect, useState, useRef } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { gitApi } from "../../workbench/contrib/source-control/types";
import type { Tab } from "../../workbench/contrib/canvas/store/useTabStore";
import { isImageFile } from "./ImagePreview";

interface MonacoDiffProps {
  tab: Tab;
}

function detectLang(filePath?: string): string {
  const ext = filePath?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx" || ext === "mts" || ext === "cts") return "typescript";
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") return "javascript";
  if (ext === "css") return "css";
  if (ext === "scss" || ext === "sass") return "scss";
  if (ext === "less") return "less";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "json" || ext === "jsonc") return "json";
  if (ext === "md" || ext === "mdx") return "markdown";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "rs") return "rust";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "sh" || ext === "bash" || ext === "zsh") return "shell";
  if (ext === "sql") return "sql";
  if (ext === "xml") return "xml";
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

// ── Image diff view ──────────────────────────────────────────────────────────

function ImageDiffView({ tab }: { tab: Tab }) {
  const [src, setSrc] = useState<string | null>(null);
  const filePath = tab.workspacePath && tab.filePath
    ? `${tab.workspacePath}/${tab.filePath}`
    : (tab.filePath ?? "");

  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;
    (window.electron as any).image
      .load(filePath)
      .then((result: { url: string }) => { if (!cancelled) setSrc(result.url); })
      .catch(() => {
        const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
        const mimes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml", ico: "image/x-icon" };
        window.electron.fs
          .readBinary(filePath)
          .then((b64: string) => { if (!cancelled) setSrc(`data:${mimes[ext] ?? "image/png"};base64,${b64}`); })
          .catch(() => {});
      });
    return () => { cancelled = true; };
  }, [filePath]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111113", overflow: "hidden" }}>
      <div style={{ padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>
        {tab.filePath} — binary image file
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 40, backgroundImage: ["linear-gradient(45deg,#1a1a1f 25%,transparent 25%)", "linear-gradient(-45deg,#1a1a1f 25%,transparent 25%)", "linear-gradient(45deg,transparent 75%,#1a1a1f 75%)", "linear-gradient(-45deg,transparent 75%,#1a1a1f 75%)"].join(","), backgroundSize: "16px 16px", backgroundPosition: "0 0,0 8px,8px -8px,-8px 0px", backgroundColor: "#131316" }}>
        {src ? (
          <img src={src} alt={tab.title} draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4, boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }} />
        ) : (
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "ui-monospace, monospace" }}>Loading…</span>
        )}
      </div>
    </div>
  );
}

// ── MonacoDiff ────────────────────────────────────────────────────────────────

export function MonacoDiff({ tab }: MonacoDiffProps) {
  const [original, setOriginal] = useState<string>("");
  const [modified, setModified] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sideBySide, setSideBySide] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setSideBySide(w >= 700);
    });
    ro.observe(el);
    setSideBySide(el.clientWidth >= 700);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!tab.workspacePath || !tab.filePath) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const { workspacePath, filePath, cached } = tab;
        if (!workspacePath || !filePath) return;

        let orig = "";
        let mod = "";

        if (cached) {
          // staged diff: original = HEAD, modified = index
          try {
            orig = await gitApi.showFile(workspacePath, "HEAD", filePath);
          } catch {
            orig = "";
          }
          try {
            mod = await gitApi.showFile(workspacePath, "", filePath);
          } catch {
            mod = "";
          }
        } else {
          // unstaged diff: original = HEAD, modified = working tree file
          try {
            orig = await gitApi.showFile(workspacePath, "HEAD", filePath);
          } catch {
            orig = "";
          }
          try {
            mod = await window.electron.fs.readFile(`${workspacePath}/${filePath}`);
          } catch {
            mod = "";
          }
        }

        if (!cancelled) {
          setOriginal(orig);
          setModified(mod);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load diff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab.workspacePath, tab.filePath, tab.cached]);

  // Binary image files can't be diffed as text — show preview instead
  if (isImageFile(tab.filePath)) {
    return <ImageDiffView tab={tab} />;
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-white/40">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        Loading diff…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <DiffEditor
        key={tab.id}
        height="100%"
        keepCurrentOriginalModel
        keepCurrentModifiedModel
        language={detectLang(tab.filePath)}
        original={original}
        modified={modified}
        theme="volt-dark"
        options={{
          renderSideBySide: sideBySide,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: '"Geist Mono", "Cascadia Code", "JetBrains Mono", monospace',
          fontSize: 13,
          lineHeight: 22,
          letterSpacing: 0.3,
          lineNumbers: "on",
          readOnly: true,
          wordWrap: "off",
          padding: { top: 12, bottom: 12 },
          smoothScrolling: true,
          cursorBlinking: "blink",
          cursorSmoothCaretAnimation: "off",
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            useShadows: false,
          },
          renderWhitespace: "none",
        }}
      />
    </div>
  );
}
