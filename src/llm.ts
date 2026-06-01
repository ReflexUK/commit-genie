/**
 * Provider-agnostic LLM call. Supports Anthropic and OpenAI-compatible
 * endpoints (OpenAI, local servers, gateways). Provider is auto-detected from
 * the environment but can be forced.
 */
export type Provider = "anthropic" | "openai";

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ResolveEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  COMMIT_GENIE_PROVIDER?: string;
  COMMIT_GENIE_MODEL?: string;
  COMMIT_GENIE_BASE_URL?: string;
  ANTHROPIC_BASE_URL?: string;
  OPENAI_BASE_URL?: string;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-3-5-haiku-latest",
  openai: "gpt-4o-mini",
};

const DEFAULT_BASE_URLS: Record<Provider, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
};

/** Decide provider/model/key from env, throwing a helpful error if unset. */
export function resolveConfig(env: ResolveEnv): LlmConfig {
  const forced = env.COMMIT_GENIE_PROVIDER?.toLowerCase();
  let provider: Provider | undefined =
    forced === "anthropic" || forced === "openai" ? forced : undefined;

  if (!provider) {
    if (env.ANTHROPIC_API_KEY) provider = "anthropic";
    else if (env.OPENAI_API_KEY) provider = "openai";
  }
  if (!provider) {
    throw new Error(
      "No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY " +
        "(or COMMIT_GENIE_PROVIDER to choose).",
    );
  }

  const apiKey =
    provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`Provider "${provider}" selected but its API key is not set.`);
  }

  const baseUrl =
    env.COMMIT_GENIE_BASE_URL ??
    (provider === "anthropic" ? env.ANTHROPIC_BASE_URL : env.OPENAI_BASE_URL) ??
    DEFAULT_BASE_URLS[provider];

  return {
    provider,
    apiKey,
    model: env.COMMIT_GENIE_MODEL ?? DEFAULT_MODELS[provider],
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

export interface GenerateDeps {
  fetchImpl?: typeof fetch;
}

/** Call the model and return the raw message text. */
export async function generate(
  config: LlmConfig,
  system: string,
  user: string,
  deps: GenerateDeps = {},
): Promise<string> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (config.provider === "anthropic") {
    const res = await fetchImpl(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await readJson(res);
    return (data?.content?.[0]?.text ?? "").trim();
  }

  // OpenAI-compatible chat completions
  const res = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await readJson(res);
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LLM request failed: HTTP ${res.status} ${res.statusText}\n${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LLM returned non-JSON response:\n${text.slice(0, 500)}`);
  }
}
