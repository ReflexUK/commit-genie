import { test } from "node:test";
import assert from "node:assert/strict";
import { stagedFiles, truncateDiff } from "../src/diff.ts";

test("truncateDiff leaves short diffs untouched", () => {
  const res = truncateDiff("a\nb\nc", ["x.ts"], 100);
  assert.equal(res.truncated, false);
  assert.equal(res.diff, "a\nb\nc");
  assert.deepEqual(res.files, ["x.ts"]);
});

test("truncateDiff cuts long diffs at a line boundary", () => {
  const raw = "line1\nline2\nline3\nline4\n";
  const res = truncateDiff(raw, [], 8);
  assert.equal(res.truncated, true);
  assert.ok(res.diff.startsWith("line1"));
  assert.ok(res.diff.includes("truncated"));
  // should not contain a partial "line2" beyond the cut
  assert.ok(!res.diff.includes("line3"));
});

test("stagedFiles parses name-only output via injected runner", () => {
  const runner = (args: string[]) => {
    assert.deepEqual(args.slice(0, 3), ["diff", "--cached", "--name-only"]);
    return "src/a.ts\nsrc/b.ts\n\n";
  };
  assert.deepEqual(stagedFiles(runner), ["src/a.ts", "src/b.ts"]);
});
