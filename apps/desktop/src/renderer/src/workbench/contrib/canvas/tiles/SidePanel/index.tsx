import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import MobileView from "./MobileView";
import ConsolePanel from "./ConsolePanel";
import NetworkPanel from "./NetworkPanel";

interface SidePanelProps {
  tileId: string;
  targetId: number | undefined;
  currentUrl: string;
  onClose: () => void;
  isFocused?: boolean;
  isDragging?: boolean;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  type?: string;
  headers: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timestamp: number;
  postData?: string;
}

export interface ConsoleLog {
  id: string;
  type: string;
  message: string;
  args?: any[];
  timestamp: number;
}

// ── Tab icons ─────────────────────────────────────────────────────────────────

function IconPhone() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <circle cx="12" cy="18" r="1" />
      <line x1="9" y1="5" x2="15" y2="5" />
    </svg>
  );
}

function IconDevTools() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconConsole() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="5" y2="17" />
      <line x1="12" y1="12" x2="19" y2="17" />
    </svg>
  );
}

// ── Animated tab bar ──────────────────────────────────────────────────────────

interface AnimatedTabBarProps<T extends string> {
  tabs: { id: T; icon: React.ReactNode; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  indicatorClass?: string;
}

function AnimatedTabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
  indicatorClass = "",
}: AnimatedTabBarProps<T>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[active];
    const bar = barRef.current;
    if (el && bar) {
      const barRect = bar.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - barRect.left,
        width: elRect.width,
        opacity: 1,
      });
    }
  }, [active]);

  return (
    <div ref={barRef} className={`relative flex items-end ${className}`}>
      {/* Sliding indicator */}
      <div
        className={`absolute bottom-0 h-[2px] rounded-full transition-all duration-200 ease-out ${indicatorClass}`}
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.opacity,
          transitionProperty: "left, width, opacity",
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[tab.id] = el;
          }}
          onClick={() => onChange(tab.id)}
          className={[
            "flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-medium transition-colors duration-150",
            active === tab.id ? "text-white/90" : "text-white/40 hover:text-white/70",
          ].join(" ")}
          style={{ background: "none", border: "none", cursor: "pointer", outline: "none" }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SidePanel({
  tileId,
  targetId,
  currentUrl,
  onClose,
  isFocused,
  isDragging,
}: SidePanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"mobile" | "devtools">("mobile");
  const [subTab, setSubTab] = useState<"console" | "network">("console");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkRequests, setNetworkRequests] = useState<Map<string, NetworkRequest>>(new Map());
  const [, setTrigger] = useState(0);
  const [panelWidth, setPanelWidth] = useState(600);
  const resizingRef = useRef(false);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = true;
      const startX = e.clientX;
      const startW = panelWidth;
      const onMove = (ev: PointerEvent) => {
        if (!resizingRef.current) return;
        const delta = startX - ev.clientX; // dragging left = wider
        setPanelWidth(Math.max(320, Math.min(900, startW + delta)));
      };
      const onUp = () => {
        resizingRef.current = false;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [panelWidth],
  );

  useEffect(() => {
    if (!targetId) return;
    window.electron.browser.toggleSidePanel(targetId, tileId, true);

    const cleanupConsole = window.electron.browser.onCdpConsole((id, params) => {
      if (id !== tileId) return;
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          type: params.type,
          message: params.args?.map((a: any) => a.value ?? a.description).join(" ") || "",
          args: params.args,
          timestamp: params.timestamp,
        },
      ]);
    });

    const cleanupNetwork = window.electron.browser.onCdpNetwork((id, method, params) => {
      if (id !== tileId) return;
      setNetworkRequests((prev) => {
        const next = new Map(prev);
        const reqId = params.requestId;
        if (method === "Network.requestWillBeSent") {
          next.set(reqId, {
            id: reqId,
            url: params.request.url,
            method: params.request.method,
            headers: params.request.headers || {},
            postData: params.request.postData,
            timestamp: params.timestamp,
          });
        } else if (method === "Network.responseReceived") {
          const req = next.get(reqId);
          if (req) {
            req.status = params.response.status;
            req.responseHeaders = params.response.headers || {};
            req.type = params.type || params.response.mimeType;
            next.set(reqId, req);
          }
        }
        return next;
      });
      setTrigger((p) => p + 1);
    });

    return () => {
      cleanupConsole();
      cleanupNetwork();
      window.electron.browser.toggleSidePanel(targetId, tileId, false);
    };
  }, [tileId, targetId]);

  const mainTabs = [
    { id: "mobile" as const, icon: <IconPhone />, label: t("sidePanel.mobile") },
    { id: "devtools" as const, icon: <IconDevTools />, label: t("sidePanel.devtools") },
  ];

  const subTabs = [
    { id: "console" as const, icon: <IconConsole />, label: t("sidePanel.console") },
    { id: "network" as const, icon: <IconNetwork />, label: t("sidePanel.network") },
  ];

  const borderColor = isFocused ? "rgba(0, 122, 204, 0.6)" : "rgba(255,255,255,0.08)";

  return (
    <div
      className="absolute left-full top-0 z-50 ml-2 flex h-full flex-col overflow-hidden rounded-tl-2xl rounded-bl-2xl shadow-2xl"
      style={{
        width: panelWidth,
        minHeight: 340,
        background: "rgba(14, 14, 16, 0.95)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border: `1px solid ${borderColor}`,
        boxShadow: isFocused
          ? "0 0 0 1px rgba(0,122,204,0.25), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 8px 32px rgba(0,0,0,0.5)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        pointerEvents: "auto",
      }}
      data-tile-side-panel
      tabIndex={0}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "rgba(255,255,255,0.15)" }}
        onPointerDown={handleResizePointerDown}
      />

      {/* Header tab bar */}
      <div className="flex shrink-0 items-center border-b border-white/[0.07] px-1 pt-0.5">
        <AnimatedTabBar
          tabs={mainTabs}
          active={activeTab}
          onChange={setActiveTab}
          indicatorClass="bg-[#007acc]"
        />
        <button
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.07] hover:text-white/70"
          aria-label={t("sidePanel.close")}
          style={{ background: "none", border: "none", cursor: "pointer", marginRight: 4 }}
        >
          <IconClose />
        </button>
      </div>

      {/* Mobile view */}
      {activeTab === "mobile" && (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <MobileView currentUrl={currentUrl} />
          {/* Drag overlay: prevents webview from stealing pointer events during tile drag */}
          {isDragging && (
            <div className="absolute inset-0 z-20" style={{ background: "transparent" }} />
          )}
        </div>
      )}

      {/* DevTools view */}
      {activeTab === "devtools" && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Sub-tab bar with animated indicator */}
          <div className="relative flex shrink-0 items-center border-b border-white/[0.06] bg-white/[0.015] px-2">
            <AnimatedTabBar
              tabs={subTabs}
              active={subTab}
              onChange={setSubTab}
              indicatorClass="bg-[#007acc]/70"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {subTab === "console" && <ConsolePanel logs={consoleLogs} />}
            {subTab === "network" && (
              <NetworkPanel
                requests={Array.from(networkRequests.values())}
                targetId={targetId}
                tileId={tileId}
              />
            )}
          </div>
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20" style={{ background: "transparent" }} />
          )}
        </div>
      )}
    </div>
  );
}
