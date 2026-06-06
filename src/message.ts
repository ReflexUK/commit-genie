/**
 * Clean and validate model output into a well-formed Conventional Commit
 * message. This module is responsible only for post-processing raw LLM output;
 * prompt construction lives in prompt.ts.
 */
export const CONVENTIONAL_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
] as const;

export type ConventionalType = (typeof CONVENTIONAL_TYPES)[number];

const TYPE_RE = new RegExp(
  `^(${CONVENTIONAL_TYPES.join("|")})(\\([^)]+\\))?(!)?: .+`,
);

/** Maximum recommended subject line length per Conventional Commits. */
const MAX_SUBJECT_LENGTH = 72;

/**
 * Strip code fences, surrounding quotes, and stray preamble that models love
 * to add ("Here is your commit message:"). Returns a trimmed message.
 */
export function cleanMessage(raw: string): string {
  let text = raw.trim();

  // Remove a leading ```...``` fence if the whole thing is fenced.
  const fence = text.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  if (fence) text = fence[1].trim();

  // Drop a chatty first line that isn't itself the commit subject.
  const lines = text.split("\n");
  if (
    lines.length > 1 &&
    /(here('?s| is)|commit message|sure[,!.]?)/i.test(lines[0]) &&
    !isConventional(lines[0])
  ) {
    lines.shift();
    text = lines.join("\n").trim();
  }

  // Strip wrapping quotes/backticks around a single-line message.
  text = text.replace(/^["'`]+/, "").replace(/["'`]+$/, "").trim();

  return text;
}

/** True if the subject line follows Conventional Commits. */
export function isConventional(message: string): boolean {
  const subject = message.split("\n", 1)[0];
  return TYPE_RE.test(subject);
}

/**
 * Truncate a subject line to MAX_SUBJECT_LENGTH, cutting at the last word
 * boundary to avoid splitting mid-word.
 */
export function truncateSubject(subject: string): string {
  if (subject.length <= MAX_SUBJECT_LENGTH) return subject;
  const cut = subject.slice(0, MAX_SUBJECT_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/**
 * Best-effort coercion: if the message lacks a conventional prefix, prepend
 * `chore: `. Enforces the 72-character subject line limit.
 */
export function normalize(message: string): string {
  const cleaned = cleanMessage(message);
  const [subjectLine, ...rest] = cleaned.split("\n");
  let subject = subjectLine;
  if (!isConventional(subject)) {
    subject = `chore: ${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
  }
  subject = truncateSubject(subject);
  return [subject, ...rest].join("\n").trim();
}