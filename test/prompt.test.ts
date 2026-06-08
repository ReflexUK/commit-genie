import { test } from "node:test";
import assert from "node:assert/strict";
import { detectScope, buildUserPrompt } from "../src/prompt.ts";

test("detectScope returns undefined for empty file list", () => {
  assert.equal(detectScope([]), undefined);
});

test("detectScope uses immediate parent dir when all files share one", () => {
  assert.equal(
    detectScope(["src/auth/login.ts", "src/auth/logout.ts"]),
    "auth",
  );
});

test("detectScope uses top-level dir when parent dirs differ but top is shared and non-generic", () => {
  assert.equal(
    detectScope(["packages/core/index.ts", "packages/cli/main.ts"]),
    "packages",
  );
});

test("detectScope skips generic top-level dirs like src", () => {
  const result = detectScope(["src/a/foo.ts", "src/b/bar.ts"]);
  // tops are all "src" which is in the skip list -- no top-level scope
  assert.equal(result, undefined);
});

test("detectScope returns basename for single file", () => {
  assert.equal(detectScope(["src/utils/debounce.ts"]), "debounce");
});

test("detectScope returns undefined for mixed top-level dirs", () => {
  assert.equal(detectScope(["src/foo.ts", "docs/bar.md", "test/baz.ts"]), undefined);
});

test("buildUserPrompt includes scope hint when detectable", () => {
  const change = { files: ["src/auth/login.ts", "src/auth/token.ts"], diff: "diff", truncated: false };
  const prompt = buildUserPrompt(change);
  assert.ok(prompt.includes('Suggested scope: "auth"'));
});

test("buildUserPrompt omits scope hint when not detectable", () => {
  const change = { files: ["src/foo.ts", "docs/readme.md"], diff: "diff", truncated: false };
  const prompt = buildUserPrompt(change);
  assert.ok(!prompt.includes("Suggested scope"));
});

test("buildUserPrompt includes hint when provided", () => {
  const change = { files: [], diff: "x", truncated: false };
  const prompt = buildUserPrompt(change, { hint: "#123" });
  assert.ok(prompt.includes("Extra context from the author: #123"));
});