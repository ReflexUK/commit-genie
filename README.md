# commit-genie

[![CI](https://github.com/ReflexUK/commit-genie/actions/workflows/ci.yml/badge.svg)](https://github.com/ReflexUK/commit-genie/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/commit-genie.svg)](https://www.npmjs.com/package/commit-genie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Generate clean [Conventional Commit](https://www.conventionalcommits.org) messages from your staged diff — using whichever LLM you already have a key for.**

```console
$ git add -A
$ commit-genie
feat(auth): add refresh-token rotation

- rotate refresh tokens on every use and revoke the prior token
- add a 30-day absolute expiry as a backstop
```

No more `git commit -m "stuff"`. One command reads your staged changes and writes a properly-typed, imperative-mood message. Works with **OpenAI**, **Anthropic**, or any **OpenAI-compatible** endpoint (local models, gateways).

## Install

```bash
npm install -g commit-genie
# or: npx commit-genie
```

## Setup

Set the key for whichever provider you use — commit-genie auto-detects it:

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # uses claude-3-5-haiku by default
# or
export OPENAI_API_KEY=sk-...          # uses gpt-4o-mini by default
```

## Usage

```bash
git add -A

commit-genie                 # print a suggested message
commit-genie --commit        # generate AND create the commit
commit-genie --hint "#142"   # give the model extra context
git commit -m "$(commit-genie --print)"   # pipe it yourself
```

### Auto-fill every commit (git hook)

Install a `prepare-commit-msg` hook so a suggestion is pre-filled whenever you run a bare `git commit`:

```bash
commit-genie --install-hook
```

The hook only fires when you *don't* pass `-m`, so `git commit -m "..."`, merges, and amends are left alone. Delete `.git/hooks/prepare-commit-msg` to uninstall.

## Configuration

| Env var | Purpose | Default |
|---------|---------|---------|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Provider auto-detected from whichever is set | — |
| `COMMIT_GENIE_PROVIDER` | Force `anthropic` or `openai` | auto |
| `COMMIT_GENIE_MODEL` | Override the model | `claude-3-5-haiku-latest` / `gpt-4o-mini` |
| `COMMIT_GENIE_BASE_URL` | Point at a gateway or local endpoint | provider default |

Run a fully local model via an OpenAI-compatible server:

```bash
export OPENAI_API_KEY=sk-local
export COMMIT_GENIE_BASE_URL=http://localhost:11434/v1   # e.g. Ollama
export COMMIT_GENIE_MODEL=llama3.1
commit-genie
```

## How it works

1. Reads `git diff --cached` (lockfiles excluded) and the staged file list.
2. Truncates very large diffs at a line boundary so big changes still work.
3. Asks the model for a single Conventional Commit message.
4. Cleans the output — strips code fences, quotes, and chatty preamble — and guarantees a valid `type:` prefix.

Everything except the network call is pure and unit-tested.

## Privacy

Your staged diff is sent to the provider you configure. Point `COMMIT_GENIE_BASE_URL` at a local model if the code can't leave your machine.

## Development

```bash
npm install
npm test       # node:test, no network (LLM + git are dependency-injected)
npm run build
```

## License

[MIT](LICENSE) © ReflexUK
