import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute("data-theme", theme);
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    { name: "volt-theme" },
  ),
);

export function initTheme() {
  const stored = localStorage.getItem("volt-theme");
  const theme: Theme = stored ? (JSON.parse(stored)?.state?.theme ?? "dark") : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  }
}
