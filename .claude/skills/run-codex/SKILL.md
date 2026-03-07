---
name: run-codex
description: Use when the user asks to run Codex, use Codex CLI, get a second opinion from Codex, or delegate a task to OpenAI's Codex agent. Also use when the user invokes /run-codex.
---

# Run Codex CLI

Run OpenAI's Codex CLI in headless mode (`codex exec`) from within Claude Code.

## Process

### 1. Gather parameters

Use `AskUserQuestion` to collect:

**Model** — ask which model to use:

- `gpt-5.3-codex` — latest frontier agentic coding model (Recommended)
- `gpt-5.4` — latest frontier agentic coding model

**Reasoning effort** — ask the level:

- `low` — fast responses
- `medium` — balanced (Recommended)
- `high` — complex problem solving
- `xhigh` — maximum depth

**Sandbox mode** — ask the access level:

- `read-only` — can only read files (Recommended)
- `workspace-write` — can write to workspace
- `danger-full-access` — unrestricted (use with caution)

### 2. Get the prompt

Use `AskUserQuestion` with a free-form text field to ask what task/prompt to send to Codex. The question should mention the current working directory so the user has context.

### 3. Execute

Run via Bash:

```
codex exec -m <model> -c model_reasoning_effort="<level>" -s <sandbox> --ephemeral "<prompt>"
```

Key flags:

- `-m` sets the model
- `-s` sets sandbox policy
- `--ephemeral` prevents session persistence to disk
- The prompt should be shell-escaped properly

### 4. Interpret results

Use the `Agent` tool to analyze the Codex output in context. The subagent should:

- Read the Codex output and any files it referenced or modified
- Compare Codex's suggestions against the actual codebase
- Summarize findings: what Codex found, whether its suggestions are valid, and any caveats
- If Codex proposed code changes, evaluate correctness and highlight anything questionable

This gives the user a synthesized view rather than raw output.
