import uFuzzy from "@leeoniya/ufuzzy";
import type { PaletteFile } from "./types";

// Single shared instance — uFuzzy is designed to be reused
const uf = new uFuzzy({ intraMode: 1, intraSub: 1, intraDel: 1, intraIns: 1 });
// Looser instance used as fallback (allows more intra-character substitutions)
// Looser instance: allows more intra-character insertions for near-miss matching
const ufLoose = new uFuzzy({ intraMode: 1, intraSub: 1, intraDel: 1, intraIns: 1 });

// ─── Pre-processing ───────────────────────────────────────────────────────────

/**
 * Decompose camelCase/PascalCase into space-separated lowercase words.
 * "FilesView" → "files view"
 * "useFileIndex" → "use file index"
 */
function decompose(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_./\\]/g, " ")
    .toLowerCase();
}

/** Build a searchable haystack item that combines original + decomposed forms */
function hay(file: PaletteFile): string {
  const decomposedRel = decompose(file.rel);
  const decomposedBase = decompose(file.basename);
  // Combine original rel, decomposed rel, and decomposed basename for maximum coverage
  return `${file.rel} ${decomposedRel} ${decomposedBase}`;
}

// ─── Core fuzzy search ────────────────────────────────────────────────────────

function runUFuzzy(
  instance: uFuzzy,
  files: PaletteFile[],
  haystack: string[],
  needle: string,
): PaletteFile[] {
  const [idxs, , order] = instance.search(haystack, needle);
  if (!idxs || idxs.length === 0) return [];
  if (order && order.length > 0) return order.map((i) => files[idxs[i]!]!).filter(Boolean);
  return idxs.map((i) => files[i]!).filter(Boolean);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search files against a query string. Three modes auto-detected:
 *
 *   /pattern/flags  → RegExp match (full power)
 *   *.ts, **\/*.tsx  → Glob match (VS Code style)
 *   anything else   → Intelligent fuzzy with:
 *                      • CamelCase decomposition ("FilesView" ↔ "files view")
 *                      • Multi-word AND search (all words must appear)
 *                      • Basename-priority ranking
 *                      • Loose fallback when strict yields nothing
 */
export function searchFiles(files: PaletteFile[], query: string): PaletteFile[] {
  const q = query.trim();
  if (!q) return files;

  // ── Regex mode: /pattern/ or /pattern/flags ───────────────────────────────
  if (q.startsWith("/") && q.length > 2) {
    const endSlash = q.lastIndexOf("/");
    if (endSlash > 0) {
      const pattern = q.slice(1, endSlash);
      const flags = q.slice(endSlash + 1).replace(/[^gimsuy]/g, "") || "i";
      try {
        const re = new RegExp(pattern, flags);
        return files.filter((f) => re.test(f.rel) || re.test(f.basename));
      } catch {
        return [];
      }
    }
  }

  // ── Glob mode: *.ts, **/*.tsx, src/**/*.test.ts ───────────────────────────
  if (q.includes("*")) {
    let pattern = "";
    for (let i = 0; i < q.length; i++) {
      const ch = q[i]!;
      if (ch === "*" && q[i + 1] === "*") {
        pattern += ".*";
        i++;
      } else if (ch === "*") {
        pattern += "[^/]*";
      } else if (/[.+^${}()|[\]\\]/.test(ch)) {
        pattern += `\\${ch}`;
      } else {
        pattern += ch;
      }
    }
    try {
      const re = new RegExp(pattern, "i");
      return files.filter((f) => re.test(f.basename) || re.test(f.rel));
    } catch {
      return files;
    }
  }

  // ── Fuzzy mode ────────────────────────────────────────────────────────────
  const haystack = files.map(hay);
  const words = q.split(/\s+/).filter(Boolean);

  // Multi-word: try AND search first (all words must appear somewhere)
  if (words.length > 1) {
    let andResults = files;
    for (const word of words) {
      const wordHay = andResults.map(hay);
      const strict = runUFuzzy(uf, andResults, wordHay, word);
      if (strict.length > 0) {
        andResults = strict;
      } else {
        // Try loose for this word
        const loose = runUFuzzy(ufLoose, andResults, wordHay, word);
        if (loose.length > 0) andResults = loose;
        else { andResults = []; break; }
      }
    }
    if (andResults.length > 0) return rankByBasename(andResults, q);

    // Fallback: OR — collect all files that match any word, rank by match count
    const scoreMap = new Map<string, number>();
    for (const word of words) {
      for (const f of runUFuzzy(uf, files, haystack, word)) {
        scoreMap.set(f.id, (scoreMap.get(f.id) ?? 0) + 1);
      }
      if (scoreMap.size === 0) {
        for (const f of runUFuzzy(ufLoose, files, haystack, word)) {
          scoreMap.set(f.id, (scoreMap.get(f.id) ?? 0) + 0.5);
        }
      }
    }
    if (scoreMap.size > 0) {
      return files
        .filter((f) => scoreMap.has(f.id))
        .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
    }
    return [];
  }

  // Single-word: strict first, then loose fallback
  const strict = runUFuzzy(uf, files, haystack, q);
  if (strict.length > 0) return rankByBasename(strict, q);

  const loose = runUFuzzy(ufLoose, files, haystack, q);
  return rankByBasename(loose, q);
}

/** Lift results whose basename matches to the top */
function rankByBasename(results: PaletteFile[], query: string): PaletteFile[] {
  const lq = query.toLowerCase().replace(/\s+/g, "");
  return [...results].sort((a, b) => {
    const aBase = a.basename.toLowerCase().includes(lq) ? 0 : 1;
    const bBase = b.basename.toLowerCase().includes(lq) ? 0 : 1;
    return aBase - bBase;
  });
}
