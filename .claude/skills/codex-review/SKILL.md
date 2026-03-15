---
name: codex-review
description: Code review a pull request using parallel Codex agents. Use when the user asks for a Codex code review, wants a GPT-based review, or invokes /codex-review.
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(codex exec:*), Bash(git log:*), Bash(git blame:*), Bash(git rev-parse:*)
disable-model-invocation: false
---

# Codex Code Review

Review a pull request using OpenAI's Codex CLI via parallel agents.

## Arguments

- **Required:** PR number (first positional argument)
- **Optional flags:**
  - `--model <model>` — Codex model (default: `gpt-5.4`)
  - `--effort <level>` — Reasoning effort: low, medium, high, xhigh (default: `medium`)
  - `--threshold <number>` — Confidence display threshold tier boundaries (default: 80/50)

## Process

Follow these steps precisely:

### Step 1: Eligibility Check

Use a Haiku agent to check if the pull request:

- Is closed — if so, stop
- Is trivial (< 5 lines changed) — if so, stop
- Already has a Codex review comment from a previous run (look for "Generated with Codex Review" in comments) — if so, stop

Drafts ARE allowed. Proceed with drafts.

### Step 2: CLAUDE.md Discovery

Use a Haiku agent to find:

- The root CLAUDE.md file (if one exists)
- Any CLAUDE.md files in directories whose files the PR modified

Return the file paths (not contents) of all discovered CLAUDE.md files.

### Step 3: PR Summary

Use a Haiku agent to:

- Run `gh pr view <number>` for PR metadata
- Run `gh pr diff <number>` for the full diff
- Return a concise summary of the change

### Step 4: Parallel Codex Review

Launch 5 parallel agents (using the Agent tool). Each agent:

1. Gathers the context it needs (diff, CLAUDE.md contents, git history, etc.)
2. Constructs a specialized review prompt
3. Runs: `codex exec -m <model> -c model_reasoning_effort="<effort>" -s read-only --ephemeral "<prompt>"`
4. Parses the Codex output into structured findings: `{file, line_range, category, description}`
5. Returns the structured findings

**Agent prompts must include:**

```
You are reviewing PR #<number> in <repo>.

## Your Role
<agent-specific role below>

## PR Summary
<from Step 3>

## CLAUDE.md Rules
<from Step 2 — include full contents of discovered CLAUDE.md files, or "None found">

## PR Diff
<full diff from gh pr diff>

## Instructions
- Only flag issues in user-modified lines
- For each issue, return on its own line: FILE: <path> | LINES: <start>-<end> | CATEGORY: <category> | DESCRIPTION: <description>
- Do NOT flag: pre-existing issues, linter-catchable issues, pedantic nitpicks, formatting issues, type errors, import issues
- Do NOT flag general code quality issues unless explicitly required in CLAUDE.md
- Do NOT flag changes in functionality that are likely intentional
- If no issues found, say "No issues found"
```

**The 5 agent roles:**

- **Agent #1 — CLAUDE.md Compliance:** "Audit the changes for compliance with the CLAUDE.md rules. Only flag violations that are specifically and directly called out in CLAUDE.md. CLAUDE.md is guidance for Claude writing code, so not all instructions apply during review."
- **Agent #2 — Shallow Bug Scan:** "Read the file changes and do a shallow scan for obvious bugs. Focus ONLY on the diff, do not read extra context. Focus on large bugs, avoid small issues and nitpicks. Ignore likely false positives."
- **Agent #3 — Git History Context:** "You are given git blame and git log output for the modified files. Identify any bugs in the PR changes in light of that historical context — reverted patterns, repeated mistakes, etc." (The agent must run `git log` and `git blame` on affected files before constructing the Codex prompt.)
- **Agent #4 — Previous PR Comments:** "You are given comments from previous PRs that touched these files. Check if any feedback from those PRs also applies to the current changes." (The agent must run `gh pr list` to find previous PRs on affected files and fetch their comments.)
- **Agent #5 — Code Comments Compliance:** "Read code comments in the modified files and make sure the PR changes comply with any guidance in those comments. Flag cases where comments are now stale or inaccurate due to the changes."

### Step 5: Confidence Scoring

For each issue found in Step 4, launch a parallel Haiku agent that:

- Takes the PR diff, the issue description, and the list of CLAUDE.md files (with contents)
- Returns a confidence score 0-100

Give each scoring agent this rubric verbatim:

> Score each issue on a scale from 0-100:
>
> - **0:** Not confident at all. False positive that doesn't stand up to light scrutiny, or a pre-existing issue.
> - **25:** Somewhat confident. Might be real, but may be a false positive. If stylistic, not explicitly called out in CLAUDE.md.
> - **50:** Moderately confident. Verified as real, but might be a nitpick or rare in practice. Not very important relative to the rest of the PR.
> - **75:** Highly confident. Double-checked and very likely a real issue that will be hit in practice. The existing approach is insufficient. Directly impacts functionality or is directly mentioned in CLAUDE.md.
> - **100:** Absolutely certain. Confirmed real, will happen frequently. Evidence directly confirms this.
>
> For issues flagged due to CLAUDE.md, double-check that CLAUDE.md actually calls out the issue specifically.

### Step 6: Output Results

**Terminal output:**

Display results grouped by confidence tier:

```
## Codex Code Review — PR #<number>

### Summary
<PR summary from Step 3>

### Issues Found (N total)

**High Confidence (80+)**

1. [<category>] <file>:<lines> — <description> (confidence: <score>)

**Medium Confidence (50-79)**

2. [<category>] <file>:<lines> — <description> (confidence: <score>)

**Low Confidence (<50)**

3. [<category>] <file>:<lines> — <description> (confidence: <score>)

### No Issues From
- <list agents that found nothing>
```

If no issues found at all:

```
## Codex Code Review — PR #<number>

No issues found. Checked for bugs and CLAUDE.md compliance using Codex.
```

**Markdown report:**

Write the same content to `ai-swap/codex-review-pr-<number>.md` using the Write tool. Create the `ai-swap/` directory if it doesn't exist.

## Notes

- Use `gh` to interact with GitHub, not web fetch
- Do not check build signal or attempt to build/typecheck
- All Codex invocations use `--ephemeral` to avoid persisting sessions
- All Codex invocations use `-s read-only` sandbox mode
- Shell-escape prompts properly when passing to `codex exec`
- Make a todo list first to track progress through the steps

## False Positives Guide

Share this with all review and scoring agents:

- Pre-existing issues not introduced in this PR
- Something that looks like a bug but is not
- Pedantic nitpicks a senior engineer wouldn't call out
- Issues a linter, typechecker, or compiler would catch
- General code quality issues, unless explicitly required in CLAUDE.md
- Issues called out in CLAUDE.md but silenced in code (e.g. lint ignore comments)
- Changes in functionality that are likely intentional
- Real issues on lines the user did not modify
