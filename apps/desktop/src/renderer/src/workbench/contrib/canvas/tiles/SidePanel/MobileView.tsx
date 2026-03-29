import { useState, useEffect, useRef } from "react";

export default function MobileView({ currentUrl }: { currentUrl: string }) {
  const [viewportWidth, setViewportWidth] = useState(375);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const prevUrlRef = useRef(currentUrl);

  // Imperatively create webview so we can call loadURL() on navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wv = document.createElement("webview") as Electron.WebviewTag;
    wv.setAttribute("src", currentUrl);
    wv.setAttribute("partition", "persist:browser");
    wv.setAttribute("webpreferences", "contextIsolation=no, sandbox=no");
    wv.style.cssText = "width:100%;height:100%;border:none;display:block;";
    container.appendChild(wv);
    webviewRef.current = wv;
    prevUrlRef.current = currentUrl;

    return () => {
      webviewRef.current = null;
      if (container.contains(wv)) container.removeChild(wv);
    };
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL changes from the main browser tile into the mobile webview
  useEffect(() => {
    if (currentUrl !== prevUrlRef.current && webviewRef.current) {
      prevUrlRef.current = currentUrl;
      try {
        webviewRef.current.loadURL(currentUrl);
      } catch {
        /* webview not ready */
      }
    }
  }, [currentUrl]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = viewportWidth;
    const onMove = (ev: PointerEvent) => {
      setViewportWidth(Math.max(320, Math.min(700, startWidth + (ev.clientX - startX))));
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/20 py-4 px-6">
      <div
        className="relative flex flex-col h-full overflow-hidden rounded-[42px] border-[10px] border-[#1a1a1a] bg-black shadow-2xl"
        style={{ width: viewportWidth }}
      >
        {/* Dynamic Island / notch */}
        <div className="absolute left-1/2 top-2 z-10 h-[28px] w-[116px] -translate-x-1/2 rounded-[20px] bg-black" />

        {/* Webview container — flex-1 fills remaining height */}
        <div ref={containerRef} className="relative flex-1 w-full overflow-hidden" />

        {/* Resize handle */}
        <div
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 cursor-col-resize"
          style={{ right: -12, width: 16, height: 80 }}
          onPointerDown={handlePointerDown}
        >
          <div className="mx-auto h-full w-1 rounded-full bg-white/20 transition-colors hover:bg-white/60" />
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-white/30" />
      </div>
    </div>
  );
}
