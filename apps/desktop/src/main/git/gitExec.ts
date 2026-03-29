import { execFile } from "node:child_process";
import { accessSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 50 * 1024 * 1024; // 50 MB

export async function execGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: MAX_BUFFER });
  return stdout;
}

export function isGitRepo(cwd: string): boolean {
  try {
    accessSync(join(cwd, ".git"));
    return true;
  } catch {
    return false;
  }
}

export function assertGitRepo(cwd: string): void {
  if (!isGitRepo(cwd)) throw new Error("Not a git repository");
}
