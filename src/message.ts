/**
 * Clean and validate model output into a well-formed Conventional Commit.
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

const TYPE_RE = new RegExp(
  `^(${CONVENTIONAL_TYPES.join("|")})(\\([^)]+\\))?(!)?: .+`,
);

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
  if (lines.length > 1 && /(here('?s| is)|commit message|sure[,!.]?)/i.test(lines[0]) && !isConventional(lines[0])) {
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
 * Best-effort coercion: if the message lacks a conventional prefix, prepend
 * `chore: `. Keeps the subject under a sane length.
 */
export function normalize(message: string): string {
  const cleaned = cleanMessage(message);
  const [subjectLine, ...rest] = cleaned.split("\n");
  let subject = subjectLine;
  if (!isConventional(subject)) {
    subject = `chore: ${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
  }
  return [subject, ...rest].join("\n").trim();
}
