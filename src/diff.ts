/**
 * Read and prepare the staged git diff for summarization.
 */
import { execFileSync } from "node:child_process";

export interface StagedChange {
  files: string[];
  diff: string;
  truncated: boolean;
}

/** Run a git command and return stdout, or throw a friendly error. */
function git(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    const msg = (err as { stderr?: string }).stderr ?? (err as Error).message;
    throw new Error(`git ${args.join(" ")} failed: ${String(msg).trim()}`);
  }
}

/** List of staged file paths (added/copied/modified/renamed). */
export function stagedFiles(runner: (args: string[]) => string = git): string[] {
  const out = runner(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * Get the staged diff, truncated to `maxChars` so we never blow the model's
 * context on a huge change. Lockfiles and other noisy paths are excluded.
 */
export function stagedDiff(
  maxChars = 12000,
  runner: (args: string[]) => string = git,
): StagedChange {
  const files = stagedFiles(runner);
  const raw = runner([
    "diff",
    "--cached",
    "--no-color",
    "--",
    ".",
    ":(exclude)*.lock",
    ":(exclude)*-lock.json",
    ":(exclude)*-lock.yaml",
  ]);
  return truncateDiff(raw, files, maxChars);
}

/** Pure, testable truncation helper. */
export function truncateDiff(
  raw: string,
  files: string[],
  maxChars: number,
): StagedChange {
  if (raw.length <= maxChars) {
    return { files, diff: raw, truncated: false };
  }
  const head = raw.slice(0, maxChars);
  // Cut at the last newline so we don't end mid-line.
  const lastNl = head.lastIndexOf("\n");
  const diff = (lastNl > 0 ? head.slice(0, lastNl) : head) +
    "\n\n[... diff truncated for length ...]";
  return { files, diff, truncated: true };
}
