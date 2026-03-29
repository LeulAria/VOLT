import * as pty from "node-pty";
import os from "os";
import { randomUUID } from "crypto";

function detectShell(): string {
  if (process.platform === "win32") return "powershell.exe";
  return process.env.SHELL ?? "/bin/zsh";
}

interface PoolEntry {
  id: string;
  process: pty.IPty;
}

const POOL_SIZE = 3;

class PtyPool {
  private pool: PoolEntry[] = [];

  init(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.spawn());
    }
  }

  private spawn(cwd?: string): PoolEntry {
    const proc = pty.spawn(detectShell(), [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: cwd ?? os.homedir(),
      env: { ...(process.env as Record<string, string>), LANG: "en_US.UTF-8", PROMPT_EOL_MARK: "" },
    });
    return { id: randomUUID(), process: proc };
  }

  claim(cwd?: string): PoolEntry {
    const entry = cwd ? this.spawn(cwd) : (this.pool.shift() ?? this.spawn());
    setImmediate(() => this.pool.push(this.spawn()));
    return entry;
  }
}

export const ptyPool = new PtyPool();
