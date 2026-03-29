import { useEffect, useRef, useState } from "react";
import { createTerminal, type PooledTerminal } from "../../../../lib/terminal-pool";
import { useTileStore } from "../store/useTileStore";
import { useTerminalTypeahead } from "../../../../platform/hooks/useTerminalTypeahead";

// Coalesces rapid PTY data events into a single term.write() call,
// preventing partial-render artifacts (same approach as VS Code).
const DATA_BUFFER_FLUSH_MS = 5;

interface TerminalViewProps {
  tileId?: string;
  cwd?: string;
  initialCommand?: string;
}

export function TerminalView({ tileId, cwd, initialCommand }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { typeaheadQueue, isReady, overlayRef, onOverlayKeyDown, flushQueue, markReady } =
    useTerminalTypeahead();
  const updateTile = useTileStore((state) => state.updateTile);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const instance: PooledTerminal = createTerminal(el);
    let sessionId: string | null = null;
    let currentCwd = cwd || "/";

    // Auto-focus: immediately focus the invisible overlay so keystrokes are captured
    requestAnimationFrame(() => overlayRef.current?.focus());

    // Create PTY process
    window.electron.pty
      .create({ cwd })
      .then((id) => {
        if (cancelled) {
          window.electron.pty.kill(id);
          return;
        }
        sessionId = id;

        // Terminal is now ready to receive input
        // Call onTerminalReady to flush typeahead queue
        onTerminalReady();

        // Send initial command (e.g. "claude", "codex") after shell is ready
        if (initialCommand) {
          setTimeout(() => {
            if (sessionId && !cancelled) {
              window.electron.pty.write(sessionId, initialCommand + "\n");
            }
          }, 300);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to start shell");
      });

    // --- Data buffering (coalesce rapid PTY writes) ---
    let dataBuffer: string[] = [];
    let flushTimer: number | undefined;
    let firstData = true;

    const flushData = () => {
      const chunk = dataBuffer.join("");
      dataBuffer.length = 0;
      flushTimer = undefined;
      if (!chunk) return;
      if (firstData) {
        firstData = false;
        instance.terminal.reset();
      }
      instance.terminal.write(chunk);
    };

    // Wire PTY output → terminal display (buffered)
    const unsubData = window.electron.pty.onData((payload) => {
      if (payload.id === sessionId) {
        const data = payload.data;

        // Parse OSC 7 sequences to track current working directory
        // Format: \x1b]7;file://hostname/path\x07
        // This is the safest method - it only reads shell-provided information
        const oscMatch = data.match(/\x1b\]7;file:\/\/[^/]*(\/[^\x07]*)\x07/);
        if (oscMatch) {
          try {
            const newCwd = decodeURIComponent(oscMatch[1]);
            if (newCwd !== currentCwd) {
              currentCwd = newCwd;
              if (tileId) {
                updateTile(tileId, { filePath: newCwd });
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        dataBuffer.push(data);
        if (flushTimer === undefined) {
          flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
        }
      }
    });

    // Wire PTY exit — close the tile when the process exits
    const unsubExit = window.electron.pty.onExit((payload) => {
      if (payload.id === sessionId) {
        if (tileId) {
          useTileStore.getState().removeTile(tileId);
        }
      }
    });

    // Wire keyboard input → PTY
    const disposeInput = instance.terminal.onData((data) => {
      if (sessionId) {
        window.electron.pty.write(sessionId, data);
      }
    });

    // When terminal becomes ready: flush queued keystrokes
    const onTerminalReady = () => {
      markReady();
      if (typeaheadQueue.current.length > 0) {
        flushQueue((data: string) => {
          if (sessionId) {
            window.electron.pty.write(sessionId, data);
          }
        });
      }
      // Focus the actual terminal and remove overlay
      instance.terminal.focus();
      if (overlayRef.current && overlayRef.current.parentElement) {
        overlayRef.current.remove();
      }
    };

    // Mark ready when PTY is created
    if (sessionId === null) {
      // PTY creation is async, so we mark ready in the .then below
    }

    // Wire terminal resize → PTY resize
    const disposeResize = instance.terminal.onResize(({ cols, rows }) => {
      if (sessionId) {
        window.electron.pty.resize(sessionId, cols, rows);
      }
    });

    // Debounce container resize via rAF
    let rafId = 0;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => instance.fit.fit());
      }
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      if (flushTimer !== undefined) {
        clearTimeout(flushTimer);
        flushData();
      }
      cancelAnimationFrame(rafId);
      unsubData();
      unsubExit();
      disposeInput.dispose();
      disposeResize.dispose();
      ro.disconnect();
      if (sessionId) {
        window.electron.pty.kill(sessionId);
        sessionId = null;
      }
      instance.terminal.dispose();
    };
  }, [cwd]);

  if (error) {
    return (
      <div className="terminal-view flex items-center justify-center text-white/30 text-xs">
        {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Invisible focus overlay for typeahead before terminal is ready */}
      <div
        ref={overlayRef}
        tabIndex={0}
        onKeyDown={onOverlayKeyDown}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          zIndex: 1,
          outline: "none",
          pointerEvents: isReady.current ? "none" : "auto",
        }}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        className="terminal-view w-full h-full flex-1 overflow-hidden rounded-b-[9px] [pointer-events:inherit] bg-[#191919]"
      />
    </div>
  );
}
