import { useState, useEffect, useCallback, useRef } from "react";
import type { PaletteFile } from "./types";
import type { GitChangeStatus, GitStatusResult } from "../../workbench/contrib/source-control/types";

export type GitStatusMap = Record<string, GitChangeStatus>;

// ─── Worker singleton ─────────────────────────────────────────────────────────
// One worker for the lifetime of the app; reused across builds.
let _worker: Worker | null = null;
function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL("./fileIndex.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return _worker;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFileIndex() {
  const [files, setFiles] = useState<PaletteFile[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatusMap>({});
  const [isBuilding, setIsBuilding] = useState(false);

  const buildingRef = useRef(false);
  const cacheRef = useRef<Map<string, PaletteFile[]>>(new Map());

  const buildIndex = useCallback(async (invalidate = false) => {
    if (buildingRef.current) return;
    buildingRef.current = true;
    setIsBuilding(true);

    let workspaces: Array<{ id: string; label: string }> = [];
    try {
      const all = await window.electron.workspace.getAll();
      workspaces = all.map((w) => ({ id: w.id, label: w.label }));
    } catch {
      buildingRef.current = false;
      setIsBuilding(false);
      return;
    }

    if (workspaces.length === 0) {
      buildingRef.current = false;
      setIsBuilding(false);
      return;
    }

    if (invalidate) cacheRef.current.clear();

    const worker = getWorker();

    // Track pending workspaces so we know when all are done
    let pending = 0;
    // Accumulate files per workspace in insertion order
    const resultMap = new Map<string, PaletteFile[]>();

    function flush() {
      const all: PaletteFile[] = [];
      for (const ws of workspaces) {
        const f = resultMap.get(ws.id);
        if (f) all.push(...f);
      }
      setFiles(all);
    }

    const onMessage = (e: MessageEvent<{ wsId: string; files: PaletteFile[] }>) => {
      const { wsId, files: wsFiles } = e.data;
      cacheRef.current.set(wsId, wsFiles);
      resultMap.set(wsId, wsFiles);
      // Stream: show results as each workspace finishes
      flush();
      pending--;
      if (pending === 0) {
        worker.removeEventListener("message", onMessage);
        buildingRef.current = false;
        setIsBuilding(false);

        // Fetch git status non-blocking after all files are indexed
        for (const ws of workspaces) {
          window.electron.git
            .status(ws.id)
            .then((status: GitStatusResult) => {
              if (!status?.isGitRepo) return;
              const patch: GitStatusMap = {};
              const allChanges = [
                ...(status.staged ?? []),
                ...(status.unstaged ?? []),
                ...(status.untracked ?? []),
              ];
              for (const f of allChanges) {
                if (f.absPath) patch[f.absPath] = f.status;
              }
              if (Object.keys(patch).length > 0) {
                setGitStatus((prev) => ({ ...prev, ...patch }));
              }
            })
            .catch(() => {});
        }
      }
    };

    worker.addEventListener("message", onMessage);

    // Pre-fill from cache and dispatch IPC + Worker jobs in parallel
    await Promise.all(
      workspaces.map(async (ws) => {
        if (!invalidate && cacheRef.current.has(ws.id)) {
          resultMap.set(ws.id, cacheRef.current.get(ws.id)!);
          flush();
          return;
        }
        try {
          pending++;
          // depth=6 covers virtually all real project layouts
          const nodes = await window.electron.workspace.expandToDepth(ws.id, 6);
          worker.postMessage({ wsId: ws.id, wsLabel: ws.label, nodes });
        } catch {
          pending--;
          if (pending === 0) {
            worker.removeEventListener("message", onMessage);
            buildingRef.current = false;
            setIsBuilding(false);
          }
        }
      }),
    );

    // If everything was cached, finish immediately
    if (pending === 0) {
      worker.removeEventListener("message", onMessage);
      buildingRef.current = false;
      setIsBuilding(false);
      flush();
    }
  }, []);

  // Start indexing immediately on mount (background, won't block render)
  useEffect(() => {
    const timer = setTimeout(() => buildIndex(), 400);
    return () => clearTimeout(timer);
  }, [buildIndex]);

  // Rebuild on workspace file changes
  useEffect(() => {
    const handler = () => buildIndex(true);
    window.addEventListener("volt:refresh-workspace", handler);
    return () => window.removeEventListener("volt:refresh-workspace", handler);
  }, [buildIndex]);

  return { files, gitStatus, isBuilding, buildIndex };
}
