import { ipcMain } from "electron";
import { join } from "node:path";
import { execGit, isGitRepo, assertGitRepo } from "./gitExec";
import {
  canGenerate,
  getAvailableAgent,
  generateCommitMessageViaCli,
  generateCommitMessageViaApi,
} from "./aiCommit";

// ─── Types (inline — no shared package needed) ────────────────────────────────

export interface GitFileChange {
  path: string;
  absPath: string;
  status: "M" | "A" | "D" | "R" | "U" | "?";
  oldPath?: string;
}

export interface GitStatusResult {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: GitFileChange[];
  isGitRepo: boolean;
}

export interface GitBranch {
  name: string;
  current: boolean;
  upstream?: string;
  isRemote: boolean;
}

export interface GitStash {
  index: number;
  message: string;
  date: string;
}

// ─── Status parsing ───────────────────────────────────────────────────────────

function mapStatus(char: string): GitFileChange["status"] {
  switch (char) {
    case "M":
      return "M";
    case "A":
      return "A";
    case "D":
      return "D";
    case "R":
      return "R";
    case "C":
      return "A";
    case "U":
      return "U";
    default:
      return "M";
  }
}

async function gitStatus(cwd: string): Promise<GitStatusResult> {
  if (!isGitRepo(cwd)) {
    return {
      branch: "",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      isGitRepo: false,
    };
  }

  const raw = await execGit(cwd, ["status", "--porcelain=v2", "--branch", "-uall"]);

  let branch = "";
  let upstream: string | undefined;
  let ahead = 0;
  let behind = 0;
  const staged: GitFileChange[] = [];
  const unstaged: GitFileChange[] = [];
  const untracked: GitFileChange[] = [];

  for (const line of raw.split("\n")) {
    if (!line) continue;

    if (line.startsWith("# branch.head ")) {
      branch = line.slice("# branch.head ".length);
    } else if (line.startsWith("# branch.upstream ")) {
      upstream = line.slice("# branch.upstream ".length);
    } else if (line.startsWith("# branch.ab ")) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) {
        ahead = parseInt(m[1]!, 10);
        behind = parseInt(m[2]!, 10);
      }
    } else if (line.startsWith("? ")) {
      const path = line.slice(2);
      untracked.push({ path, absPath: join(cwd, path), status: "?" });
    } else if (line.startsWith("u ")) {
      const parts = line.split(" ");
      const path = parts.slice(10).join(" ");
      unstaged.push({ path, absPath: join(cwd, path), status: "U" });
    } else if (line.startsWith("1 ")) {
      const parts = line.split(" ");
      const xy = parts[1]!;
      const path = parts.slice(8).join(" ");
      if (xy[0] !== ".") staged.push({ path, absPath: join(cwd, path), status: mapStatus(xy[0]!) });
      if (xy[1] !== ".")
        unstaged.push({ path, absPath: join(cwd, path), status: mapStatus(xy[1]!) });
    } else if (line.startsWith("2 ")) {
      const parts = line.split("\t");
      const meta = parts[0]!.split(" ");
      const xy = meta[1]!;
      const newPath = meta.slice(9).join(" ");
      const oldPath = parts[1]!;
      if (xy[0] !== ".")
        staged.push({ path: newPath, absPath: join(cwd, newPath), status: "R", oldPath });
      if (xy[1] !== ".")
        unstaged.push({ path: newPath, absPath: join(cwd, newPath), status: "R", oldPath });
    }
  }

  return { branch, upstream, ahead, behind, staged, unstaged, untracked, isGitRepo: true };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerGitHandlers(): void {
  ipcMain.handle("git:status", async (_, workspacePath: string) => {
    return gitStatus(workspacePath);
  });

  ipcMain.handle(
    "git:stage",
    async (_, { workspacePath, paths }: { workspacePath: string; paths: string[] }) => {
      assertGitRepo(workspacePath);
      if (paths.length === 0) return;
      await execGit(workspacePath, ["add", "--", ...paths]);
    },
  );

  ipcMain.handle(
    "git:unstage",
    async (_, { workspacePath, paths }: { workspacePath: string; paths: string[] }) => {
      assertGitRepo(workspacePath);
      if (paths.length === 0) return;
      await execGit(workspacePath, ["restore", "--staged", "--", ...paths]);
    },
  );

  ipcMain.handle("git:stage-all", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    await execGit(workspacePath, ["add", "-A"]);
  });

  ipcMain.handle("git:unstage-all", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    try {
      await execGit(workspacePath, ["reset", "HEAD"]);
    } catch {
      await execGit(workspacePath, ["rm", "--cached", "-r", "."]);
    }
  });

  ipcMain.handle(
    "git:discard",
    async (_, { workspacePath, paths }: { workspacePath: string; paths: string[] }) => {
      assertGitRepo(workspacePath);
      if (paths.length === 0) return;

      // Detect untracked vs tracked
      const statusRaw = await execGit(workspacePath, ["status", "--porcelain", "--", ...paths]);
      const untracked: string[] = [];
      const tracked: string[] = [];
      for (const line of statusRaw.split("\n")) {
        if (!line) continue;
        const stat = line.slice(0, 2);
        const fp = line.slice(3);
        if (stat === "??") untracked.push(fp);
        else tracked.push(fp);
      }
      if (tracked.length > 0) await execGit(workspacePath, ["checkout", "--", ...tracked]);
      if (untracked.length > 0) await execGit(workspacePath, ["clean", "-f", "--", ...untracked]);
    },
  );

  ipcMain.handle("git:discard-all", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    await execGit(workspacePath, ["checkout", "--", "."]);
    await execGit(workspacePath, ["clean", "-fd"]);
  });

  /** Restore staged paths to HEAD (index + worktree). Empty paths = all staged files. */
  ipcMain.handle(
    "git:discard-staged",
    async (_, { workspacePath, paths }: { workspacePath: string; paths?: string[] }) => {
      assertGitRepo(workspacePath);
      let list = paths?.filter(Boolean) ?? [];
      if (list.length === 0) {
        const raw = await execGit(workspacePath, ["diff", "--cached", "--name-only"]);
        list = raw.split("\n").filter(Boolean);
      }
      if (list.length === 0) return;
      await execGit(workspacePath, ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...list]);
    },
  );

  ipcMain.handle("git:fetch", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    await execGit(workspacePath, ["fetch", "--prune"]);
  });

  ipcMain.handle(
    "git:commit",
    async (_, { workspacePath, message }: { workspacePath: string; message: string }) => {
      assertGitRepo(workspacePath);
      if (!message.trim()) throw new Error("Commit message cannot be empty");
      const out = await execGit(workspacePath, ["commit", "-m", message]);
      const m = out.match(/\[.+\s+([a-f0-9]+)\]/);
      return { hash: m?.[1] ?? "" };
    },
  );

  ipcMain.handle(
    "git:diff",
    async (
      _,
      {
        workspacePath,
        filePath,
        cached,
      }: { workspacePath: string; filePath: string; cached: boolean },
    ) => {
      assertGitRepo(workspacePath);
      const args = ["diff"];
      if (cached) args.push("--cached");
      args.push("--", filePath);
      return execGit(workspacePath, args);
    },
  );

  ipcMain.handle("git:branches", async (_, workspacePath: string) => {
    if (!isGitRepo(workspacePath)) return [];
    const raw = await execGit(workspacePath, [
      "branch",
      "-a",
      "--format=%(refname:short)|%(HEAD)|%(upstream:short)",
    ]);
    const branches: GitBranch[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const parts = line.split("|");
      const name = parts[0]!.trim();
      if (name.endsWith("/HEAD")) continue;
      branches.push({
        name,
        current: parts[1]?.trim() === "*",
        upstream: parts[2]?.trim() || undefined,
        isRemote: name.includes("/"),
      });
    }
    return branches;
  });

  ipcMain.handle(
    "git:checkout",
    async (_, { workspacePath, branch }: { workspacePath: string; branch: string }) => {
      assertGitRepo(workspacePath);
      await execGit(workspacePath, ["checkout", branch]);
    },
  );

  ipcMain.handle(
    "git:create-branch",
    async (
      _,
      {
        workspacePath,
        name,
        startPoint,
      }: { workspacePath: string; name: string; startPoint?: string },
    ) => {
      assertGitRepo(workspacePath);
      const args = ["checkout", "-b", name];
      if (startPoint) args.push(startPoint);
      await execGit(workspacePath, args);
    },
  );

  ipcMain.handle("git:stash-list", async (_, workspacePath: string) => {
    if (!isGitRepo(workspacePath)) return [];
    try {
      const raw = await execGit(workspacePath, ["stash", "list", "--format=%gd|%s|%ai"]);
      const stashes: GitStash[] = [];
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("|");
        if (parts.length < 3) continue;
        const ref = parts[0]!;
        const idx = ref.match(/\{(\d+)\}/);
        stashes.push({
          index: idx ? parseInt(idx[1]!, 10) : 0,
          message: parts[1]!.trim(),
          date: parts[2]!.trim(),
        });
      }
      return stashes;
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    "git:stash-save",
    async (
      _,
      {
        workspacePath,
        message,
        staged,
      }: { workspacePath: string; message?: string; staged?: boolean },
    ) => {
      assertGitRepo(workspacePath);
      const args = ["stash", "push"];
      if (staged) args.push("--staged");
      if (message) args.push("-m", message);
      await execGit(workspacePath, args);
    },
  );

  ipcMain.handle(
    "git:stash-pop",
    async (_, { workspacePath, index }: { workspacePath: string; index: number }) => {
      assertGitRepo(workspacePath);
      await execGit(workspacePath, ["stash", "pop", `stash@{${index}}`]);
    },
  );

  ipcMain.handle(
    "git:stash-apply",
    async (_, { workspacePath, index }: { workspacePath: string; index: number }) => {
      assertGitRepo(workspacePath);
      await execGit(workspacePath, ["stash", "apply", `stash@{${index}}`]);
    },
  );

  ipcMain.handle(
    "git:stash-drop",
    async (_, { workspacePath, index }: { workspacePath: string; index: number }) => {
      assertGitRepo(workspacePath);
      await execGit(workspacePath, ["stash", "drop", `stash@{${index}}`]);
    },
  );

  ipcMain.handle(
    "git:stash-files",
    async (_, { workspacePath, index }: { workspacePath: string; index: number }) => {
      if (!isGitRepo(workspacePath)) return [];
      try {
        const out = await execGit(workspacePath, [
          "stash",
          "show",
          "--name-status",
          `stash@{${index}}`,
        ]);
        return out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [status, ...rest] = line.split("\t");
            const path = rest.join("\t");
            return { path, absPath: join(workspacePath, path), status: status?.[0] ?? "M" };
          });
      } catch {
        return [];
      }
    },
  );

  ipcMain.handle(
    "git:show-file",
    async (
      _,
      { workspacePath, ref, filePath }: { workspacePath: string; ref: string; filePath: string },
    ) => {
      if (!isGitRepo(workspacePath)) return "";
      const spec = ref ? `${ref}:${filePath}` : `:${filePath}`;
      try {
        return await execGit(workspacePath, ["show", spec]);
      } catch {
        return "";
      }
    },
  );

  ipcMain.handle("git:generate-commit-message", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    // Get full diff (staged first, fallback to all)
    let diff = "";
    try {
      diff = await execGit(workspacePath, ["diff", "--cached"]);
    } catch {
      /* */
    }
    if (!diff.trim()) {
      try {
        diff = await execGit(workspacePath, ["diff"]);
      } catch {
        /* */
      }
    }
    if (!diff.trim()) throw new Error("No changes to generate a commit message for");

    const agent = getAvailableAgent();
    if (agent) return generateCommitMessageViaCli(agent, diff);
    // Fallback: Anthropic API (requires ANTHROPIC_API_KEY env var)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) return generateCommitMessageViaApi(apiKey, diff);
    throw new Error(
      "No AI agent available (install claude, codex, or gemini CLI, or set ANTHROPIC_API_KEY)",
    );
  });

  ipcMain.handle("git:can-generate-commit", async () => {
    return canGenerate();
  });

  // Worktrees
  ipcMain.handle("git:worktrees", async (_, workspacePath: string) => {
    if (!isGitRepo(workspacePath)) return [];
    try {
      const out = await execGit(workspacePath, ["worktree", "list", "--porcelain"]);
      const entries: Array<{ path: string; branch: string; isMain: boolean }> = [];
      let cur: Partial<{ path: string; branch: string; isMain: boolean }> = {};
      for (const line of out.split("\n")) {
        if (line.startsWith("worktree ")) {
          cur = { path: line.slice(9).trim(), isMain: false };
        } else if (line.startsWith("branch refs/heads/")) {
          cur.branch = line.slice(18).trim();
        } else if (line === "bare") {
          cur.isMain = true;
        } else if (line === "") {
          if (cur.path) {
            entries.push({ path: cur.path, branch: cur.branch ?? "", isMain: cur.isMain ?? false });
          }
          cur = {};
        }
      }
      if (cur.path)
        entries.push({ path: cur.path, branch: cur.branch ?? "", isMain: cur.isMain ?? false });
      return entries;
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    "git:commits",
    async (
      _,
      {
        workspacePath,
        branch,
        offset,
        limit,
      }: { workspacePath: string; branch?: string; offset: number; limit: number },
    ) => {
      if (!isGitRepo(workspacePath)) return [];
      const ref = branch ?? "HEAD";
      try {
        const out = await execGit(workspacePath, [
          "log",
          ref,
          "--format=%H\x1f%an\x1f%ae\x1f%ar\x1f%s",
          `--skip=${offset}`,
          `--max-count=${limit}`,
        ]);
        return out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [hash, author, email, date, ...msgParts] = line.split("\x1f");
            return {
              hash: hash ?? "",
              author: author ?? "",
              email: email ?? "",
              date: date ?? "",
              message: msgParts.join("\x1f") ?? "",
            };
          });
      } catch {
        return [];
      }
    },
  );

  ipcMain.handle(
    "git:commit-files",
    async (_, { workspacePath, hash }: { workspacePath: string; hash: string }) => {
      if (!isGitRepo(workspacePath)) return [];
      try {
        const out = await execGit(workspacePath, ["show", "--name-status", "--format=", hash]);
        return out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [status, ...rest] = line.split("\t");
            const path = rest.join("\t");
            return {
              path,
              absPath: join(workspacePath, path),
              status: (status?.[0] ?? "M") as "M" | "A" | "D" | "R",
            };
          });
      } catch {
        return [];
      }
    },
  );

  ipcMain.handle(
    "git:stash-edit",
    async (_, { workspacePath, index }: { workspacePath: string; index: number }) => {
      assertGitRepo(workspacePath);
      // Pop the stash so changes appear as unstaged (user can edit and re-stash)
      await execGit(workspacePath, ["stash", "pop", `stash@{${index}}`]);
    },
  );

  // ── Contributors ──────────────────────────────────────────────────────────
  ipcMain.handle("git:contributors", async (_, workspacePath: string) => {
    if (!isGitRepo(workspacePath)) return [];
    try {
      const raw = await execGit(workspacePath, ["shortlog", "-s", "-n", "--no-merges", "HEAD"]);
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const m = line.match(/^\s*(\d+)\s+(.+)$/);
          if (!m) return null;
          return { name: m[2].trim(), commits: parseInt(m[1], 10) };
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  });

  // ── Stash rename (pop + re-stash with new message) ────────────────────────
  ipcMain.handle(
    "git:stash-rename",
    async (
      _,
      { workspacePath, index, message }: { workspacePath: string; index: number; message: string },
    ) => {
      assertGitRepo(workspacePath);
      await execGit(workspacePath, ["stash", "pop", `stash@{${index}}`]);
      await execGit(workspacePath, ["stash", "push", "-u", "-m", message]);
    },
  );

  // ── Initialize repository ─────────────────────────────────────────────────
  ipcMain.handle("git:init", async (_, workspacePath: string) => {
    await execGit(workspacePath, ["init"]);
  });

  // ── Pull (sync) ─────────────────────────────────────────────────────────
  ipcMain.handle("git:pull", async (_, workspacePath: string) => {
    await execGit(workspacePath, ["pull", "--ff-only"]);
  });

  // ── Push ─────────────────────────────────────────────────────────────────
  ipcMain.handle("git:push", async (_, workspacePath: string) => {
    assertGitRepo(workspacePath);
    await execGit(workspacePath, ["push"]);
  });

  // ── Commit amend ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "git:commit-amend",
    async (_, { workspacePath, message }: { workspacePath: string; message?: string }) => {
      assertGitRepo(workspacePath);
      const args = message
        ? ["commit", "--amend", "-m", message]
        : ["commit", "--amend", "--no-edit"];
      const out = await execGit(workspacePath, args);
      const hash = out.match(/\[[\w/]+ ([a-f0-9]+)\]/)?.[1] ?? "";
      return { hash };
    },
  );
}
