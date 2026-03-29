import { NetworkRequest } from "./index";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface NetworkPanelProps {
  requests: NetworkRequest[];
  targetId?: number;
  tileId: string;
}

type DetailTab = "headers" | "preview" | "response";

function statusColor(status?: number): string {
  if (!status) return "text-white/40";
  if (status < 300) return "text-emerald-400";
  if (status < 400) return "text-yellow-400";
  return "text-red-400";
}

function buildCurl(req: NetworkRequest): string {
  let curl = `curl -X ${req.method} '${req.url}'`;
  Object.entries(req.headers || {}).forEach(([k, v]) => {
    curl += ` \\\n  -H '${k}: ${v}'`;
  });
  if (req.postData) {
    curl += ` \\\n  --data '${req.postData.replace(/'/g, "'\\''")}'`;
  }
  return curl;
}

function getFilename(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.split("/").pop() || p || url;
  } catch {
    return url;
  }
}

function HeadersSection({ title, headers }: { title: string; headers?: Record<string, string> }) {
  if (!headers || Object.keys(headers).length === 0)
    return (
      <div className="mb-4">
        <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/35">
          {title}
        </div>
        <div className="text-[10.5px] text-white/25 italic">None</div>
      </div>
    );
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/35">
        {title}
      </div>
      <div className="space-y-0.5">
        {Object.entries(headers).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[10.5px] leading-5">
            <span className="shrink-0 text-white/50 min-w-[120px] max-w-[180px] break-all">
              {k}:
            </span>
            <span className="break-all text-white/85">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NetworkPanel({ requests, targetId, tileId }: NetworkPanelProps) {
  const { t } = useTranslation();
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("headers");
  const [copied, setCopied] = useState(false);

  const selectedReq = requests.find((r) => r.id === selectedReqId);

  const copyAsCurl = (req: NetworkRequest) => {
    navigator.clipboard.writeText(buildCurl(req));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSelect = async (req: NetworkRequest) => {
    setSelectedReqId(req.id);
    setDetailTab("headers");
    if (!targetId || !req.status) {
      setResponseBody(null);
      return;
    }
    setIsLoadingBody(true);
    setResponseBody(null);
    try {
      const res = await window.electron.browser.getResponseBody(targetId, tileId, req.id);
      setResponseBody(
        res?.body ? (res.base64Encoded ? atob(res.body) : res.body) : "No body available.",
      );
    } catch {
      setResponseBody("Failed to load response body.");
    } finally {
      setIsLoadingBody(false);
    }
  };

  // Parse JSON for pretty preview
  function getPreview(body: string | null): React.ReactNode {
    if (!body) return <span className="text-white/30 italic">{t("network.noBody")}</span>;
    try {
      const parsed = JSON.parse(body);
      return (
        <pre className="text-[10.5px] leading-5 text-emerald-300/90">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <pre className="text-[10.5px] leading-5 text-white/75 whitespace-pre-wrap break-all">
          {body}
        </pre>
      );
    }
  }

  const sorted = [...requests].sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-[11px] text-white/25">
        {t("network.noRequests")}
      </div>
    );
  }

  return (
    <div className="flex h-full font-mono text-[10.5px]" style={{ minHeight: 0 }}>
      {/* ── Request list ─────────────────────────────────────────── */}
      <div
        className={[
          "flex flex-col overflow-y-auto border-r border-white/[0.06]",
          selectedReq ? "w-[45%] shrink-0" : "w-full",
        ].join(" ")}
      >
        {/* Column headers */}
        <div className="sticky top-0 z-10 flex items-center border-b border-white/[0.08] bg-[#0d0d0f] px-2 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-white/30">
          <div className="w-[44px] shrink-0">{t("network.status")}</div>
          <div className="w-[36px] shrink-0">{t("network.method")}</div>
          <div className="flex-1 truncate">{t("network.name")}</div>
          <div className="w-[50px] shrink-0 text-right">{t("network.type")}</div>
        </div>

        {sorted.map((req) => {
          const isSelected = req.id === selectedReqId;
          const isErr = req.status && req.status >= 400;
          return (
            <div
              key={req.id}
              onClick={() => handleSelect(req)}
              className={[
                "group flex cursor-pointer items-center border-b border-white/[0.04] px-2 py-1.5 transition-colors",
                isSelected
                  ? "bg-indigo-500/15 text-white/90"
                  : isErr
                    ? "text-red-400/80 hover:bg-white/[0.03]"
                    : "text-white/65 hover:bg-white/[0.03]",
              ].join(" ")}
            >
              <div className="w-[44px] shrink-0">
                {req.status ? (
                  <span className={`${statusColor(req.status)}`}>{req.status}</span>
                ) : (
                  <span className="text-white/25">···</span>
                )}
              </div>
              <div className="w-[36px] shrink-0 text-white/40">{req.method}</div>
              <div className="flex-1 truncate" title={req.url}>
                {getFilename(req.url)}
              </div>
              <div className="w-[50px] shrink-0 truncate text-right text-[9px] text-white/25">
                {req.type?.split("/").pop()?.split(";")[0] ?? ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail panel ─────────────────────────────────────────── */}
      {selectedReq && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0a0c]">
          {/* Detail header */}
          <div className="flex shrink-0 items-center gap-0 border-b border-white/[0.07]">
            {(["headers", "preview", "response"] as DetailTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                className={[
                  "px-3 py-2 text-[9.5px] font-semibold uppercase tracking-wider transition-colors",
                  detailTab === t
                    ? "border-b border-indigo-400 text-indigo-300"
                    : "text-white/30 hover:text-white/60",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => copyAsCurl(selectedReq)}
              className="ml-auto mr-2 flex items-center gap-1 rounded-[4px] border border-white/10 px-2 py-1 text-[9.5px] text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
            >
              {copied ? t("network.copied") : t("network.copyCurl")}
            </button>
            <button
              onClick={() => setSelectedReqId(null)}
              className="mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/25 hover:text-white/60"
            >
              ✕
            </button>
          </div>

          {/* Detail content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {detailTab === "headers" && (
              <>
                {/* General */}
                <div className="mb-4">
                  <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/35">
                    {t("network.general")}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex gap-2 text-[10.5px] leading-5">
                      <span className="shrink-0 text-white/50 min-w-[120px]">
                        {t("network.requestUrl")}
                      </span>
                      <span className="break-all text-white/85">{selectedReq.url}</span>
                    </div>
                    <div className="flex gap-2 text-[10.5px] leading-5">
                      <span className="shrink-0 text-white/50 min-w-[120px]">
                        {t("network.requestMethod")}
                      </span>
                      <span className={statusColor(undefined) + " text-white/85"}>
                        {selectedReq.method}
                      </span>
                    </div>
                    {selectedReq.status && (
                      <div className="flex gap-2 text-[10.5px] leading-5">
                        <span className="shrink-0 text-white/50 min-w-[120px]">
                          {t("network.statusCode")}
                        </span>
                        <span className={statusColor(selectedReq.status)}>
                          {selectedReq.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <HeadersSection
                  title={t("network.responseHeaders")}
                  headers={selectedReq.responseHeaders}
                />
                <HeadersSection title={t("network.requestHeaders")} headers={selectedReq.headers} />
              </>
            )}

            {detailTab === "preview" && (
              <div>
                {isLoadingBody ? (
                  <div className="text-white/30">{t("network.loading")}</div>
                ) : (
                  getPreview(responseBody)
                )}
              </div>
            )}

            {detailTab === "response" && (
              <div>
                {isLoadingBody ? (
                  <div className="text-white/30">{t("network.loading")}</div>
                ) : responseBody ? (
                  <pre className="whitespace-pre-wrap break-all text-[10.5px] leading-5 text-white/70">
                    {responseBody}
                  </pre>
                ) : (
                  <div className="text-white/25 italic">{t("network.noResponseBody")}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
