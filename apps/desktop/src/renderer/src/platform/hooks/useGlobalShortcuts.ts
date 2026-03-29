import { useEffect } from "react";
import { useTileContext } from "../context/TileContext";

export interface GlobalShortcutsCallbacks {
  onNewBrowser: () => void;
  onNewTerminal: () => void;
  onNewTerminalInDir: (dir: string) => void;
  onNewBrowserWithUrl: (url: string) => void;
  onCloseActiveTile?: () => void;
}

export function useGlobalShortcuts(callbacks: GlobalShortcutsCallbacks) {
  const { activeTile } = useTileContext();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // ─── Cmd+B: open browser tile ─────────────────────────────────
      if (meta && e.key === "b") {
        e.preventDefault();
        callbacks.onNewBrowser();
        return;
      }

      // ─── Cmd+X: close active terminal tile ───────────────────────────────
      if (meta && e.key === "x") {
        e.preventDefault();
        if (activeTile?.tileType === "terminal") {
          callbacks.onCloseActiveTile?.();
        }
        return;
      }

      // ─── Cmd+N or Cmd+D: new terminal/browser with active tile's state ───────────────
      if (meta && (e.key === "n" || e.key === "d")) {
        e.preventDefault();
        if (activeTile) {
          // Active tile exists: create new tile matching its type and state
          if (activeTile.tileType === "terminal") {
            // Get current working directory from active terminal
            const cwd = activeTile.getCurrentCwd?.() || "/";
            callbacks.onNewTerminalInDir(cwd);
          } else if (activeTile.tileType === "browser") {
            // Get current URL from active browser
            const url = activeTile.getCurrentUrl?.() || "https://www.google.com";
            callbacks.onNewBrowserWithUrl(url);
          } else {
            // Default: open new terminal
            callbacks.onNewTerminal();
          }
        } else {
          // Nothing active: open new terminal
          callbacks.onNewTerminal();
        }
        return;
      }
    };

    // Capture phase ensures we catch before tiles swallow events
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [activeTile, callbacks]);
}
