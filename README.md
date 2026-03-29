# Volt

<p align="center">
  <img src="https://github.com/LeulAria/VOLT/raw/main/apps/docs/public/hero-ide.png" alt="Hero IDE" width="100%" />
</p>

Volt is the **agentic development environment**: your editor, canvas, Git, terminal, and **AI agents that ship**—in one surface. Built for flow, not tab sprawl.

## Install

**[Download the latest release](https://github.com/LeulAria/VOLT/releases/latest)** (macOS, Apple Silicon)

Or install from the command line:

```sh
curl -fsSL https://raw.githubusercontent.com/LeulAria/VOLT/main/install.sh | bash
```

## Stack

Volt is a native desktop app built with:

- **Electron** — desktop shell with multi-webview architecture
- **React** — UI
- **Tailwind CSS** — styling
- **electron-vite** — build tooling with hot reload
- **xterm.js** — terminal emulation (backed by persistent sessions where applicable)
- **Monaco** — code editing
- Rich markdown editing where notes are used

Local-first: your data stays on disk.

## Development

```bash
# Install dependencies
bun install

# Start development
bun run dev
```

## Build

```bash
# For macOS
bun run package:mac

# For Windows
bun run package:win

# For Linux
bun run package:linux
```
