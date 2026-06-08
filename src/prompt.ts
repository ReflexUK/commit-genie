/**
 * Build the prompt sent to the model.
 */
import { basename, dirname } from "node:path";
import type { StagedChange } from "./diff.js";

export const SYSTEM_PROMPT =
  "You are a tool that writes git commit messages. " +
  "Given a staged diff, respond with a single Conventional Commits message and nothing else. " +
  "Format: `type(optional-scope): subject`, where type is one of " +
  "feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. " +
  "Keep the subject in the imperative mood and under 72 characters. " +
  "If the change is non-trivial, add a blank line then 1-3 short bullet points explaining what and why. " +
  "Do not wrap the message in code fences or quotes. Do not add any preamble.";

export interface PromptOptions {
  /** Optional extra context from the user, e.g. an issue number. */
  hint?: string;
}

/**
 * Derive a scope suggestion from the staged file list.
 *
 * Rules (in order):
 * 1. If all files share the same immediate parent directory (and it isn't the
 *    repo root "."), use that directory name as the scope.
 * 2. If all files share a common top-level directory (e.g. "src"), use it.
 * 3. If only one file changed, use its basename without extension.
 * 4. Otherwise return undefined (let the model decide).
 */
export function detectScope(files: string[]): string | undefined {
  if (files.length === 0) return undefined;

  // Normalise to forward slashes.
  const normed = files.map((f) => f.replace(/\\/g, "/"));

  // Rule 1: all files in the same immediate parent dir.
  const parents = normed.map((f) => dirname(f));
  const uniqueParents = new Set(parents);
  if (uniqueParents.size === 1) {
    const dir = [...uniqueParents][0];
    if (dir !== "." && dir !== "") return basename(dir);
  }

  // Rule 2: all files share the same top-level segment.
  const tops = normed.map((f) => f.split("/")[0]);
  const uniqueTops = new Set(tops);
  if (uniqueTops.size === 1) {
    const top = [...uniqueTops][0];
    // Skip generic top-level dirs that aren't meaningful scopes.
    if (!["src", "lib", "dist", "test", "tests", "."].includes(top)) return top;
  }

  // Rule 3: single file changed.
  if (files.length === 1) {
    const name = basename(normed[0]).replace(/\.[^.]+$/, "");
    if (name) return name;
  }

  return undefined;
}

export function buildUserPrompt(change: StagedChange, options: PromptOptions = {}): string {
  const parts: string[] = [];

  if (change.files.length) {
    parts.push(`Files changed (${change.files.length}):\n${change.files.map((f) => `- ${f}`).join("\n")}`);
  }

  const scope = detectScope(change.files);
  if (scope) {
    parts.push(`Suggested scope: "${scope}" (based on changed file paths -- use it if appropriate)`);
  }

  if (options.hint) {
    parts.push(`Extra context from the author: ${options.hint}`);
  }

  parts.push(`Staged diff:\n${change.diff}`);
  return parts.join("\n\n");
}