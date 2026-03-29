import { spawn, execFileSync } from "node:child_process";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentId = "claude" | "codex" | "gemini";

const AGENT_CMDS: Record<AgentId, string> = {
  claude: "claude",
  codex: "codex",
  gemini: "gemini",
};

const AGENT_NAMES: Record<AgentId, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
};

const PRIORITY: AgentId[] = ["claude", "codex", "gemini"];

// ─── Prompt ──────────────────────────────────────────────────────────────────

const COMMIT_PROMPT = `You are a commit message generator. Analyze the provided git diff and write a concise, conventional commit message.

Rules:
1. Use conventional commits format: type(scope): description
2. Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build
3. The first line MUST be 72 characters or fewer
4. Focus on WHY the change was made, not WHAT changed (the diff shows what)
5. If the scope is obvious from the diff, include it; otherwise omit it
6. For complex changes, add a blank line then a brief body (2-3 bullet points max)
7. Do not wrap the message in markdown code fences or quotes
8. Do not include the diff in your response
9. If the diff is truncated, infer intent from the visible portion

Output ONLY the commit message text, nothing else.`;

// ─── Diff preparation ────────────────────────────────────────────────────────

const MAX_DIFF_CHARS = 100_000;

function prepareDiff(raw: string): string {
  if (raw.length <= MAX_DIFF_CHARS) return raw;
  const lines = raw.split("\n");
  let chars = 0;
  let cut = 0;
  for (let i = 0; i < lines.length; i++) {
    chars += lines[i]!.length + 1;
    if (chars > MAX_DIFF_CHARS) {
      cut = i;
      break;
    }
  }
  return `${lines.slice(0, cut).join("\n")}\n\n[TRUNCATED -- showing first ${cut} of ${lines.length} lines]`;
}

// ─── Agent detection ─────────────────────────────────────────────────────────

function agentDetected(id: AgentId): boolean {
  try {
    execFileSync("which", [AGENT_CMDS[id]], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function getAvailableAgent(): AgentId | null {
  for (const id of PRIORITY) {
    if (agentDetected(id)) return id;
  }
  return null;
}

export function canGenerate(): { available: boolean; agent?: string } {
  const agent = getAvailableAgent();
  if (agent) return { available: true, agent: AGENT_NAMES[agent] };
  return { available: false };
}

// ─── CLI generation ───────────────────────────────────────────────────────────

function runCliAgent(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("error", (err) => reject(new Error(`Failed to run ${command}: ${err.message}`)));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function cleanMessage(raw: string): string {
  let msg = raw.trim();
  if (msg.startsWith("```") && msg.endsWith("```")) msg = msg.slice(3, -3).trim();
  if (msg.startsWith("```")) msg = msg.slice(msg.indexOf("\n") + 1).trim();
  return msg;
}

export async function generateCommitMessageViaCli(
  agent: AgentId,
  diff: string,
): Promise<{ message: string; agent: string }> {
  const prompt = `${COMMIT_PROMPT}\n\nHere is the git diff:\n\n${prepareDiff(diff)}`;
  let result: string;
  switch (agent) {
    case "claude":
      result = await runCliAgent("claude", ["-p", prompt]);
      break;
    case "codex":
      result = await runCliAgent("codex", ["--quiet", "--prompt", prompt]);
      break;
    case "gemini":
      result = await runCliAgent("gemini", ["--prompt", prompt]);
      break;
  }
  return { message: cleanMessage(result), agent: AGENT_NAMES[agent] };
}

// ─── API fallback ─────────────────────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

export async function generateCommitMessageViaApi(
  apiKey: string,
  diff: string,
): Promise<{ message: string; agent: string }> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: COMMIT_PROMPT,
      messages: [{ role: "user", content: prepareDiff(diff) }],
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message: string } };
    throw new Error(`API error (${res.status}): ${body.error?.message ?? res.statusText}`);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  return { message: text.trim(), agent: "Anthropic API" };
}
