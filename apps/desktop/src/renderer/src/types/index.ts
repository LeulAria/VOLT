// ─── Tile Types ────────────────────────────────────────────────────────────────

/** The type of content rendered inside a canvas tile */
export type TileType = "default" | "terminal" | "browser" | "file" | "voltcode";

// ─── Tab Types ─────────────────────────────────────────────────────────────────

/** The type of a tab in the tab bar */
export type TabType = "canvas" | "git-diff" | "file" | "voltcode";

/** Git file status characters */
export type StatusChar = "A" | "M" | "D" | "R" | "U" | "?";

// ─── Git View Mode ─────────────────────────────────────────────────────────────

/** View mode for the source control panel file list */
export type ViewMode = "tree" | "flat";

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light";
