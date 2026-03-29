import { useRef, useCallback } from "react";

/**
 * Keyboard event to terminal escape sequence converter.
 * Handles Enter, Backspace, arrows, Ctrl+letter combos, etc.
 */
function keyEventToTerminalChar(e: React.KeyboardEvent): string {
  const { key, ctrlKey } = e;

  // Special keys
  if (key === "Enter") return "\r";
  if (key === "Backspace") return "\x7f";
  if (key === "Tab") return "\t";
  if (key === "Escape") return "\x1b";
  if (key === "Delete") return "\x1b[3~";
  if (key === "ArrowUp") return "\x1b[A";
  if (key === "ArrowDown") return "\x1b[B";
  if (key === "ArrowRight") return "\x1b[C";
  if (key === "ArrowLeft") return "\x1b[D";
  if (key === "Home") return "\x1b[H";
  if (key === "End") return "\x1b[F";
  if (key === "PageUp") return "\x1b[5~";
  if (key === "PageDown") return "\x1b[6~";

  // Ctrl+letter combos (Ctrl+C = \x03, Ctrl+D = \x04, etc.)
  if (ctrlKey && key.length === 1) {
    return String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64);
  }

  // Normal character
  if (key.length === 1) return key;

  return "";
}

export interface TypeaheadQueueRef {
  queue: string[];
  isReady: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Manages a typeahead queue for terminal input before the PTY is ready.
 * Returns { queue, isReady, overlayRef, onOverlayKeyDown, onTerminalReady }
 */
export function useTerminalTypeahead() {
  const typeaheadQueue = useRef<string[]>([]);
  const isReady = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onOverlayKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Let modifier-only keys pass through
    if (
      e.key.length > 1 &&
      ![
        "Enter",
        "Backspace",
        "Tab",
        "Delete",
        "Escape",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(e.key)
    ) {
      return;
    }

    const char = keyEventToTerminalChar(e);
    if (!char) return;

    e.preventDefault();
    e.stopPropagation();

    if (isReady.current) {
      // Terminal is ready; handle directly
      // (actual write will be done by caller via onTerminalReady)
    } else {
      // Queue the character for later
      typeaheadQueue.current.push(char);
    }
  }, []);

  const flushQueue = useCallback((writeToTerminal: (data: string) => void) => {
    if (typeaheadQueue.current.length > 0) {
      typeaheadQueue.current.forEach((c) => writeToTerminal(c));
      typeaheadQueue.current = [];
    }
  }, []);

  const markReady = useCallback(() => {
    isReady.current = true;
  }, []);

  return {
    typeaheadQueue,
    isReady,
    overlayRef,
    onOverlayKeyDown,
    flushQueue,
    markReady,
  };
}
