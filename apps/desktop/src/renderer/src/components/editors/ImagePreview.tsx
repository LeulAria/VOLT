import { useEffect, useState, useRef } from "react";
import type { Tab } from "../../workbench/contrib/canvas/store/useTabStore";

interface ImagePreviewProps {
  tab: Tab;
}

const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "avif",
  "tiff",
  "tif",
  "heic",
  "svg",
]);

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
};

export function isImageFile(filePath?: string): boolean {
  const ext = filePath?.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(ext);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Breadcrumb({ filePath }: { filePath: string }) {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        fontSize: 11.5,
        color: "rgba(255,255,255,0.35)",
        padding: "6px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        fontFamily: "Geist, -apple-system, sans-serif",
      }}
    >
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <span style={{ opacity: 0.4 }}>›</span>}
          <span style={{ color: i === parts.length - 1 ? "rgba(255,255,255,0.7)" : undefined }}>
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Read the file as binary and build a data-URL (works even when volt-file:// protocol fails). */
function loadFallback(
  filePath: string,
  ext: string,
  cancelled: boolean,
  blobUrlRef: React.MutableRefObject<string>,
  setSrc: (s: string) => void,
  setError: (e: string) => void,
) {
  if (ext === "svg") {
    window.electron.fs
      .readFile(filePath)
      .then((content) => {
        if (cancelled) return;
        const blob = new Blob([content], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load SVG");
      });
    return;
  }
  // For raster images, read as base64
  window.electron.fs
    .readBinary(filePath)
    .then((base64) => {
      if (cancelled) return;
      const mime = EXT_MIME[ext] ?? "image/png";
      setSrc(`data:${mime};base64,${base64}`);
    })
    .catch(() => {
      if (!cancelled) setError("Failed to load image");
    });
}

interface SharpMeta {
  space: string;
  channels: number;
  depth: string;
  density: number;
  hasAlpha: boolean;
}

export function ImagePreview({ tab }: ImagePreviewProps) {
  const [src, setSrc]             = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [dims, setDims]           = useState<{ w: number; h: number } | null>(null);
  const [fileSize, setFileSize]   = useState<number | null>(null);
  const [imgExt, setImgExt]       = useState<string>("");
  const [sharpMeta, setSharpMeta] = useState<SharpMeta | null>(null);
  const blobUrlRef                = useRef<string>("");

  const filePath = tab.filePath ?? "";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;

    setSrc(null);
    setError(null);
    setDims(null);
    setFileSize(null);
    setSharpMeta(null);
    setImgExt(ext.toUpperCase());

    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    // File size (non-blocking)
    try {
      window.electron.fs
        .stat(filePath)
        .then((s) => { if (!cancelled) setFileSize(s.size); })
        .catch(() => {});
    } catch { /* fs.stat unavailable */ }

    // Sharp metadata (non-blocking)
    try {
      (window.electron as any).image
        .meta(filePath)
        .then((m: { width: number; height: number; format: string; space: string; channels: number; depth: string; density: number; hasAlpha: boolean }) => {
          if (cancelled) return;
          if (m.width > 0 && m.height > 0) setDims({ w: m.width, h: m.height });
          if (m.format) setImgExt(m.format.toUpperCase());
          setSharpMeta({ space: m.space, channels: m.channels, depth: m.depth, density: m.density, hasAlpha: m.hasAlpha });
        })
        .catch(() => {});
    } catch { /* image.meta unavailable */ }

    // Load image via IPC
    (window.electron as any).image
      .load(filePath)
      .then(
        (result: { type: "url" | "base64"; url: string; width?: number; height?: number; ext: string }) => {
          if (cancelled) return;
          if (result.ext) setImgExt(result.ext.toUpperCase());
          if (result.width && result.height) setDims({ w: result.width, h: result.height });
          setSrc(result.url);
        },
      )
      .catch((_e: unknown) => {
        if (cancelled) return;
        // Fallback: read binary and create data URL
        loadFallback(filePath, ext, cancelled, blobUrlRef, setSrc, setError);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    };
  }, [filePath, ext]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.3 }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span style={{ color: "#f87171", fontSize: 11 }}>{error}</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "rgba(255,255,255,0.35)",
          fontSize: 12,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "1.5px solid currentColor",
            borderTopColor: "transparent",
            animation: "spin 0.7s linear infinite",
          }}
        />
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#111113",
        overflow: "hidden",
      }}
    >
      <Breadcrumb filePath={filePath} />

      {/* Image canvas with checkerboard transparency */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          padding: 40,
          backgroundImage: [
            "linear-gradient(45deg, #1a1a1f 25%, transparent 25%)",
            "linear-gradient(-45deg, #1a1a1f 25%, transparent 25%)",
            "linear-gradient(45deg, transparent 75%, #1a1a1f 75%)",
            "linear-gradient(-45deg, transparent 75%, #1a1a1f 75%)",
          ].join(", "),
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundColor: "#131316",
        }}
      >
        <img
          src={src}
          alt={tab.title}
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 4,
            boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0) {
              setDims({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          onError={() => {
            // If volt-file:// URL failed, retry with base64 data URL
            if (src && src.startsWith("volt-file://")) {
              loadFallback(filePath, ext, false, blobUrlRef, setSrc, setError);
            } else {
              setError("Failed to render image");
            }
          }}
        />
      </div>

      {/* Metadata bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "5px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "#0d0d10",
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "ui-monospace, monospace",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {dims && (
          <span style={{ color: "rgba(255,255,255,0.6)" }}>
            {dims.w} × {dims.h} px
          </span>
        )}
        {fileSize !== null && <span>{formatBytes(fileSize)}</span>}
        {imgExt && <span style={{ color: "rgba(255,255,255,0.5)" }}>{imgExt}</span>}
        {sharpMeta?.space && <span>{sharpMeta.space.toUpperCase()}</span>}
        {sharpMeta?.channels != null && sharpMeta.channels > 0 && (
          <span>{sharpMeta.channels}ch</span>
        )}
        {sharpMeta?.depth && <span>{sharpMeta.depth}</span>}
        {sharpMeta?.density != null && sharpMeta.density > 0 && (
          <span>{sharpMeta.density} DPI</span>
        )}
        {sharpMeta?.hasAlpha && (
          <span style={{ color: "rgba(139,92,246,0.7)" }}>alpha</span>
        )}
      </div>
    </div>
  );
}
