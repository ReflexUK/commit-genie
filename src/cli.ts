#!/usr/bin/env node
/**
 * commit-genie CLI.
 *
 *   commit-genie            # print a suggested message
 *   commit-genie --commit   # generate and run `git commit` with it
 *   commit-genie --install-hook
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, chmodSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { stagedDiff } from "./diff.js";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt.js";
import { generate, resolveConfig } from "./llm.js";
import { normalize } from "./message.js";
import { hookScript } from "./hook.js";

interface Args {
  commit: boolean;
  print: boolean;
  installHook: boolean;
  help: boolean;
  hint?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { commit: false, print: false, installHook: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "-c":
      case "--commit":
        args.commit = true;
        break;
      case "--print":
        args.print = true;
        break;
      case "--install-hook":
        args.installHook = true;
        break;
      case "-m":
      case "--hint":
        args.hint = argv[++i];
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
    }
  }
  return args;
}

const HELP = `commit-genie — Conventional Commit messages from your staged diff, via any LLM

Usage:
  git add -A
  commit-genie                 Print a suggested commit message
  commit-genie --commit        Generate the message and create the commit
  commit-genie --hint "..."    Give the model extra context (e.g. an issue #)
  commit-genie --install-hook  Install a prepare-commit-msg git hook
  commit-genie --print         Print only the message (used by the hook)

Configuration (env):
  ANTHROPIC_API_KEY / OPENAI_API_KEY   Provider auto-detected from whichever is set
  COMMIT_GENIE_PROVIDER                Force "anthropic" or "openai"
  COMMIT_GENIE_MODEL                   Override the model
  COMMIT_GENIE_BASE_URL                Point at a gateway / local endpoint
`;

function installHook(): string {
  const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], { encoding: "utf8" }).trim();
  const hooksDir = join(gitDir, "hooks");
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, "prepare-commit-msg");
  writeFileSync(hookPath, hookScript(), "utf8");
  chmodSync(hookPath, 0o755);
  return hookPath;
}

async function suggest(hint?: string): Promise<string> {
  const change = stagedDiff();
  if (!change.diff.trim()) {
    throw new Error("Nothing staged. Run `git add` first.");
  }
  const config = resolveConfig(process.env);
  const raw = await generate(config, SYSTEM_PROMPT, buildUserPrompt(change, { hint }));
  if (!raw) throw new Error("Model returned an empty message.");
  return normalize(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.installHook) {
    const path = installHook();
    process.stdout.write(`Installed prepare-commit-msg hook at ${path}\n`);
    return;
  }

  const message = await suggest(args.hint);

  if (args.print) {
    process.stdout.write(message + "\n");
    return;
  }

  if (args.commit) {
    execFileSync("git", ["commit", "-m", message], { stdio: "inherit" });
    return;
  }

  // Default: show the suggestion and how to use it.
  process.stdout.write(`${message}\n`);
  process.stderr.write(`\n(run with --commit to commit, or pipe: git commit -m "$(commit-genie --print)")\n`);
}

main().catch((err) => {
  process.stderr.write(`commit-genie: ${(err as Error).message}\n`);
  process.exit(1);
});
