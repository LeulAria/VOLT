import { session, ipcMain, webContents } from "electron";
import Store from "electron-store";

// ── Persistence ──────────────────────────────────────────────────────────────

const store = new Store<{
  browserSessions: Array<{ id: string; partition: string; url: string; title: string }>;
}>({
  name: "volt-browser-sessions",
  defaults: { browserSessions: [] },
});

// Track which targets have devtools open so we can clean up
const openDevTools = new Map<string, { targetId: number; devtoolsId: number }>();

// Track debuggers specifically for side panel CDP features
const sidePanelDebuggers = new Map<string, Electron.WebContents>();

// Cache mapping of webContents.id to CDP target ID to avoid attaching debugger
// more than once, which kicks any active CDP WebSocket clients!
const cdpTargetCache = new Map<number, string>();

// ── IPC Registration ─────────────────────────────────────────────────────────

export function registerBrowserHandlers(): void {
  // Pre-warm saved session partitions on startup
  const saved = store.get("browserSessions", []);
  for (const s of saved) {
    session.fromPartition(s.partition);
  }

  // Intercept headers for the default session to allow iframing the devtools
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    if (details.url.includes("127.0.0.1:8315") || details.url.includes("localhost:8315")) {
      const responseHeaders = { ...(details.responseHeaders || {}) };
      if (responseHeaders["X-Frame-Options"]) delete responseHeaders["X-Frame-Options"];
      if (responseHeaders["x-frame-options"]) delete responseHeaders["x-frame-options"];
      if (responseHeaders["Content-Security-Policy"])
        delete responseHeaders["Content-Security-Policy"];
      if (responseHeaders["content-security-policy"])
        delete responseHeaders["content-security-policy"];
      callback({ cancel: false, responseHeaders });
      return;
    }
    callback({ cancel: false });
  });

  // Save browser state (called from renderer when tiles change)
  ipcMain.handle(
    "browser:save-state",
    async (
      _event,
      sessions: Array<{ id: string; partition: string; url: string; title: string }>,
    ) => {
      store.set("browserSessions", sessions);
    },
  );

  // Get saved sessions for restore on startup
  ipcMain.handle("browser:get-saved", async () => {
    return store.get("browserSessions", []);
  });

  // Clear a specific session's data
  ipcMain.handle("browser:clear-session", async (_event, opts: { partition: string }) => {
    const ses = session.fromPartition(opts.partition);
    await ses.clearStorageData();
  });

  // ── DevTools via CDP Proxy ──────────────────────────────────────────────────
  // The renderer embeds an iframe pointing to the local devtools frontend URL.

  ipcMain.handle(
    "browser:open-devtools",
    async (_event, opts: { targetId: number; devtoolsId: number; tileId: string }) => {
      try {
        const target = webContents.fromId(opts.targetId);

        if (!target || target.isDestroyed()) {
          return { ok: false, error: "Target webContents not found" };
        }

        // We MUST cache the mapping of targetId to CDP targetId. If we attach
        // the debugger while a CDP WebSocket is active from the DevTools iframe,
        // it immediately disconnects the iframe's WebSocket!
        let targetIdStr = cdpTargetCache.get(opts.targetId);

        if (!targetIdStr) {
          let attachedByUs = false;
          try {
            if (!target.debugger.isAttached()) {
              target.debugger.attach("1.3");
              attachedByUs = true;
            }
            const { targetInfo } = await target.debugger.sendCommand("Target.getTargetInfo");
            targetIdStr = targetInfo.targetId;
            if (targetIdStr) cdpTargetCache.set(opts.targetId, targetIdStr);
          } catch (err) {
            console.error("[DevTools] Failed to discover CDP target:", err);
            return { ok: false, error: "Failed to discover CDP target" };
          } finally {
            if (attachedByUs && target.debugger.isAttached()) {
              target.debugger.detach();
            }
          }
        }

        if (!targetIdStr) return { ok: false, error: "Failed to resolve CDP target ID" };

        // Crucially, wait a tiny bit just in case this was the first run and the detach is settling
        await new Promise((r) => setTimeout(r, 100));

        const devtoolsUrl = `http://127.0.0.1:8315/devtools/inspector.html?ws=127.0.0.1:8315/devtools/page/${targetIdStr}`;

        openDevTools.set(opts.tileId, { targetId: opts.targetId, devtoolsId: 0 });

        return { ok: true, url: devtoolsUrl };
      } catch (err) {
        console.error("[DevTools] Failed to open:", err);
        return { ok: false, error: String(err) };
      }
    },
  );

  // Close DevTools — just clean up map
  ipcMain.handle(
    "browser:close-devtools",
    async (_event, opts: { targetId: number; tileId: string }) => {
      openDevTools.delete(opts.tileId);
    },
  );

  // Inspect element — use DevTools command line API injected function
  ipcMain.handle(
    "browser:inspect-element",
    async (
      _event,
      opts: { targetId: number; devtoolsId: number; tileId: string; x?: number; y?: number },
    ) => {
      try {
        const target = webContents.fromId(opts.targetId);

        if (!target || target.isDestroyed()) {
          return { ok: false, error: "Target webContents not found" };
        }

        if (opts.x != null && opts.y != null) {
          // DevTools injects 'inspect()' into the global scope.
          // We use document.elementFromPoint to get the clicked un-trusted node and inspect it.
          target
            .executeJavaScript(`
          (function() {
            if (typeof inspect === 'function') {
              const el = document.elementFromPoint(${opts.x}, ${opts.y});
              if (el) inspect(el);
            }
          })();
        `)
            .catch(() => {});
        }

        return { ok: true };
      } catch (err) {
        console.error("[DevTools] Failed to inspect element:", err);
        return { ok: false, error: String(err) };
      }
    },
  );

  // ── Glassy Side Panel CDP ───────────────────────────────────────────────────

  ipcMain.handle(
    "browser:toggle-side-panel",
    async (event, opts: { targetId: number; tileId: string; open: boolean }) => {
      try {
        const { targetId, tileId, open } = opts;

        if (!open) {
          const wc = sidePanelDebuggers.get(tileId);
          if (wc && !wc.isDestroyed() && wc.debugger.isAttached()) {
            wc.debugger.detach();
          }
          sidePanelDebuggers.delete(tileId);
          return;
        }

        if (sidePanelDebuggers.has(tileId)) return; // Already attached

        const target = webContents.fromId(targetId);
        if (!target || target.isDestroyed()) return;

        target.debugger.attach("1.3");
        await target.debugger.sendCommand("Runtime.enable");
        await target.debugger.sendCommand("Network.enable", {
          maxTotalBufferSize: 100000000,
          maxResourceBufferSize: 50000000,
        });

        target.debugger.on("message", (_e, method, params) => {
          if (method === "Runtime.consoleAPICalled") {
            event.sender.send("cdp-console", tileId, params);
          } else if (
            method === "Network.requestWillBeSent" ||
            method === "Network.responseReceived" ||
            method === "Network.loadingFinished"
          ) {
            event.sender.send("cdp-network", tileId, method, params);
          }
        });

        sidePanelDebuggers.set(tileId, target);

        // If the webContents is closed/destroyed while panel is open, clean up
        target.once("destroyed", () => {
          sidePanelDebuggers.delete(tileId);
        });
      } catch (e) {
        console.error("[SidePanel CDP] Error toggling side panel CDP:", e);
      }
    },
  );

  ipcMain.handle(
    "browser:cdp-get-response-body",
    async (_event, opts: { targetId: number; tileId: string; requestId: string }) => {
      try {
        const target = sidePanelDebuggers.get(opts.tileId);
        if (!target || target.isDestroyed() || !target.debugger.isAttached()) {
          return { body: "", base64Encoded: false };
        }

        const res = await target.debugger.sendCommand("Network.getResponseBody", {
          requestId: opts.requestId,
        });
        return res;
      } catch (e) {
        console.error("[SidePanel CDP] Failed to get response body:", e);
        return { body: "Failed to load response body.", base64Encoded: false };
      }
    },
  );
}

export function cleanupBrowserSessions(): void {
  // State is already persisted via save-state calls
}
