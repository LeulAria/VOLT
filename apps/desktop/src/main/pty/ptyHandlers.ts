import { ipcMain, BrowserWindow } from "electron";
import * as pty from "node-pty";
import { ptyPool } from "./PtyPool";

interface Session {
  process: pty.IPty;
}

const sessions = new Map<string, Session>();

function createBatcher(send: (data: string) => void): (chunk: string) => void {
  let buffer = "";
  let scheduled = false;

  return (chunk: string) => {
    buffer += chunk;

    if (buffer.length > 200_000) {
      send(buffer);
      buffer = "";
      scheduled = false;
      return;
    }

    if (!scheduled) {
      scheduled = true;
      setImmediate(() => {
        if (buffer.length > 0) {
          send(buffer);
          buffer = "";
        }
        scheduled = false;
      });
    }
  };
}

export function registerPtyHandlers(): void {
  // Create a new PTY session, returns sessionId
  ipcMain.handle("pty:create", (_event, { cwd, command }: { cwd?: string; command?: string }) => {
    const { id: sessionId, process: proc } = ptyPool.claim(cwd);

    const win = BrowserWindow.getAllWindows()[0];

    const batch = createBatcher((data) => {
      win?.webContents.send("pty:data", { id: sessionId, data });
    });

    proc.onData(batch);

    proc.onExit(({ exitCode }) => {
      sessions.delete(sessionId);
      win?.webContents.send("pty:exit", { id: sessionId, exitCode });
    });

    if (command) {
      proc.write(command + "\r");
    }

    sessions.set(sessionId, { process: proc });
    return sessionId;
  });

  // Write input to PTY
  ipcMain.on("pty:write", (_event, { id, data }: { id: string; data: string }) => {
    sessions.get(id)?.process.write(data);
  });

  // Resize PTY
  ipcMain.on(
    "pty:resize",
    (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
      sessions.get(id)?.process.resize(cols, rows);
    },
  );

  // Kill PTY session
  ipcMain.handle("pty:kill", (_event, { id }: { id: string }) => {
    const session = sessions.get(id);
    if (session) {
      session.process.kill();
      sessions.delete(id);
    }
  });
}
