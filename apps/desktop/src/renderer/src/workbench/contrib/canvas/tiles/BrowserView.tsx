import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useTileStore } from "../store/useTileStore";
import { Tooltip } from "../../../../components/ui/Tooltip";

interface BrowserViewProps {
  tileId: string;
  url?: string;
}

type DevToolsDock = "bottom" | "right";


// ── Component ─────────────────────────────────────────────────────────────────

export function BrowserTileView({ tileId, url }: BrowserViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const devtoolsContainerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const devtoolsWebviewRef = useRef<Electron.WebviewTag | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [currentUrl, setCurrentUrl] = useState(url || "https://www.google.com");
  const [displayUrl, setDisplayUrl] = useState(url || "https://www.google.com");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [favicon, setFavicon] = useState("");
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devToolsDock, setDevToolsDock] = useState<DevToolsDock>("bottom");
  const [splitPercent, setSplitPercent] = useState(55);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pageX: number;
    pageY: number;
  } | null>(null);
  const [devToolsLoading, setDevToolsLoading] = useState(false);
  const webviewReadyRef = useRef(false);

  const updateTile = useTileStore((s) => s.updateTile);

  const getTargetId = useCallback((): number | undefined => {
    const wv = webviewRef.current;
    if (!wv || !webviewReadyRef.current) return undefined;
    try {
      return (wv as any).getWebContentsId();
    } catch {
      return undefined;
    }
  }, []);

  // ── Main webview ─────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wv = document.createElement("webview") as Electron.WebviewTag;
    wv.setAttribute("src", url || "https://www.google.com");
    wv.setAttribute("allowpopups", "");
    wv.setAttribute("partition", "persist:browser");
    wv.setAttribute("webpreferences", "contextIsolation=no, sandbox=no");
    wv.style.width = "100%";
    wv.style.height = "100%";
    wv.style.border = "none";
    wv.style.display = "flex";
    wv.style.flex = "1";

    container.appendChild(wv);
    webviewRef.current = wv;

    const handleDomReady = () => {
      webviewReadyRef.current = true;
      // No zoom scaling — allows device emulation to work at correct dimensions
      setIsLoading(false);
      setError(null);
      try {
        const targetId = (wv as any).getWebContentsId();
        if (targetId) updateTile(tileId, { browserTargetId: targetId });
      } catch {
        // ignore
      }
    };

    const handleNavigation = () => {
      try {
        const navUrl = wv.getURL();
        setCurrentUrl(navUrl);
        if (!urlInputRef.current || document.activeElement !== urlInputRef.current) {
          setDisplayUrl(navUrl);
        }
        setCanGoBack(wv.canGoBack());
        setCanGoForward(wv.canGoForward());
        setIsSecure(navUrl.startsWith("https://"));
        updateTile(tileId, { browserUrl: navUrl });
      } catch {
        /* webview may not be ready */
      }
    };

    const handleTitleUpdate = (e: Electron.PageTitleUpdatedEvent) => {
      updateTile(tileId, { title: e.title });
    };
    const handleFaviconUpdate = (e: Electron.PageFaviconUpdatedEvent) => {
      if (e.favicons.length > 0) setFavicon(e.favicons[0]);
    };
    const handleStartLoading = () => {
      setIsLoading(true);
      setError(null);
    };
    const handleStopLoading = () => {
      setIsLoading(false);
      handleNavigation();
    };
    const handleFailLoad = (e: any) => {
      if (e.errorCode === -3) return;
      setError(`Failed to load: ${e.errorDescription || "Unknown error"}`);
      setIsLoading(false);
    };
    const handleCrash = () => {
      setError("Page crashed. Click reload to try again.");
      setIsLoading(false);
    };
    const handleNewWindow = (e: any) => {
      e.preventDefault();
      if (e.url) wv.loadURL(e.url);
    };

    wv.addEventListener("dom-ready", handleDomReady);
    wv.addEventListener("did-navigate", handleNavigation);
    wv.addEventListener("did-navigate-in-page", handleNavigation);
    wv.addEventListener("page-title-updated", handleTitleUpdate);
    wv.addEventListener("page-favicon-updated", handleFaviconUpdate);
    wv.addEventListener("did-start-loading", handleStartLoading);
    wv.addEventListener("did-stop-loading", handleStopLoading);
    wv.addEventListener("did-fail-load", handleFailLoad);
    wv.addEventListener("render-process-gone", handleCrash);
    wv.addEventListener("new-window", handleNewWindow);

    return () => {
      wv.removeEventListener("dom-ready", handleDomReady);
      wv.removeEventListener("did-navigate", handleNavigation);
      wv.removeEventListener("did-navigate-in-page", handleNavigation);
      wv.removeEventListener("page-title-updated", handleTitleUpdate);
      wv.removeEventListener("page-favicon-updated", handleFaviconUpdate);
      wv.removeEventListener("did-start-loading", handleStartLoading);
      wv.removeEventListener("did-stop-loading", handleStopLoading);
      wv.removeEventListener("did-fail-load", handleFailLoad);
      wv.removeEventListener("render-process-gone", handleCrash);
      wv.removeEventListener("new-window", handleNewWindow);
      webviewRef.current = null;
      webviewReadyRef.current = false;
      if (container.contains(wv)) container.removeChild(wv);
    };
  }, [tileId, updateTile, url]);

  // ── Chrome DevTools lifecycle ─────────────────────────────────────────────

  useEffect(() => {
    if (!devToolsOpen) {
      const dtContainer = devtoolsContainerRef.current;
      const dtWv = devtoolsWebviewRef.current;
      if (dtWv && dtContainer?.contains(dtWv)) dtContainer.removeChild(dtWv);
      devtoolsWebviewRef.current = null;
      const tid = getTargetId();
      if (tid) window.electron.browser.closeDevTools(tid, tileId);
      return undefined;
    }

    const container = devtoolsContainerRef.current;
    if (!container || !webviewRef.current) return;

    let cancelled = false;
    const existing = devtoolsWebviewRef.current;
    if (existing && container.contains(existing)) container.removeChild(existing);

    const dtWv = document.createElement("webview") as Electron.WebviewTag;
    dtWv.style.width = "100%";
    dtWv.style.height = "100%";
    dtWv.style.border = "none";
    dtWv.style.display = "flex";
    dtWv.style.flex = "1";
    dtWv.style.backgroundColor = "transparent";

    setDevToolsLoading(true);

    const initDevTools = async () => {
      let targetId: number | undefined;
      for (let i = 0; i < 30; i++) {
        if (cancelled) return;
        targetId = getTargetId();
        if (targetId) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!targetId || cancelled) return;

      const result = await window.electron.browser.openDevTools(targetId, 0, tileId);
      if (cancelled) return;
      if (!result.ok || !result.url) {
        console.error("[DevTools] Failed:", result.error);
        setDevToolsLoading(false);
        return;
      }

      dtWv.setAttribute("src", result.url);
      const handleLoad = () => {
        if (!cancelled) setDevToolsLoading(false);
      };
      dtWv.addEventListener("dom-ready", handleLoad);
      container.appendChild(dtWv);
      devtoolsWebviewRef.current = dtWv;
    };

    initDevTools();

    return () => {
      cancelled = true;
      devtoolsWebviewRef.current = null;
      if (container.contains(dtWv)) container.removeChild(dtWv);
    };
  }, [devToolsOpen, tileId, getTargetId]);

  useEffect(() => {
    return () => {
      const tid = getTargetId();
      if (tid) window.electron.browser.closeDevTools(tid, tileId);
    };
  }, [tileId, getTargetId]);

  // ── Context menu ──────────────────────────────────────────────────────────

  const lastMousePos = useRef({ clientX: 0, clientY: 0 });
  useEffect(() => {
    const track = (e: MouseEvent) => {
      lastMousePos.current = { clientX: e.clientX, clientY: e.clientY };
    };
    window.addEventListener("mousemove", track, true);
    return () => window.removeEventListener("mousemove", track, true);
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const handleContextMenu = (e: any) => {
      e.preventDefault();
      const params = e.params || {};
      setContextMenu({
        x: params.x ?? 0,
        y: params.y ?? 0,
        pageX: lastMousePos.current.clientX,
        pageY: lastMousePos.current.clientY,
      });
    };
    wv.addEventListener("context-menu", handleContextMenu);
    return () => {
      wv.removeEventListener("context-menu", handleContextMenu);
    };
  }, [webviewRef.current]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("mousedown", close, true);
    document.addEventListener("contextmenu", close, true);
    document.addEventListener("wheel", close, true);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("contextmenu", close, true);
      document.removeEventListener("wheel", close, true);
      window.removeEventListener("blur", close);
    };
  }, [contextMenu]);

  // Keyboard shortcut F12 / Cmd+Alt+I
  useEffect(() => {
    const container = containerRef.current?.closest(".browser-tile") as HTMLElement | null;
    if (!container) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "i")
      ) {
        e.preventDefault();
        setDevToolsOpen((prev) => !prev);
      }
    };
    container.addEventListener("keydown", handleKeyDown, true);
    return () => container.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigate = useCallback((input: string) => {
    const wv = webviewRef.current;
    if (!wv) return;
    let navUrl = input.trim();
    if (!navUrl) return;
    if (!/^https?:\/\//i.test(navUrl)) {
      if (navUrl.includes(".") && !navUrl.includes(" ")) {
        navUrl = "https://" + navUrl;
      } else {
        navUrl = `https://www.google.com/search?q=${encodeURIComponent(navUrl)}`;
      }
    }
    wv.loadURL(navUrl);
    setDisplayUrl(navUrl);
    setError(null);
    urlInputRef.current?.blur();
  }, []);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") navigate(e.currentTarget.value);
      if (e.key === "Escape") {
        setDisplayUrl(currentUrl);
        urlInputRef.current?.blur();
      }
    },
    [navigate, currentUrl],
  );

  const handleUrlFocus = useCallback(() => {
    setIsUrlFocused(true);
    setTimeout(() => urlInputRef.current?.select(), 0);
  }, []);

  const handleUrlBlur = useCallback(() => {
    setIsUrlFocused(false);
    setDisplayUrl(currentUrl);
  }, [currentUrl]);

  const handleBack = useCallback(() => webviewRef.current?.goBack(), []);
  const handleForward = useCallback(() => webviewRef.current?.goForward(), []);
  const handleReload = useCallback(() => {
    if (isLoading) webviewRef.current?.stop();
    else webviewRef.current?.reload();
  }, [isLoading]);

  const handleToggleDevTools = useCallback(() => {
    setDevToolsOpen((prev) => !prev);
  }, []);

  const handleInspectElement = useCallback(async () => {
    const ctx = contextMenu;
    setContextMenu(null);
    if (!devToolsOpen) {
      setDevToolsOpen(true);
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (ctx) {
      const tid = getTargetId();
      if (tid) window.electron.browser.inspectElement(tid, 0, tileId, ctx.x, ctx.y);
    }
  }, [devToolsOpen, contextMenu, tileId, getTargetId]);

  // ── Draggable split divider ───────────────────────────────────────────────

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const tileEl = e.currentTarget.closest(".browser-tile") as HTMLElement;
      if (!tileEl) return;
      setIsDraggingDivider(true);
      const onMouseMove = (ev: MouseEvent) => {
        const rect = tileEl.getBoundingClientRect();
        const toolbarHeight = 36;
        if (devToolsDock === "bottom") {
          const contentHeight = rect.height - toolbarHeight;
          if (contentHeight <= 0) return;
          const offset = ev.clientY - rect.top - toolbarHeight;
          setSplitPercent(Math.max(20, Math.min(80, (offset / contentHeight) * 100)));
        } else {
          const contentWidth = rect.width;
          if (contentWidth <= 0) return;
          const offset = ev.clientX - rect.left;
          setSplitPercent(Math.max(20, Math.min(80, (offset / contentWidth) * 100)));
        }
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setIsDraggingDivider(false);
      };
      document.body.style.cursor = devToolsDock === "bottom" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [devToolsDock],
  );

  const cleanUrl = displayUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const isHorizontalSplit = devToolsDock === "bottom";

  // ── Render ────────────────────────────────────────────────────────────────

  // Shared toolbar button classes
  const toolbarBtnBase =
    "flex items-center justify-center w-6 h-6 border-none rounded-[5px] bg-transparent text-white/45 cursor-pointer p-0 transition-colors hover:not-disabled:bg-white/[0.08] hover:not-disabled:text-white/80 active:not-disabled:bg-white/[0.12] disabled:text-white/15 disabled:cursor-default";

  return (
    <div className="browser-tile flex flex-col w-full h-full overflow-hidden bg-[#191919] rounded-none">
      {/* Navigation toolbar */}
      <div className="flex items-center gap-1.5 px-[10px] py-[6px] bg-[#191919] border-b border-white/[0.06] shrink-0 [-webkit-app-region:no-drag]">
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip content={t("browser.back")} position="bottom">
            <button className={toolbarBtnBase} onClick={handleBack} disabled={!canGoBack}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={t("browser.forward")} position="bottom">
            <button className={toolbarBtnBase} onClick={handleForward} disabled={!canGoForward}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={isLoading ? t("browser.stop") : t("browser.reload")} position="bottom">
            <button className={toolbarBtnBase} onClick={handleReload}>
              {isLoading ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )}
            </button>
          </Tooltip>
          <Tooltip content={t("browser.developerTools")} position="bottom">
            <button
              className={`${toolbarBtnBase}${devToolsOpen ? " text-[#007acc]" : ""}`}
              onClick={handleToggleDevTools}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-1.5 h-[30px] px-3 pl-2 bg-white/10 border border-white/10 rounded-full transition-all relative overflow-hidden focus-within:border-blue-500 focus-within:bg-white/[0.12] focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.18)]">
          <span className="flex items-center justify-center shrink-0 text-white/35 w-[14px] h-[14px]">
            {favicon ? (
              <img
                src={favicon}
                width={12}
                height={12}
                alt=""
                draggable={false}
                className="rounded-[2px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : isSecure ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            )}
          </span>
          <input
            ref={urlInputRef}
            className="flex-1 border-none bg-transparent text-white/70 text-[12px] font-mono outline-none min-w-0 p-0 leading-[26px] focus:text-white/90 placeholder:text-white/25 selection:bg-blue-500/35"
            value={isUrlFocused ? displayUrl : cleanUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            onFocus={handleUrlFocus}
            onBlur={handleUrlBlur}
            spellCheck={false}
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500 rounded-[1px] [animation:browser-loading_1.5s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Open in external browser */}
        <Tooltip content={t("browser.openInBrowser")} position="bottom">
          <button
            className={toolbarBtnBase}
            onClick={() => window.electron.ipcRenderer.invoke("shell:open-external", currentUrl)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </Tooltip>

        {/* Dock toggle — only when devtools is open */}
        {devToolsOpen && (
          <Tooltip
            content={
              devToolsDock === "bottom" ? t("browser.dockToRight") : t("browser.dockToBottom")
            }
            position="bottom"
          >
            <button
              className={`${toolbarBtnBase} ml-0.5`}
              onClick={() => setDevToolsDock((d) => (d === "bottom" ? "right" : "bottom"))}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {devToolsDock === "bottom" ? (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                  </>
                )}
              </svg>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-[36px_0_0_0] flex flex-col items-center justify-center gap-3 bg-black/85 text-[#aaa] text-xs z-10 rounded-[0_0_9px_9px]">
          <p className="m-0 max-w-[300px] text-center">{error}</p>
          <button
            className="px-4 py-1 rounded border border-white/15 bg-white/[0.08] text-[#ccc] text-[11px] cursor-pointer hover:bg-white/15"
            onClick={handleReload}
          >
            Reload
          </button>
        </div>
      )}

      {/* Content area */}
      <div
        className="flex-1 flex overflow-hidden relative"
        style={{ flexDirection: isHorizontalSplit ? "column" : "row" }}
      >
        {/* Main webview */}
        <div
          ref={containerRef}
          className="flex-1 flex border-none bg-white overflow-hidden min-w-0 min-h-0"
          style={
            devToolsOpen
              ? isHorizontalSplit
                ? { height: `${splitPercent}%`, width: "100%" }
                : { width: `${splitPercent}%`, height: "100%" }
              : undefined
          }
        />

        {/* Chrome DevTools divider + container */}
        {devToolsOpen && (
          <div
            className={`shrink-0 bg-[#333] z-[5] transition-colors hover:bg-[#007acc] active:bg-[#007acc] ${devToolsDock === "bottom" ? "w-full h-1 cursor-row-resize" : "h-full w-1 cursor-col-resize"}`}
            onMouseDown={handleDividerMouseDown}
          />
        )}
        {devToolsOpen && (
          <div
            ref={devtoolsContainerRef}
            className="flex relative bg-[rgba(22,22,22,0.4)] backdrop-blur-[2px] overflow-hidden min-w-0 min-h-0"
            style={
              isHorizontalSplit
                ? { height: `${100 - splitPercent}%`, width: "100%" }
                : { width: `${100 - splitPercent}%`, height: "100%" }
            }
          >
            {devToolsLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(22,22,22,0.4)] z-[2]">
                <div className="w-5 h-5 border-2 border-white/10 border-t-[#007acc] rounded-full [animation:devtools-spin_0.6s_linear_infinite]" />
              </div>
            )}
          </div>
        )}

        {/* Drag overlay */}
        {isDraggingDivider && <div className="absolute inset-0 z-10 cursor-inherit" />}
      </div>

      {/* Right-click context menu */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[3000] bg-[#252526] border border-white/[0.12] rounded-md py-1 min-w-[180px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] [animation:popover-in_0.1s_ease-out]"
            style={{ top: contextMenu.pageY, left: contextMenu.pageX }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center w-full px-[14px] py-1.5 border-none bg-transparent text-[#ccc] text-xs text-left cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:text-white disabled:text-[#555] disabled:cursor-default disabled:hover:bg-transparent"
              onClick={() => {
                webviewRef.current?.goBack();
                setContextMenu(null);
              }}
              disabled={!canGoBack}
            >
              {t("browser.back")}
            </button>
            <button
              className="flex items-center w-full px-[14px] py-1.5 border-none bg-transparent text-[#ccc] text-xs text-left cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:text-white disabled:text-[#555] disabled:cursor-default disabled:hover:bg-transparent"
              onClick={() => {
                webviewRef.current?.goForward();
                setContextMenu(null);
              }}
              disabled={!canGoForward}
            >
              {t("browser.forward")}
            </button>
            <button
              className="flex items-center w-full px-[14px] py-1.5 border-none bg-transparent text-[#ccc] text-xs text-left cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:text-white"
              onClick={() => {
                webviewRef.current?.reload();
                setContextMenu(null);
              }}
            >
              {t("browser.reload")}
            </button>
            <div className="h-px bg-white/[0.08] my-1" />
            <button
              className="flex items-center w-full px-[14px] py-1.5 border-none bg-transparent text-[#ccc] text-xs text-left cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:text-white"
              onClick={handleInspectElement}
            >
              <span>{t("browser.inspectElement")}</span>
              <span className="ml-auto pl-6 text-[11px] font-mono text-white/30">
                {"\u2318\u2325"}I
              </span>
            </button>
            <button
              className="flex items-center w-full px-[14px] py-1.5 border-none bg-transparent text-[#ccc] text-xs text-left cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:text-white"
              onClick={() => {
                setDevToolsOpen((p) => !p);
                setContextMenu(null);
              }}
            >
              <span>{devToolsOpen ? t("browser.closeDevTools") : t("browser.openDevTools")}</span>
              <span className="ml-auto pl-6 text-[11px] font-mono text-white/30">F12</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
