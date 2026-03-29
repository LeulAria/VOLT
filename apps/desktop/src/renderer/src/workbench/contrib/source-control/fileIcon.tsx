import { FileText } from "@phosphor-icons/react";
import type { ReactNode } from "react";

// Render an icon from the public/icons/ asset folder
function img(name: string, size: number): ReactNode {
  return (
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt=""
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

// Extension → public icon name
const EXT_ICON: Record<string, string> = {
  // TypeScript
  ".ts": "typescript",
  ".tsx": "react_ts",
  ".mts": "typescript",
  ".cts": "typescript",
  ".d.ts": "typescript-def",
  // JavaScript
  ".js": "javascript",
  ".jsx": "react",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".map": "javascript-map",
  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "sass",
  ".sass": "sass",
  ".less": "less",
  ".styl": "stylus",
  ".vue": "vue",
  ".svelte": "svelte",
  ".svg": "svg",
  // Data / config
  ".json": "json",
  ".jsonc": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".ini": "settings",
  ".env": "settings",
  ".xml": "xml",
  ".csv": "table",
  ".sql": "database",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "proto",
  // Markdown / docs
  ".md": "markdown",
  ".mdx": "mdx",
  ".mdoc": "markdoc",
  ".rst": "document",
  ".txt": "document",
  ".pdf": "pdf",
  ".doc": "word",
  ".docx": "word",
  ".xls": "table",
  ".xlsx": "table",
  ".ppt": "powerpoint",
  ".pptx": "powerpoint",
  // Images
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".ico": "favicon",
  ".bmp": "image",
  ".tiff": "image",
  ".avif": "image",
  // Audio / video
  ".mp3": "audio",
  ".wav": "audio",
  ".ogg": "audio",
  ".flac": "audio",
  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",
  ".mkv": "video",
  // Archives
  ".zip": "zip",
  ".tar": "zip",
  ".gz": "zip",
  ".7z": "zip",
  ".rar": "zip",
  ".bz2": "zip",
  // Scripts
  ".sh": "console",
  ".bash": "console",
  ".zsh": "console",
  ".fish": "console",
  ".ps1": "powershell",
  ".bat": "command",
  ".cmd": "command",
  // Languages
  ".py": "python",
  ".pyw": "python",
  ".rb": "ruby",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "h",
  ".cpp": "cpp",
  ".hpp": "hpp",
  ".cc": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".lua": "lua",
  ".r": "r",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hrl": "erlang",
  ".hs": "haskell",
  ".lhs": "haskell",
  ".elm": "elm",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".scala": "scala",
  ".groovy": "groovy",
  ".dart": "dart",
  ".nim": "nim",
  ".zig": "zig",
  ".jl": "julia",
  ".ml": "ocaml",
  ".mli": "ocaml",
  ".f": "fortran",
  ".f90": "fortran",
  ".cob": "cobol",
  ".tcl": "tcl",
  ".vb": "visualstudio",
  ".fs": "fsharp",
  ".fsi": "fsharp",
  ".fsx": "fsharp",
  ".sol": "solidity",
  ".cairo": "cairo",
  ".vy": "vlang",
  ".astro": "astro",
  ".njk": "nunjucks",
  ".hbs": "handlebars",
  ".ejs": "ejs",
  ".liquid": "liquid",
  ".pug": "pug",
  ".haml": "haml",
  ".twig": "twig",
  ".wasm": "webassembly",
  ".tf": "terraform",
  ".tfvars": "terraform",
  ".bicep": "bicep",
  ".lock": "lock",
  ".log": "log",
  ".diff": "diff",
  ".patch": "diff",
};

// Exact filename → public icon name
const FILENAME_ICON: Record<string, string> = {
  // Docker
  Dockerfile: "docker",
  dockerfile: "docker",
  "docker-compose.yml": "docker",
  "docker-compose.yaml": "docker",
  "docker-compose.dev.yml": "docker",
  ".dockerignore": "docker",
  // Git
  ".gitignore": "git",
  ".gitattributes": "git",
  ".gitmodules": "git",
  ".gitkeep": "git",
  // Node / package managers
  "package.json": "nodejs",
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "pnpm-lock.yaml": "pnpm",
  "bun.lockb": "bun",
  "bun.lock": "bun",
  ".npmrc": "npm",
  ".nvmrc": "nodejs",
  ".node-version": "nodejs",
  // TypeScript config
  "tsconfig.json": "tsconfig",
  "tsconfig.base.json": "tsconfig",
  "jsconfig.json": "jsconfig",
  // Build / bundlers
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
  "vite.config.mts": "vite",
  "webpack.config.js": "webpack",
  "webpack.config.ts": "webpack",
  "rollup.config.js": "rollup",
  "rollup.config.ts": "rollup",
  "esbuild.config.js": "esbuild",
  "turbo.json": "turborepo",
  // Linters / formatters
  ".eslintrc": "eslint",
  ".eslintrc.js": "eslint",
  ".eslintrc.ts": "eslint",
  ".eslintrc.json": "eslint",
  ".eslintrc.cjs": "eslint",
  ".eslintignore": "eslint",
  ".prettierrc": "prettier",
  ".prettierrc.js": "prettier",
  ".prettierrc.json": "prettier",
  ".prettierignore": "prettier",
  "biome.json": "biome",
  ".stylelintrc": "stylelint",
  // Testing
  "jest.config.js": "jest",
  "jest.config.ts": "jest",
  "vitest.config.ts": "vitest",
  "vitest.config.js": "vitest",
  "playwright.config.ts": "playwright",
  "cypress.config.ts": "cypress",
  // Frameworks / meta
  "next.config.js": "next",
  "next.config.ts": "next",
  "next.config.mjs": "next",
  "nuxt.config.ts": "nuxt",
  "nuxt.config.js": "nuxt",
  "astro.config.mjs": "astro-config",
  "astro.config.ts": "astro-config",
  "svelte.config.js": "svelte",
  "tailwind.config.js": "tailwindcss",
  "tailwind.config.ts": "tailwindcss",
  "tailwind.config.cjs": "tailwindcss",
  "postcss.config.js": "postcss",
  "postcss.config.cjs": "postcss",
  // Env / CI
  ".env": "settings",
  ".env.local": "settings",
  ".env.development": "settings",
  ".env.production": "settings",
  ".editorconfig": "editorconfig",
  ".github": "github-sponsors",
  Makefile: "makefile",
  LICENSE: "license",
  "LICENSE.md": "license",
  "CHANGELOG.md": "changelog",
  "README.md": "readme",
  "readme.md": "readme",
  "CONTRIBUTING.md": "contributing",
  "CODE_OF_CONDUCT.md": "conduct",
  // Prisma / DB
  "schema.prisma": "prisma",
  "drizzle.config.ts": "drizzle",
  // CI
  ".travis.yml": "travis",
  Jenkinsfile: "jenkins",
  // Other
  ".htaccess": "apache",
};

export function getFileIconNode(filename: string, size = 13): ReactNode {
  const basename = filename.split("/").pop() ?? filename;

  // Exact filename match first
  const named = FILENAME_ICON[basename];
  if (named) return img(named, size);

  // Double extension (e.g. .d.ts)
  const dblDot = basename.indexOf(".", 1);
  if (dblDot >= 0) {
    const dblExt = basename.slice(dblDot).toLowerCase();
    if (EXT_ICON[dblExt]) return img(EXT_ICON[dblExt]!, size);
  }

  // Single extension
  const dotIdx = basename.lastIndexOf(".");
  if (dotIdx >= 0) {
    const ext = basename.slice(dotIdx).toLowerCase();
    if (EXT_ICON[ext]) return img(EXT_ICON[ext]!, size);
  }

  return <FileText size={size} color="rgba(255,255,255,0.4)" />;
}
