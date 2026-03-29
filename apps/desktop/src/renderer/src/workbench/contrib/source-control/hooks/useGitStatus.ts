import { useEffect, useRef, useCallback } from "react";
import { gitApi } from "../types";
import { useGitStore } from "../store/useGitStore";

const POLL_MS = 3_000;

/**
 * Polls git status for the given workspace and keeps `useGitStore` in sync.
 * Also refreshes on window focus.
 */
export function useGitStatus(workspacePath: string | null) {
  const { setStatus, setStashes } = useGitStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const [status, stashes] = await Promise.all([
        gitApi.status(workspacePath),
        gitApi.stashList(workspacePath),
      ]);
      setStatus(workspacePath, status);
      setStashes(workspacePath, stashes);
    } catch {
      // ignore — workspace may not be a git repo
    }
  }, [workspacePath, setStatus, setStashes]);

  useEffect(() => {
    if (!workspacePath) return;

    refresh();

    const poll = () => {
      refresh();
      timerRef.current = setTimeout(poll, POLL_MS);
    };
    timerRef.current = setTimeout(poll, POLL_MS);

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [workspacePath, refresh]);

  return { refresh };
}
