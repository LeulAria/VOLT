import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tab } from "../../workbench/contrib/canvas/store/useTabStore";

interface MarkdownPreviewProps {
  tab: Tab;
}

export function MarkdownPreview({ tab }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tab.filePath) return;
    let cancelled = false;
    setContent(null);
    setError(null);
    window.electron.fs
      .readFile(tab.filePath)
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to read file");
      });
    return () => {
      cancelled = true;
    };
  }, [tab.filePath]);

  if (error)
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-red-400">
        {error}
      </div>
    );
  if (content === null)
    return (
      <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-white/40">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        {t("monacoFile.loading")}
      </div>
    );

  return (
    <div
      className="h-full cursor-text select-text overflow-auto px-10 py-8"
      style={{
        background: "#16161666",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        userSelect: "text",
      }}
    >
      <article className="prose-volt mx-auto max-w-3xl select-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>

      <style>{`
        .prose-volt { color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; line-height: 1.75; user-select: text; cursor: text; }
        .prose-volt h1,.prose-volt h2,.prose-volt h3,.prose-volt h4 { color: #f1f5f9; font-weight: 600; margin: 1.5em 0 0.6em; line-height: 1.3; }
        .prose-volt h1 { font-size: 2em; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4em; }
        .prose-volt h2 { font-size: 1.5em; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.3em; }
        .prose-volt h3 { font-size: 1.2em; }
        .prose-volt p { margin: 0.8em 0; }
        .prose-volt a { color: #818cf8; text-decoration: underline; text-underline-offset: 3px; }
        .prose-volt a:hover { color: #c084fc; }
        .prose-volt code { background: rgba(255,255,255,0.08); color: #4ade80; font-family: "Geist Mono", monospace; font-size: 0.875em; padding: 0.15em 0.4em; border-radius: 4px; }
        .prose-volt pre { background: #0d0d0f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1em 1.2em; overflow-x: auto; margin: 1.2em 0; }
        .prose-volt pre code { background: none; color: #ededed; padding: 0; font-size: 0.9em; }
        .prose-volt blockquote { border-left: 3px solid rgba(129,140,248,0.5); margin: 1em 0; padding: 0.4em 1em; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.03); border-radius: 0 6px 6px 0; }
        .prose-volt blockquote p { margin: 0.2em 0; }
        .prose-volt ul,.prose-volt ol { padding-left: 1.5em; margin: 0.6em 0; }
        .prose-volt li { margin: 0.25em 0; }
        .prose-volt table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
        .prose-volt th { background: rgba(255,255,255,0.06); color: #f1f5f9; font-weight: 600; padding: 0.5em 0.8em; text-align: left; border: 1px solid rgba(255,255,255,0.1); }
        .prose-volt td { padding: 0.45em 0.8em; border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); }
        .prose-volt tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .prose-volt hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 2em 0; }
        .prose-volt img { max-width: 100%; border-radius: 6px; }
        .prose-volt strong { color: #f1f5f9; }
        .prose-volt em { color: rgba(255,255,255,0.8); }
        input[type="checkbox"] { margin-right: 0.4em; }
      `}</style>
    </div>
  );
}
