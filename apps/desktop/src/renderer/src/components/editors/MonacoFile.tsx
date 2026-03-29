import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import type { Tab } from "../../workbench/contrib/canvas/store/useTabStore";
import { useTabStore } from "../../workbench/contrib/canvas/store/useTabStore";

interface MonacoFileProps {
  tab: Tab;
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function resolvePath(currentFile: string, importPath: string): string {
  const parts = currentFile.split("/");
  parts.pop();
  for (const seg of importPath.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

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

// ── Component ─────────────────────────────────────────────────────────────────

export function MonacoFile({ tab }: MonacoFileProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<string>("");
  const openFileTab = useTabStore((s) => s.openFileTab);

  useEffect(() => {
    if (!tab.filePath) return;
    let cancelled = false;
    setContent(null);
    setError(null);
    setIsDirty(false);
    window.electron.fs
      .readFile(tab.filePath)
      .then((c) => {
        if (!cancelled) {
          setContent(c);
          contentRef.current = c;
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to read file");
      });
    return () => {
      cancelled = true;
    };
  }, [tab.filePath]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!tab.filePath || !isDirty || saving) return;
    setSaving(true);
    try {
      await window.electron.fs.writeFile(tab.filePath, contentRef.current);
      setIsDirty(false);
      setContent(contentRef.current);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [tab.filePath, isDirty, saving]);

  // ── Cmd+Click → navigate imports ────────────────────────────────────────────
  const handleEditorMount = useCallback(
    (editor: MonacoNS.editor.IStandaloneCodeEditor, monaco: typeof MonacoNS) => {
      // Cmd+S to save
      editor.addCommand(
        // monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
        2048 | 49, // CtrlCmd=2048, KeyS=49
        () => {
          save();
        },
      );

      // Cmd+L → copy file path with selected line range to clipboard
      editor.addAction({
        id: "volt-copy-path-with-lines",
        label: "Copy File Path with Line Numbers",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1,
        run: (ed) => {
          if (!tab.filePath) return;
          const sel = ed.getSelection();
          if (!sel) {
            navigator.clipboard.writeText(tab.filePath).catch(() => {});
            return;
          }
          const { startLineNumber: s, endLineNumber: e } = sel;
          const ref = s === e ? `${tab.filePath}:${s}` : `${tab.filePath}:${s}-${e}`;
          navigator.clipboard.writeText(ref).catch(() => {});
        },
      });

      // Right-click: Add to Chat History
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
              detail: { text: selectedText, filePath: tab.filePath },
            }),
          );
        },
      });

      // Intercept peek-widget navigation: when model changes to a different file, open new tab
      let preventLoop = false;
      editor.onDidChangeModel(() => {
        if (preventLoop) return;
        const model = editor.getModel();
        if (!model || !tab.filePath) return;
        const newPath = model.uri.fsPath;
        const currentPath = tab.filePath;
        if (!newPath || newPath === currentPath) return;

        // Open the referenced file as a new tab
        openFileTab({ filePath: newPath, title: newPath.split("/").pop() ?? newPath });

        // Restore this editor back to the original file's model
        preventLoop = true;
        const originalUri = monaco.Uri.file(currentPath);
        const originalModel = monaco.editor.getModel(originalUri);
        if (originalModel) {
          editor.setModel(originalModel);
        }
        preventLoop = false;
      });

      editor.onMouseDown(async (e) => {
        if (!e.event.metaKey && !e.event.ctrlKey) return;
        const pos = e.target.position;
        if (!pos || !tab.filePath) return;
        const model = editor.getModel();
        if (!model) return;
        const line = model.getLineContent(pos.lineNumber);
        if (!/\b(?:from|import|require)\b/.test(line)) return;
        const col = pos.column - 1;
        let importPath: string | null = null;
        const strRe = /(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
        let m: RegExpExecArray | null;
        while ((m = strRe.exec(line)) !== null) {
          if (col >= m.index && col <= m.index + m[0].length) {
            importPath = m[1] ?? m[2] ?? null;
            break;
          }
        }
        if (!importPath || (!importPath.startsWith(".") && !importPath.startsWith("/"))) return;
        e.event.preventDefault();
        const base = resolvePath(tab.filePath!, importPath);
        for (const ext of [
          "",
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          "/index.ts",
          "/index.tsx",
          "/index.js",
          "/index.jsx",
        ]) {
          const fullPath = base + ext;
          try {
            await window.electron.fs.readFile(fullPath);
            openFileTab({ filePath: fullPath, title: fullPath.split("/").pop() ?? fullPath });
            return;
          } catch {
            /* try next */
          }
        }
      });
    },
    [tab.filePath, openFileTab, save],
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-red-400">
        {error}
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-white/40">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        {t("monacoFile.loading")}
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      style={
        { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } as React.CSSProperties
      }
    >
      {/* Dirty indicator */}
      {isDirty && (
        <div className="absolute right-3 top-2 z-10 flex items-center gap-1.5 rounded-[5px] bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/40">
          {saving ? t("monacoFile.saving") : t("monacoFile.unsaved")}
        </div>
      )}

      <Editor
        height="100%"
        language={detectLang(tab.filePath)}
        value={content}
        theme="volt-dark"
        onMount={handleEditorMount}
        onChange={(val) => {
          if (val !== undefined) {
            contentRef.current = val;
            setIsDirty(val !== content);
          }
        }}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: '"Geist Mono", "Cascadia Code", "JetBrains Mono", monospace',
          fontSize: 13,
          lineHeight: 22,
          letterSpacing: 0.3,
          lineNumbers: "on",
          readOnly: false,
          wordWrap: "off",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorBlinking: "blink",
          cursorSmoothCaretAnimation: "off",
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            useShadows: false,
          },
          definitionLinkOpensInPeek: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          renderWhitespace: "none",
          occurrencesHighlight: "singleFile",
          tabSize: 2,
          insertSpaces: true,
        }}
      />
    </div>
  );
}
