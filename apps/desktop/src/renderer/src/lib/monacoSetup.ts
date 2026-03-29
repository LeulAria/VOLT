/**
 * Monaco Editor worker + loader setup.
 * Must be imported ONCE before any Monaco component renders.
 *
 * Using the locally-installed `monaco-editor` package avoids the CDN
 * fetch that @monaco-editor/react does by default (which is blocked by
 * Electron's Content-Security-Policy).
 */

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

// ── Workers ──────────────────────────────────────────────────────────────────

(window as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

// ── Point @monaco-editor/react at local package (no CDN) ─────────────────────

loader.config({ monaco });

// ── TypeScript language service — reduce startup overhead ────────────────────
// Access via the monaco namespace provided by the local package
const tsLang = (monaco as any).languages?.typescript;
if (tsLang) {
  tsLang.typescriptDefaults?.setEagerModelSync(false);
  tsLang.typescriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  tsLang.typescriptDefaults?.setCompilerOptions({
    target: tsLang.ScriptTarget?.ESNext,
    moduleResolution: tsLang.ModuleResolutionKind?.NodeJs,
    allowJs: true,
    allowNonTsExtensions: true,
    noEmit: true,
  });
  tsLang.javascriptDefaults?.setEagerModelSync(false);
  tsLang.javascriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
}

// ── Custom "volt-dark" theme ─────────────────────────────────────────────────
// Color palette derived from better-hub's dark code block theme.
//
// Foreground  #ededed  —  hsla(0,0%,93%,1)
// Comments    #6b7280  —  muted cool gray
// Strings     #4ade80  —  oklch(73.1% 0.2158 148.29)  green
// Keywords    #f87171  —  oklch(69.36% 0.2223 3.91)   red-pink
// Functions   #c084fc  —  oklch(69.87% 0.2037 309.51) purple
// Variables   #818cf8  —  oklch(71.7%  0.1648 250.79) indigo
// Types       #38bdf8  —  sky blue
// Numbers     #fb923c  —  orange
// Operators   #94a3b8  —  slate

monaco.editor.defineTheme("volt-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Comments — muted, italic
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "comment.line", foreground: "6b7280", fontStyle: "italic" },
    { token: "comment.block", foreground: "6b7280", fontStyle: "italic" },
    { token: "comment.doc", foreground: "6b7280", fontStyle: "italic" },

    // Strings — green
    { token: "string", foreground: "4ade80" },
    { token: "string.escape", foreground: "34d399" },
    { token: "string.quoted", foreground: "4ade80" },
    { token: "string.template", foreground: "4ade80" },

    // Keywords — light blueish-gray (if, for, const, import, return, …)
    { token: "keyword", foreground: "94a3b8" },
    { token: "keyword.control", foreground: "94a3b8" },
    { token: "keyword.operator", foreground: "94a3b8" },
    { token: "storage.type", foreground: "94a3b8" },
    { token: "storage.modifier", foreground: "94a3b8" },

    // Functions / methods — purple
    { token: "entity.name.function", foreground: "c084fc" },
    { token: "support.function", foreground: "c084fc" },

    // Types / classes — sky blue
    { token: "entity.name.type", foreground: "38bdf8" },
    { token: "entity.name.class", foreground: "38bdf8" },
    { token: "support.type", foreground: "38bdf8" },
    { token: "support.class", foreground: "38bdf8" },

    // Variables / properties — indigo
    { token: "variable", foreground: "818cf8" },
    { token: "variable.other", foreground: "818cf8" },
    { token: "variable.parameter", foreground: "a5b4fc" },
    { token: "entity.name.variable", foreground: "818cf8" },

    // Numbers — orange
    { token: "number", foreground: "fb923c" },
    { token: "constant.numeric", foreground: "fb923c" },

    // Regex — amber
    { token: "regexp", foreground: "fbbf24" },

    // Operators & delimiters — slate
    { token: "operator", foreground: "94a3b8" },
    { token: "delimiter", foreground: "94a3b8" },
    { token: "delimiter.bracket", foreground: "94a3b8" },
    { token: "delimiter.square", foreground: "94a3b8" },
    { token: "delimiter.parenthesis", foreground: "94a3b8" },

    // Decorators / annotations — amber
    { token: "annotation", foreground: "fbbf24" },

    // HTML/JSX tags — same green as strings
    { token: "tag", foreground: "4ade80" },
    { token: "tag.id", foreground: "4ade80" },
    { token: "tag.attribute.name", foreground: "818cf8" },
    { token: "tag.attribute.value", foreground: "4ade80" },
    { token: "metatag", foreground: "94a3b8" },

    // JSON keys — same green as string values (not blue)
    { token: "string.key.json", foreground: "ededed" },
    { token: "string.value.json", foreground: "4ade80" },

    // CSS
    { token: "attribute.name.css", foreground: "818cf8" },
    { token: "attribute.value.css", foreground: "4ade80" },
    { token: "property.name.css", foreground: "818cf8" },

    // Misc
    { token: "constant", foreground: "fb923c" },
    { token: "constant.language", foreground: "94a3b8" },
  ],
  colors: {
    // Editor surface
    "editor.background": "#16161666",
    "editor.foreground": "#ededed",

    // Line numbers
    "editorLineNumber.foreground": "#3f3f46",
    "editorLineNumber.activeForeground": "#ffffff",

    // Current line
    "editor.lineHighlightBackground": "#ffffff06",
    "editor.lineHighlightBorder": "#00000000",

    // Selection
    "editor.selectionBackground": "#6366f130",
    "editor.inactiveSelectionBackground": "#6366f118",
    "editor.selectionHighlightBackground": "#6366f118",

    // Word highlight
    "editor.wordHighlightBackground": "#818cf825",
    "editor.wordHighlightStrongBackground": "#818cf840",

    // Cursor
    "editorCursor.foreground": "#e2e8f0",
    "editorCursor.background": "#0d0d0f",

    // Gutter
    "editorGutter.background": "#16161666",
    "editorGutter.modifiedBackground": "#f87171",
    "editorGutter.addedBackground": "#4ade80",
    "editorGutter.deletedBackground": "#f87171",

    // Bracket matching
    "editorBracketMatch.background": "#6366f130",
    "editorBracketMatch.border": "#6366f160",

    // Diff editor
    "diffEditor.insertedTextBackground": "#4ade8016",
    "diffEditor.removedTextBackground": "#f8717116",
    "diffEditor.insertedLineBackground": "#4ade800a",
    "diffEditor.removedLineBackground": "#f871710a",
    "diffEditorGutter.insertedLineBackground": "#4ade8018",
    "diffEditorGutter.removedLineBackground": "#f8717118",

    // Scrollbars
    "scrollbarSlider.background": "#3f3f4650",
    "scrollbarSlider.hoverBackground": "#3f3f4680",
    "scrollbarSlider.activeBackground": "#3f3f46a0",
    "scrollbar.shadow": "#00000040",

    // Minimap
    "minimap.background": "#16161666",
    "minimap.selectionHighlight": "#6366f160",

    // Indent guides
    "editorIndentGuide.background1": "#3f3f4630",
    "editorIndentGuide.activeBackground1": "#3f3f4660",

    // Widgets (hover, find, suggest)
    "editorWidget.background": "#16161666",
    "editorWidget.border": "#3f3f46",
    "editorWidget.foreground": "#ededed",
    "editorHoverWidget.background": "#16161666",
    "editorHoverWidget.border": "#3f3f4650",
    "editorHoverWidget.foreground": "#ededed",
    "editorHoverWidget.statusBarBackground": "#16161666",
    "peekView.border": "#3f3f4650",
    "peekViewEditor.background": "#16161666",
    "peekViewEditor.matchHighlightBackground": "#6366f130",
    "peekViewResult.background": "#16161666",
    "peekViewResult.fileForeground": "#ededed",
    "peekViewResult.lineForeground": "#a1a1aa",
    "peekViewResult.matchHighlightBackground": "#6366f130",
    "peekViewResult.selectionBackground": "#3f3f4660",
    "peekViewResult.selectionForeground": "#ffffff",
    "peekViewTitle.background": "#16161666",
    "peekViewTitleLabel.foreground": "#ededed",
    "peekViewTitleDescription.foreground": "#a1a1aa",
    "editorSuggestWidget.background": "#16161666",
    "editorSuggestWidget.border": "#3f3f46",
    "editorSuggestWidget.foreground": "#ededed",
    "editorSuggestWidget.selectedBackground": "#3f3f46",
    "editorSuggestWidget.selectedForeground": "#ffffff",
    "editorSuggestWidget.highlightForeground": "#c084fc",
    "editorSuggestWidget.focusHighlightForeground": "#c084fc",

    // Input (find bar, etc.)
    "input.background": "#111113",
    "input.border": "#3f3f46",
    "input.foreground": "#ededed",
    "inputOption.activeBorder": "#6366f1",
    "inputOption.activeBackground": "#6366f130",

    // Error / warning squiggles
    "editorError.foreground": "#f87171",
    "editorWarning.foreground": "#fbbf24",
    "editorInfo.foreground": "#38bdf8",
  },
});

// ── Dockerfile language support ───────────────────────────────────────────────
monaco.languages.register({
  id: "dockerfile",
  extensions: [".dockerfile"],
  filenames: ["Dockerfile"],
  aliases: ["Dockerfile", "dockerfile"],
});

monaco.languages.setMonarchTokensProvider("dockerfile", {
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [
        /^(FROM|AS|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/\$\{[^}]+\}/, "variable"],
      [/\$\w+/, "variable"],
      [/[0-9]+/, "number"],
      [/--[\w-]+/, "attribute.name"],
    ],
  },
} as any);
