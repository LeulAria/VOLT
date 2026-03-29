import { create } from "zustand";

interface WorkspaceStore {
  activeWorkspacePath: string | null;
  setActiveWorkspacePath: (path: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  activeWorkspacePath: null,
  setActiveWorkspacePath: (path) => set({ activeWorkspacePath: path }),
}));
