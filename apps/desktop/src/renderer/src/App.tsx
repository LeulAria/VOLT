import { useState, useCallback, useEffect, useRef } from "react";
import { Group, Panel, type PanelSize } from "react-resizable-panels";
import Canvas from "./workbench/contrib/canvas/Canvas";
import Sidebar from "./components/layout/Sidebar";
import StatusPanel, { type StatusPanelHandle } from "./workbench/contrib/canvas/StatusPanel";
import { TabBar } from "./components/layout/TabBar";
import { TopBar } from "./components/layout/TopBar";
import { MonacoDiff } from "./components/editors/MonacoDiff";
import { MonacoFile } from "./components/editors/MonacoFile";
import { MarkdownPreview } from "./components/editors/MarkdownPreview";
import { ImagePreview, isImageFile } from "./components/editors/ImagePreview";
import { RightSidebarContent, type RightView } from "./components/layout/RightSidebarContent";
import { useTabStore } from "./workbench/contrib/canvas/store/useTabStore";
import { useTileStore } from "./workbench/contrib/canvas/store/useTileStore";
import { useWorkspaceStore } from "./workbench/contrib/canvas/store/useWorkspaceStore";
import { CommandPalette } from "./components/command-palette";
// import { VOLTCODE_ENABLED } from "./workbench/contrib/voltcode/feature-flag";
// import { VoltCodeView } from "./workbench/contrib/voltcode/VoltCodeView";

// ─── constants ────────────────────────────────────────────────────────────────
const DEFAULT_LEFT_PX = 380;
const DEFAULT_RIGHT_PX = 380;
const MIN_SIDE_PX = 280;
const MAX_SIDE_PX = 600;

/**
 * The library forces `overflow: auto` as an inline style on the Panel's inner
 * div. User `style` is spread *after* that default, so passing
 * `style={{ overflow: "hidden" }}` reliably overrides it.
 */
const PANEL_STYLE = { overflow: "hidden", borderRadius: "0px" } as const;

// ─── App ──────────────────────────────────────────────────────────────────────
function App(): React.JSX.Element {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightView, setRightView] = useState<RightView>("git");
  const [gitWorkspacePath, setGitWorkspacePath] = useState<string | null>(null);
  // Set of tab IDs whose markdown files are showing in Monaco editor mode
  const [mdEditTabIds, setMdEditTabIds] = useState<Set<string>>(new Set());

  const { tabs, activeTabId } = useTabStore();

  /**
   * Last known pixel width of the left panel — used to:
   *  1. position the floating toggle button at the live panel edge
   *  2. keep `--sidebar-width` CSS variable in sync
   */
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_PX);

  const statusPanelRef = useRef<StatusPanelHandle>(null);
  const { minimapOpen, setMinimapOpen, addTerminalTileAtCenter, addBrowserTileAtCenter, addVoltCodeTileAtCenter } =
    useTileStore();
  const activeWorkspacePath = useWorkspaceStore((s) => s.activeWorkspacePath);

  // ── side-effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { view?: RightView; workspacePath?: string }
        | undefined;
      if (detail?.view) setRightView(detail.view);
      if (detail?.workspacePath) setGitWorkspacePath(detail.workspacePath);
      setRightOpen(true);
    };
    window.addEventListener("volt:toggle-right-sidebar", handler);
    return () => window.removeEventListener("volt:toggle-right-sidebar", handler);
  }, []);

  // Toggle markdown tab between preview and Monaco editor on double-click
  useEffect(() => {
    const handler = (e: Event) => {
      const { tabId } = (e as CustomEvent).detail as { tabId: string };
      setMdEditTabIds((prev) => {
        const next = new Set(prev);
        if (next.has(tabId)) next.delete(tabId);
        else next.add(tabId);
        return next;
      });
    };
    window.addEventListener("volt:toggle-md-editor", handler);
    return () => window.removeEventListener("volt:toggle-md-editor", handler);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      leftOpen ? `${leftWidth}px` : "0px",
    );
  }, [leftOpen, leftWidth]);

  // Expose active workspace root for context menu relative path calculation
  useEffect(() => {
    (window as any).__voltWorkspaceRoot = activeWorkspacePath ?? "";
  }, [activeWorkspacePath]);

  // Open file tab from context menu dispatch
  useEffect(() => {
    const handler = (e: Event) => {
      const { filePath, title } = (e as CustomEvent).detail as { filePath: string; title: string };
      const { openFileTab } = useTabStore.getState();
      openFileTab({ filePath, title });
    };
    window.addEventListener("volt:open-file-tab", handler);
    return () => window.removeEventListener("volt:open-file-tab", handler);
  }, []);

  // Clear pinned git workspace path when active workspace changes — so the panel tracks instantly
  useEffect(() => {
    setGitWorkspacePath(null);
  }, [activeWorkspacePath]);

  // ⌘T: cycle canvas tiles (focus). ⌘R: cycle editor tabs (loops). Skip when typing in inputs/editors.
  useEffect(() => {
    function isShortcutTargetEditable(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.closest?.("textarea, input, select, [contenteditable=true]")) return true;
      if (el.closest?.(".monaco-editor")) return true;
      return false;
    }

    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "t" && k !== "r") return;
      if (isShortcutTargetEditable(e.target)) return;

      if (k === "t") {
        e.preventDefault();
        const { tileOrder, focusedTileId, bringToFront, setFocusedId } = useTileStore.getState();
        if (tileOrder.length === 0) return;
        let i = focusedTileId ? tileOrder.indexOf(focusedTileId) : -1;
        if (i < 0) i = 0;
        else i = (i + 1) % tileOrder.length;
        const nextId = tileOrder[i]!;
        bringToFront(nextId);
        setFocusedId(nextId);
        window.dispatchEvent(new CustomEvent("volt:focus-tile", { detail: { tileId: nextId } }));
        return;
      }

      e.preventDefault();
      const { tabs, activeTabId, setActiveTab } = useTabStore.getState();
      if (tabs.length <= 1) return;
      const idx = tabs.findIndex((t) => t.id === activeTabId);
      const nextIdx = ((idx >= 0 ? idx : 0) + 1) % tabs.length;
      setActiveTab(tabs[nextIdx]!.id);
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  // ── stable callbacks ─────────────────────────────────────────────────────────
  const handleLaunchPreset = useCallback(
    (preset: any) =>
      addTerminalTileAtCenter(activeWorkspacePath ?? "/", preset.command ?? undefined),
    [activeWorkspacePath, addTerminalTileAtCenter],
  );

  const handleLaunchBrowser = useCallback(
    (url?: string) => addBrowserTileAtCenter(url),
    [addBrowserTileAtCenter],
  );

  // const handleLaunchVoltCode = useCallback(() => {
  //   if (!VOLTCODE_ENABLED) return;
  //   const { openVoltCodeTab } = useTabStore.getState();
  //   openVoltCodeTab();
  // }, []);

  /**
   * Left panel resize handler.
   * `inPixels === 0` means the panel collapsed past minSize — unmount it.
   * Otherwise keep `leftWidth` up to date for the toggle button.
   */
  const handleLeftResize = useCallback(({ inPixels }: PanelSize) => {
    if (inPixels === 0) setLeftOpen(false);
    else setLeftWidth(inPixels);
  }, []);

  const handleRightResize = useCallback(({ inPixels }: PanelSize) => {
    if (inPixels === 0) setRightOpen(false);
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/*
       * Wrapper div — takes all space above the 32 px status bar.
       * Group renders `height: 100%; width: 100%` inline, so it needs a
       * properly-sized parent rather than flex-1 on the Group itself.
       */}
      <div className="relative min-h-0 flex-1">
        <Group orientation="horizontal">
          {/* Left sidebar — fully unmounted (not hidden) when closed */}
          {leftOpen && (
            <>
              <Panel
                id="left"
                defaultSize={DEFAULT_LEFT_PX}
                minSize={MIN_SIDE_PX}
                maxSize={MAX_SIDE_PX}
                groupResizeBehavior="preserve-pixel-size"
                onResize={handleLeftResize}
                className="relative flex flex-col h-full min-h-0 bg-[#12121299] backdrop-blur-[5px] border-r border-[#333] z-[100] pointer-events-auto overflow-hidden shrink-0"
                style={PANEL_STYLE}
              >
                <div className="h-full">
                  <Sidebar />
                </div>
              </Panel>
              {/* <Separator className={HANDLE_CLS} /> */}
            </>
          )}

          {/* Center canvas — clips any overflow so it stays bounded */}
          <Panel id="center" className="relative" style={PANEL_STYLE}>
            <div className="flex h-full flex-col">
              {/* Top bar — only spans center+right area, not left sidebar */}
              <TopBar
                rightOpen={rightOpen}
                rightView={rightView}
                onOpenRight={(view) => {
                  setRightView(view);
                  setRightOpen(true);
                }}
                onCloseRight={() => setRightOpen(false)}
              />
              {tabs.length > 1 && <TabBar />}
              <div className="relative min-h-0 flex-1">
                {/* Canvas: always mounted, hidden via CSS when inactive */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    visibility: activeTabId === "canvas" ? "visible" : "hidden",
                    pointerEvents: activeTabId === "canvas" ? "auto" : "none",
                  }}
                >
                  <Canvas statusPanelRef={statusPanelRef} />
                </div>

                {/* Diff and file tabs: mount only when active */}
                {/* VoltCode tab — full screen AI chat */}
                {/* {VOLTCODE_ENABLED && tabs.some((t) => t.type === "voltcode") && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      visibility: activeTabId === "voltcode" ? "visible" : "hidden",
                      pointerEvents: activeTabId === "voltcode" ? "auto" : "none",
                    }}
                  >
                    <VoltCodeView />
                  </div>
                )} */}

                {tabs
                  .filter(
                    (t) => (t.type === "git-diff" || t.type === "file") && t.id === activeTabId,
                  )
                  .map((tab) => {
                    const isMarkdown =
                      tab.type === "file" && /\.(md|mdx|mdoc)$/i.test(tab.filePath ?? "");
                    const isImage = tab.type === "file" && isImageFile(tab.filePath);
                    const mdInEditor = isMarkdown && mdEditTabIds.has(tab.id);
                    return (
                      <div key={tab.id} style={{ position: "absolute", inset: 0 }}>
                        {tab.type === "git-diff" ? (
                          <MonacoDiff tab={tab} />
                        ) : isImage ? (
                          <ImagePreview tab={tab} />
                        ) : isMarkdown && !mdInEditor ? (
                          <MarkdownPreview tab={tab} />
                        ) : (
                          <MonacoFile tab={tab} />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </Panel>

          {/* Right sidebar — fully unmounted when closed */}
          {rightOpen && (
            <>
              {/* <Separator className={HANDLE_CLS} /> */}
              <Panel
                id="right"
                defaultSize={DEFAULT_RIGHT_PX}
                minSize={MIN_SIDE_PX}
                maxSize={MAX_SIDE_PX}
                collapsible
                groupResizeBehavior="preserve-pixel-size"
                onResize={handleRightResize}
                className="relative flex flex-col h-full min-h-0 bg-[#12121299] backdrop-blur-[5px] border-none border-l border-[#444] z-[100] pointer-events-auto overflow-hidden shrink-0"
                style={PANEL_STYLE}
              >
                <RightSidebarContent
                  view={rightView}
                  workspacePath={gitWorkspacePath ?? activeWorkspacePath ?? null}
                  onClose={() => setRightOpen(false)}
                />
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* Floating toggle — tracks the live right edge of the left panel */}
      <button
        className="absolute top-1/2 -translate-y-1/2 z-[200] bg-[#99999944] backdrop-blur-[5px] border border-[#262626] rounded-full w-[10px] h-[50px] flex flex-col items-center justify-center gap-1 cursor-pointer p-0 [-webkit-app-region:no-drag] transition-[background] duration-150 ml-2 hover:bg-[#99999999]"
        style={{ left: leftOpen ? leftWidth : 0 }}
        onClick={() => setLeftOpen((v) => !v)}
        aria-label="Toggle left sidebar"
      />

      {/* Command Palette — mounted unconditionally; builds file index in the background */}
      <CommandPalette />

      {/* Status bar — exactly 32 px, never grows */}
      <div className="h-8 w-full shrink-0 rounded-b-[15px] border-t-[1px] border-[#555]">
        <StatusPanel
          ref={statusPanelRef}
          minimapOpen={minimapOpen}
          onToggleMinimap={() => setMinimapOpen(!minimapOpen)}
          onLaunchPreset={handleLaunchPreset}
          onLaunchBrowser={handleLaunchBrowser}
          // onLaunchVoltCode={VOLTCODE_ENABLED ? handleLaunchVoltCode : undefined}
        />
      </div>
    </div>
  );
}

export default App;
