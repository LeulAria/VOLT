import { useCallback, useState } from "react";
import { SourceControlPanel } from "../../workbench/contrib/source-control/SourceControlPanel";
import { useTabStore } from "../../workbench/contrib/canvas/store/useTabStore";

export type RightView = "git" | "todos";

interface RightSidebarContentProps {
  view: RightView;
  workspacePath: string | null;
  onClose: () => void;
}

export function RightSidebarContent({ view, workspacePath, onClose }: RightSidebarContentProps) {
  const title = view === "git" ? "Source Control" : "Todos";
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes("volt/canvas-drop") ||
      e.dataTransfer.types.includes("Files")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      let filePath: string | null = null;

      // From sidebar tree
      const canvasDrop = e.dataTransfer.getData("volt/canvas-drop");
      if (canvasDrop) {
        try {
          const parsed = JSON.parse(canvasDrop) as { filePath: string };
          filePath = parsed.filePath;
        } catch {
          /* */
        }
      }

      // From OS file drop
      if (!filePath && e.dataTransfer.files.length > 0) {
        filePath = e.dataTransfer.files[0]?.path ?? null;
      }

      if (!filePath || !workspacePath) return;

      // Open as a diff tab
      const { openDiffTab } = useTabStore.getState();
      openDiffTab({
        workspacePath,
        filePath,
        cached: false,
        statusChar: "M",
      });

      // Reveal the file in the left sidebar tree (collapse others, expand path, center)
      window.dispatchEvent(new CustomEvent("volt:reveal-file", { detail: { filePath } }));
    },
    [workspacePath],
  );

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={dragOver ? { outline: "2px solid rgba(59,130,246,0.5)", outlineOffset: -2 } : undefined}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h2>
        <button
          className="text-white/40 transition-colors hover:text-white"
          onClick={onClose}
          aria-label="Close panel"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="volt-scroll min-h-0 flex-1 overflow-y-auto">
        {view === "git" ? (
          <SourceControlPanel workspacePath={workspacePath} />
        ) : (
          <div className="p-4 text-sm text-white/50">Todos coming soon…</div>
        )}
      </div>
    </div>
  );
}
