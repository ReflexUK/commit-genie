import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanMessage,
  isConventional,
  normalize,
  truncateSubject,
} from "../src/message.ts";

test("isConventional accepts valid subjects", () => {
  assert.ok(isConventional("feat: add login"));
  assert.ok(isConventional("fix(api): handle null user"));
  assert.ok(isConventional("refactor(core)!: drop legacy path"));
  assert.ok(isConventional("feat: x\n\n- detail"));
});

test("isConventional rejects invalid subjects", () => {
  assert.equal(isConventional("added a thing"), false);
  assert.equal(isConventional("Feat: capitalized type"), false);
  assert.equal(isConventional("feat add login"), false);
});

test("cleanMessage strips code fences", () => {
  const raw = "```\nfeat: add login\n```";
  assert.equal(cleanMessage(raw), "feat: add login");
});

test("cleanMessage drops chatty preamble", () => {
  const raw = "Here is your commit message:\nfix: correct typo";
  assert.equal(cleanMessage(raw), "fix: correct typo");
});

test("cleanMessage strips wrapping quotes", () => {
  assert.equal(cleanMessage('"feat: add login"'), "feat: add login");
});

test("cleanMessage keeps a valid first line that looks chatty-ish", () => {
  const raw = "fix: ensure sure path is created";
  assert.equal(cleanMessage(raw), "fix: ensure sure path is created");
});

test("normalize prefixes non-conventional messages with chore:", () => {
  assert.equal(normalize("Update the readme"), "chore: update the readme");
});

test("normalize leaves valid messages untouched", () => {
  const msg = "feat(auth): add OAuth login\n\n- wire up provider";
  assert.equal(normalize(msg), msg);
});

test("truncateSubject leaves short subjects unchanged", () => {
  const s = "feat: add login button";
  assert.equal(truncateSubject(s), s);
});

test("truncateSubject cuts at word boundary within 72 chars", () => {
  const long = "feat: " + "a".repeat(30) + " " + "b".repeat(30);
  const result = truncateSubject(long);
  assert.ok(result.length <= 72, `expected <= 72, got ${result.length}`);
  assert.ok(!result.endsWith(" "), "should not end with a space");
});

test("truncateSubject cuts hard if no word boundary available", () => {
  const noSpaces = "feat:" + "x".repeat(80);
  const result = truncateSubject(noSpaces);
  assert.ok(result.length <= 72);
});

test("normalize enforces 72-char limit on subject lines", () => {
  const longSubject = "feat: " + "word ".repeat(20).trimEnd();
  const result = normalize(longSubject);
  const subject = result.split("\n")[0];
  assert.ok(subject.length <= 72, `subject too long: ${subject.length}`);
});