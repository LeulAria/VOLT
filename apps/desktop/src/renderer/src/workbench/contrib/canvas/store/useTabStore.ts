import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabType = "canvas" | "git-diff" | "file" | "voltcode";
export type StatusChar = "A" | "M" | "D" | "R" | "U" | "?";

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  // git-diff specific
  workspacePath?: string;
  filePath?: string;
  cached?: boolean;
  statusChar?: StatusChar;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string;
  reorderTabs(tabs: Tab[]): void;
  openDiffTab(params: {
    workspacePath: string;
    filePath: string;
    cached: boolean;
    statusChar: StatusChar;
  }): void;
  openFileTab(params: { filePath: string; title: string }): void;
  openVoltCodeTab(): void;
  closeTab(id: string): void;
  closeAllNonCanvasTabs(): void;
  setActiveTab(id: string): void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const CANVAS_TAB: Tab = { id: "canvas", type: "canvas", title: "Canvas" };

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [CANVAS_TAB],
  activeTabId: "canvas",

  reorderTabs(tabs) {
    set({ tabs });
  },

  openDiffTab({ workspacePath, filePath, cached, statusChar }) {
    const { tabs } = get();
    // Deduplicate: reuse existing tab for the same file+cached combo
    const existingId = `diff:${workspacePath}:${filePath}:${cached}`;
    const exists = tabs.find((t) => t.id === existingId);
    if (exists) {
      set({ activeTabId: existingId });
      return;
    }
    const fileName = filePath.split("/").pop() ?? filePath;
    const newTab: Tab = {
      id: existingId,
      type: "git-diff",
      title: fileName,
      workspacePath,
      filePath,
      cached,
      statusChar,
    };
    set({ tabs: [...tabs, newTab], activeTabId: existingId });
  },

  openFileTab({ filePath, title }) {
    const { tabs } = get();
    const id = `file:${filePath}`;
    const exists = tabs.find((t) => t.id === id);
    if (exists) {
      set({ activeTabId: id });
      return;
    }
    const newTab: Tab = { id, type: "file", title, filePath };
    set({ tabs: [...tabs, newTab], activeTabId: id });
  },

  openVoltCodeTab() {
    const { tabs } = get();
    const id = "voltcode";
    const exists = tabs.find((t) => t.id === id);
    if (exists) {
      set({ activeTabId: id });
      return;
    }
    const newTab: Tab = { id, type: "voltcode", title: "Volt Code" };
    set({ tabs: [...tabs, newTab], activeTabId: id });
  },

  closeAllNonCanvasTabs() {
    set({ tabs: [CANVAS_TAB], activeTabId: "canvas" });
  },

  closeTab(id) {
    if (id === "canvas") return; // canvas tab is permanent
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const next = tabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      // Activate the tab to the left, or canvas if none
      nextActive = next[Math.max(0, idx - 1)]?.id ?? "canvas";
    }
    set({ tabs: next, activeTabId: nextActive });
  },

  setActiveTab(id) {
    set({ activeTabId: id });
  },
}));
