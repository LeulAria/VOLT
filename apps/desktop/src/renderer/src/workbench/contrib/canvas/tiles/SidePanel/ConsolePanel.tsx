import { ConsoleLog } from "./index";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ConsolePanel({ logs }: { logs: ConsoleLog[] }) {
  const { t } = useTranslation();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedLogs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLogs(next);
  };

  if (logs.length === 0) {
    return (
      <div className="p-4 text-white/40 text-xs text-center font-mono">
        {t("sidePanel.noConsoleOutput")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto font-mono text-[11px]">
      {logs.map((log) => {
        const isExpanded = expandedLogs.has(log.id);
        const isError = log.type === "error";
        const isWarning = log.type === "warning";

        return (
          <div
            key={log.id}
            className={`border-b border-white/5 px-3 py-2 cursor-pointer ${
              isError
                ? "bg-red-500/10 text-red-400"
                : isWarning
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "text-white/80 hover:bg-white/5"
            }`}
            onClick={(e) => toggleExpand(log.id, e)}
          >
            <div className="flex gap-2">
              <span className="shrink-0 text-white/30 truncate w-14">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="break-all whitespace-pre-wrap">{log.message}</span>
            </div>
            {isExpanded && log.args && log.args.length > 0 && (
              <div className="mt-2 pl-16 opacity-80 overflow-x-auto">
                <pre>{JSON.stringify(log.args, null, 2)}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
