import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, resolveConfig } from "../src/llm.ts";

test("resolveConfig auto-detects anthropic", () => {
  const cfg = resolveConfig({ ANTHROPIC_API_KEY: "sk-ant" });
  assert.equal(cfg.provider, "anthropic");
  assert.equal(cfg.baseUrl, "https://api.anthropic.com");
  assert.ok(cfg.model.length > 0);
});

test("resolveConfig auto-detects openai", () => {
  const cfg = resolveConfig({ OPENAI_API_KEY: "sk-oai" });
  assert.equal(cfg.provider, "openai");
});

test("resolveConfig honors forced provider and overrides", () => {
  const cfg = resolveConfig({
    ANTHROPIC_API_KEY: "a",
    OPENAI_API_KEY: "b",
    COMMIT_GENIE_PROVIDER: "openai",
    COMMIT_GENIE_MODEL: "gpt-test",
    COMMIT_GENIE_BASE_URL: "http://localhost:1234/",
  });
  assert.equal(cfg.provider, "openai");
  assert.equal(cfg.model, "gpt-test");
  assert.equal(cfg.baseUrl, "http://localhost:1234");
});

test("resolveConfig throws when no key set", () => {
  assert.throws(() => resolveConfig({}), /No API key/);
});

test("generate calls anthropic endpoint and extracts text", async () => {
  let captured: { url: string; body: any } | undefined;
  const fakeFetch = (async (url: any, init: any) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: "feat: do thing" }] }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const cfg = resolveConfig({ ANTHROPIC_API_KEY: "k" });
  const out = await generate(cfg, "sys", "user", { fetchImpl: fakeFetch });
  assert.equal(out, "feat: do thing");
  assert.ok(captured!.url.endsWith("/v1/messages"));
  assert.equal(captured!.body.system, "sys");
});

test("generate calls openai endpoint and extracts text", async () => {
  const fakeFetch = (async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: "fix: patch" } }] }),
      { status: 200 },
    )) as unknown as typeof fetch;

  const cfg = resolveConfig({ OPENAI_API_KEY: "k" });
  const out = await generate(cfg, "sys", "user", { fetchImpl: fakeFetch });
  assert.equal(out, "fix: patch");
});

test("generate throws on HTTP error", async () => {
  const fakeFetch = (async () =>
    new Response("nope", { status: 401, statusText: "Unauthorized" })) as unknown as typeof fetch;
  const cfg = resolveConfig({ OPENAI_API_KEY: "k" });
  await assert.rejects(
    generate(cfg, "s", "u", { fetchImpl: fakeFetch }),
    /HTTP 401/,
  );
});
