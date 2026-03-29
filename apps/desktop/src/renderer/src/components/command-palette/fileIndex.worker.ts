// ─── File index worker ────────────────────────────────────────────────────────
// Runs filtering + mapping off the main thread so large workspaces don't
// cause visible jank. The main thread handles all IPC calls; this worker
// only does CPU-bound processing of the raw node list.

const IGNORED_PARTS = new Set([
  "node_modules",
  ".git",
  ".turbo",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  ".DS_Store",
  "coverage",
  ".nyc_output",
]);

function isIgnored(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some((p) => IGNORED_PARTS.has(p));
}

interface RawNode {
  id: string;
  type: string;
  label: string;
  ext: string;
}

interface PaletteFile {
  id: string;
  project: string;
  projectRoot: string;
  rel: string;
  basename: string;
  ext: string;
}

interface WorkerRequest {
  wsId: string;
  wsLabel: string;
  nodes: RawNode[];
}

interface WorkerResponse {
  wsId: string;
  files: PaletteFile[];
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { wsId, wsLabel, nodes } = e.data;
  const files: PaletteFile[] = [];
  for (const n of nodes) {
    if (n.type !== "file") continue;
    if (isIgnored(n.id)) continue;
    files.push({
      id: n.id,
      project: wsLabel,
      projectRoot: wsId,
      rel: n.id.startsWith(wsId + "/") ? n.id.slice(wsId.length + 1) : n.id,
      basename: n.label,
      ext: n.ext,
    });
  }
  const response: WorkerResponse = { wsId, files };
  self.postMessage(response);
};
