/**
 * Build the prompt sent to the model.
 */
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

export function buildUserPrompt(change: StagedChange, options: PromptOptions = {}): string {
  const parts: string[] = [];
  if (change.files.length) {
    parts.push(`Files changed (${change.files.length}):\n${change.files.map((f) => `- ${f}`).join("\n")}`);
  }
  if (options.hint) {
    parts.push(`Extra context from the author: ${options.hint}`);
  }
  parts.push(`Staged diff:\n${change.diff}`);
  return parts.join("\n\n");
}
