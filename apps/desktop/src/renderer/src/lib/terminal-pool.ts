import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";

export interface PooledTerminal {
  terminal: Terminal;
  fit: FitAddon;
  container: HTMLDivElement;
}

const TERMINAL_THEME = {
  background: "#191919",
  foreground: "#d4d4d4",
  cursor: "#d4d4d4",
  cursorAccent: "#191919",
  selectionBackground: "#264f78",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#ffffff",
};

export const TERMINAL_OPTIONS = {
  allowProposedApi: true,
  scrollback: 5000,
  cursorBlink: true,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 12,
  fontWeight: "300" as const,
  fontWeightBold: "500" as const,
  theme: TERMINAL_THEME,
};

export function createTerminal(container: HTMLDivElement): PooledTerminal {
  const terminal = new Terminal(TERMINAL_OPTIONS);
  const fit = new FitAddon();

  terminal.loadAddon(fit);
  terminal.open(container);

  // WebGL renderer: avoids partial-paint artifacts the DOM/canvas
  // renderer can show during rapid sequential writes.
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    terminal.loadAddon(webgl);
  } catch {
    // DOM renderer fallback
  }

  // Double-rAF: ensure the layout pass has finished before measuring
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fit.fit());
  });

  return { terminal, fit, container };
}
