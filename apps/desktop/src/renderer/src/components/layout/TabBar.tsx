import { useRef, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useTabStore,
  type Tab,
  type StatusChar,
} from "../../workbench/contrib/canvas/store/useTabStore";
import { isImageFile } from "../editors/ImagePreview";

// Restrict drag movement to the horizontal axis only
const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

const RASTER_TAB_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "ico"]);

function TabIcon({ tab }: { tab: Tab }) {
  const [thumbOk, setThumbOk] = useState(true);
  const ext = tab.filePath?.split(".").pop()?.toLowerCase() ?? "";
  const isRaster = tab.type === "file" && RASTER_TAB_EXTS.has(ext);

  if (isRaster && tab.filePath && thumbOk) {
    const encoded = tab.filePath.split("/").map(encodeURIComponent).join("/");
    return (
      <img
        src={`volt-file://${encoded}`}
        width={14}
        height={14}
        alt=""
        draggable={false}
        style={{ objectFit: "cover", borderRadius: 2, flexShrink: 0 }}
        onError={() => setThumbOk(false)}
      />
    );
  }

  if (tab.type === "canvas") return <IconCanvas />;
  if (tab.type === "voltcode") return <IconVoltCode />;
  if (tab.type === "file" && isImageFile(tab.filePath)) return <IconImage />;
  return <IconDiff />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s?: StatusChar): string {
  switch (s) {
    case "A":
      return "#3fb950";
    case "M":
      return "#d29922";
    case "D":
      return "#f85149";
    default:
      return "#888";
  }
}

function IconCanvas() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function IconVoltCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="13" width="13">
      <path d="M15.2683 18.2287c-1.9794 2.678-2.9691 4.0171-3.8925 3.7341-0.9233-0.283-0.9233-1.9253-0.9233-5.21l0.0001-0.3095c0-1.1848 0-1.7771-0.3786-2.1487l-0.02-0.0192c-0.3867-0.3637-1.00321-0.3637-2.23625-0.3637-2.21887 0-3.3283 0-3.70325-0.673-0.00621-0.0111-0.01225-0.0223-0.01811-0.0337-0.35395-0.6833 0.28841-1.5524 1.57314-3.29064l3.06214-4.14303C10.711 3.09327 11.7007 1.75425 12.6241 2.03721c0.9233 0.28297 0.9233 1.92528 0.9233 5.20991v0.3097c0 1.18469 0 1.77704 0.3786 2.14859l0.02 0.01925c0.3867 0.36374 1.0032 0.36374 2.2362 0.36374 2.2189 0 3.3284 0 3.7033 0.6729 0.0062 0.0111 0.0122 0.0224 0.0181 0.0337 0.354 0.6834-0.2884 1.5525-1.5732 3.2907" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
    </svg>
  );
}

function IconDiff() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="12" y1="12" x2="12" y2="18" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ─── Sortable tab item ─────────────────────────────────────────────────────────

const MD_EXTS = /\.(md|mdx|mdoc)$/i;

function SortableTabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const { setActiveTab, closeTab } = useTabStore();
  const isMd = tab.type === "file" && MD_EXTS.test(tab.filePath ?? "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style: React.CSSProperties = {
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    ...(isDragging
      ? {
          background: "#16161699",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
          borderRadius: 0,
          opacity: 0.95,
        }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-selected={active}
      className={[
        "flex h-full shrink-0 cursor-pointer select-none items-center gap-[5px] border-r border-white/[0.06] px-[10px]",
        "text-[12px] transition-colors duration-100",
        "[-webkit-app-region:no-drag]",
        active
          ? "border-b-[1.5px] border-b-white/60 text-white/90"
          : "text-white/45 hover:text-white/75",
      ].join(" ")}
      onClick={() => {
        setActiveTab(tab.id);
        if (tab.type === "file" && tab.filePath) {
          window.dispatchEvent(
            new CustomEvent("volt:reveal-file", { detail: { filePath: tab.filePath } }),
          );
        }
      }}
      onDoubleClick={
        isMd
          ? () =>
              window.dispatchEvent(
                new CustomEvent("volt:toggle-md-editor", { detail: { tabId: tab.id } }),
              )
          : undefined
      }
      {...attributes}
      {...listeners}
    >
      <span
        className="flex items-center"
        style={{
          color: tab.type === "git-diff" ? statusColor(tab.statusChar) : "rgba(255,255,255,0.5)",
        }}
      >
        <TabIcon tab={tab} />
      </span>

      <span className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
        {tab.title}
      </span>

      {tab.statusChar && (
        <span className="text-[10px] font-bold" style={{ color: statusColor(tab.statusChar) }}>
          {tab.statusChar}
        </span>
      )}

      {tab.type !== "canvas" && (
        <button
          className="ml-[1px] flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-sm leading-none text-white/30 transition-colors hover:bg-red-500/15 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          aria-label={`Close ${tab.title}`}
          onPointerDown={(e) => e.stopPropagation()} // prevent drag from close button
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

export function TabBar() {
  const { tabs, activeTabId } = useTabStore();
  const reorderTabs = useTabStore((s) => s.reorderTabs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[aria-selected="true"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  // Cmd+K then W → close all non-canvas tabs
  useEffect(() => {
    let cmdKPending = false;
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        cmdKPending = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          cmdKPending = false;
        }, 1500);
        return;
      }
      if (cmdKPending && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "w") {
        cmdKPending = false;
        clearTimeout(timer);
        useTabStore.getState().closeAllNonCanvasTabs();
        e.preventDefault();
        return;
      }
      if (!e.metaKey && !e.ctrlKey && e.key !== "Shift") {
        cmdKPending = false;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }, // small threshold to distinguish click vs drag
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = tabs.findIndex((t) => t.id === active.id);
      const newIdx = tabs.findIndex((t) => t.id === over.id);
      reorderTabs(arrayMove(tabs, oldIdx, newIdx));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
        <div
          className="flex h-[34px] min-h-[34px] shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-white/[0.07] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            background: "#16161666",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
          role="tablist"
          ref={scrollRef}
        >
          {tabs.map((tab) => (
            <SortableTabItem key={tab.id} tab={tab} active={tab.id === activeTabId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
