import { test } from "node:test";
import assert from "node:assert/strict";
import { hookScript, HOOK_MARKER } from "../src/hook.ts";

test("hookScript is a valid sh script with markers", () => {
  const s = hookScript();
  assert.ok(s.startsWith("#!/bin/sh"));
  assert.ok(s.includes(HOOK_MARKER));
  assert.ok(s.includes("commit-genie --print"));
  // Only generates when no commit source was supplied.
  assert.ok(s.includes('if [ -z "$COMMIT_SOURCE" ]'));
});
