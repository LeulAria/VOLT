import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/ui/Tooltip";
import { gitApi } from "./types";

interface CommitBoxProps {
  workspacePath: string;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  onCommitted: () => void;
}

type CommitAction = "commit" | "amend" | "commit-push" | "commit-sync";

const ACTION_LABELS: Record<CommitAction, string> = {
  commit: "Commit",
  amend: "Amend",
  "commit-push": "Commit & Push",
  "commit-sync": "Commit & Sync",
};

const DROPDOWN_LABELS: Record<CommitAction, string> = {
  commit: "Commit",
  amend: "Commit (Amend)",
  "commit-push": "Commit & Push",
  "commit-sync": "Commit & Sync",
};

const ALL_ACTIONS: CommitAction[] = ["commit", "amend", "commit-push", "commit-sync"];

export function CommitBox({ workspacePath, hasStagedChanges, hasUnstagedChanges, onCommitted }: CommitBoxProps) {
  const { t } = useTranslation();
  const [message, setMessage]       = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [action, setAction]         = useState<CommitAction>("commit");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const actionMenuRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenuOpen]);

  const hasChanges = hasStagedChanges || hasUnstagedChanges;


  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { message: msg } = await gitApi.generateCommitMessage(workspacePath);
      setMessage(msg);
      // Trigger auto-resize after generated message is applied
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.overflowY = "hidden";
        el.style.height = "1px";
        const natural = el.scrollHeight;
        el.style.height = `${Math.min(natural, 300)}px`;
        el.style.overflowY = natural > 300 ? "auto" : "hidden";
        el.focus();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate message";
      // Suppress "No Changes" errors — the button should already be disabled but guard here too
      if (!msg.toLowerCase().includes("no changes")) {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  }, [workspacePath]);

  const runAction = useCallback(async (act: CommitAction) => {
    const trimmed = message.trim();
    if (act !== "amend" && !trimmed) return;
    setCommitting(true);
    setError(null);
    try {
      if (act === "amend") {
        await gitApi.commitAmend(workspacePath, trimmed || undefined);
      } else {
        if (!trimmed) return;
        await gitApi.commit(workspacePath, trimmed);
        if (act === "commit-push" || act === "commit-sync") {
          await gitApi.push(workspacePath);
        }
        if (act === "commit-sync") {
          await gitApi.pull(workspacePath);
        }
      }
      setMessage("");
      onCommitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCommitting(false);
    }
  }, [workspacePath, message, onCommitted]);

  const handleCommit = useCallback(() => runAction(action), [runAction, action]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      }
    },
    [handleCommit],
  );

  const busy = generating || committing;
  const canCommit = (action === "amend" || message.trim().length > 0)
    && (hasStagedChanges || hasUnstagedChanges || action === "amend")
    && !busy;

  const branchHint = "main"; // placeholder — shown in textarea placeholder

  // Auto-grow: hidden overflow during measure to avoid scrollbar → reflow loop.
  // Shows scrollbar only when content exceeds 300px (max height).
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setMessage(el.value);
    el.style.overflowY = "hidden";
    el.style.height = "1px";
    const natural = el.scrollHeight;
    const capped = Math.min(natural, 300);
    el.style.height = `${capped}px`;
    el.style.overflowY = natural > 300 ? "auto" : "hidden";
  }, []);

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-white/[0.07] px-3 py-2.5">
      {/* Input group: textarea + AI generate button */}
      <div className="flex items-stretch rounded-[4px] border border-white/[0.15] bg-black/[0.08] transition-[border-color] focus-within:border-white/20 overflow-hidden">
        <textarea
          ref={textareaRef}
          rows={1}
          className="commit-textarea min-w-0 flex-1 resize-none border-none bg-transparent px-3 py-2 text-[13px] leading-relaxed text-white/85 placeholder:text-white/25 outline-none disabled:opacity-50 rounded-none"
          style={{ fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowY: "hidden", minHeight: "34px", maxHeight: "300px", borderRadius: 0 }}
          placeholder={`Message (⌘↵ to ${ACTION_LABELS[action].toLowerCase()} on "${branchHint}")`}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          disabled={busy}
          spellCheck={false}
        />

        {/* AI generate — outline control, flush right */}
        <Tooltip
          content={hasChanges ? "Generate commit message" : "No changes to generate from"}
          position="top"
        >
            <button
              type="button"
              className="flex h-full mb-auto max-h-[40px] min-w-[36px] items-center justify-center rounded-bl-[5px] self-center bg-transparent px-2 text-white/45 transition-[color,background-color,border-color] bg-black/[0.15] hover:bg-black/[0.28] hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleGenerate}
              disabled={busy || !hasChanges}
            >
              {generating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 60"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18.524,43.234c.103.455.508.779.976.779s.873-.324.976-.779c2.249-9.954,3.79-11.496,13.745-13.745.456-.104.779-.508.779-.976s-.324-.872-.779-.976c-9.955-2.248-11.497-3.79-13.745-13.745-.103-.455-.508-.779-.976-.779s-.873.324-.976.779c-2.249,9.955-3.79,11.497-13.745,13.745-.456.104-.78.508-.78.976s.324.872.78.976c9.955,2.249,11.496,3.791,13.745,13.745Zm.976-25.147c1.832,6.278,4.149,8.595,10.427,10.427-6.278,1.832-8.595,4.149-10.427,10.427-1.832-6.277-4.149-8.595-10.427-10.427,6.278-1.832,8.595-4.148,10.427-10.427Z"/>
                  <path d="m43.221,12.039c-5.292-1.195-6.035-1.938-7.23-7.229-.104-.456-.508-.779-.976-.779s-.872.323-.976.779c-1.195,5.291-1.938,6.034-7.229,7.229-.456.104-.779.508-.779.976s.323.872.779.976c5.291,1.195,6.034,1.938,7.229,7.23.104.455.508.779.976.779s.872-.324.976-.779c1.195-5.292,1.938-6.035,7.23-7.23.455-.104.779-.508.779-.976s-.324-.872-.779-.976Zm-8.206,5.301c-.87-2.277-2.047-3.455-4.325-4.325,2.278-.87,3.455-2.047,4.325-4.325.87,2.278,2.048,3.455,4.325,4.325-2.277.87-3.455,2.048-4.325,4.325Z"/>
                </svg>
              )}
            </button>
        </Tooltip>
      </div>

      {/* Error */}
      {error && (
        <p className="m-0 rounded-[5px] bg-red-500/10 px-2 py-1 font-mono text-[10.5px] text-red-400">{error}</p>
      )}

      {/* Commit button (full width) + action dropdown */}
      <div className="flex items-stretch gap-0 w-full">
        <button
          className="flex flex-1 items-center justify-center gap-1.5 rounded-l-[4px] border border-r-0 border-white/[0.10] bg-[#16161633] py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-default disabled:opacity-40"
          style={{ fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
          onClick={handleCommit}
          disabled={!canCommit}
          title={`${ACTION_LABELS[action]} (⌘↵)`}
        >
          {committing ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {committing ? ACTION_LABELS[action] + "…" : ACTION_LABELS[action]}
        </button>

        {/* Divider */}
        <div className="w-px bg-white/[0.10]" />

        <div ref={actionMenuRef} className="relative">
          <button
            className="flex h-full items-center justify-center rounded-r-[4px] border border-l-0 border-white/[0.10] bg-[#16161633] px-2 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 disabled:cursor-default"
            onClick={() => setActionMenuOpen((v) => !v)}
            disabled={busy}
            title={t("git.moreCommitOptions")}
          >
            {busy && !committing ? (
              <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {actionMenuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                right: 0,
                minWidth: 160,
                background: "#1c1c1f",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                overflow: "hidden",
                zIndex: 1000,
                padding: 4,
              }}
            >
              {ALL_ACTIONS.map((act) => {
                const isSelected = act === action;
                return (
                  <button
                    key={act}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      background: isSelected ? "#0969da" : "none",
                      border: "none",
                      borderRadius: 5,
                      color: isSelected ? "#ffffff" : "rgba(255,255,255,0.72)",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "none";
                    }}
                    onClick={() => {
                      setAction(act);
                      setActionMenuOpen(false);
                    }}
                  >
                    {DROPDOWN_LABELS[act]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
