# Core Principles

## Command Usage

- Use `rm -f` (not `rm`) to avoid prompts

## File Management

- NEVER create files unless necessary; prefer editing existing
- NEVER proactively create docs (\*.md, README) unless requested

## Communication

- Register, response shape, and confidence marking live in the `Plain Technical` output style (`~/.claude/output-styles/plain-technical.md`), not here
- **CRITICAL**: ALWAYS use the `AskUserQuestion` tool when asking questions, soliciting feedback, or needing user input. NEVER put questions as inline text. This applies to ALL workflows including brainstorming.

## Artifacts

- Use smart quotes in every generated artifact (decks, pages, docs): ’ “ ” not ' ". Straight quotes stay only in code, markup attributes, and JSON syntax.

## Brainstorming & Planning

- Write specs, plans, and other AI scratch to `ai-swap/<task>/` when nothing else has chosen a path. A skill or config naming its own destination wins.
- Exception: a handoff (such as `mattpocock-skills:handoff`) always goes to `ai-swap/<task>/handoff.md` at the git root, or in the current directory outside a repo. This overrides a skill that says to use the OS temp directory or to avoid the workspace.
- When it is unclear whether an `ai-swap/` file will be shared with others, ask with `AskUserQuestion` before writing it. A shared file goes through `writing:draft`.

## Package Management

- Use `pnpm` over `npm` for Node.js

## Code Organization

- Public methods top, implementation details bottom

## Testing

- Test behavior; mock minimally (external services, network, slow ops) at boundaries

## Version Control

- Use `git push --force-with-lease` not `--force`
- Use conventional commits: feat:, fix:, docs:, refactor:, test:, chore:
- Use `git-filter-repo` not `git filter-branch`

## Tools

- Use `eval "$(mise env)"` to refresh PATH after installing new tools
- Use the `ast-grep` skill for structural code search - invoke via Skill tool when exploring codebases, finding patterns, or locating functions/classes. Prefer over Grep/Glob for semantic code queries.
- Use mermaid v11.17.2 syntax - nvim's markdown previewer renders that version (pinned in `~/.config/nvim/lua/plugins/markdown-preview.lua`)

## Subagents

- **Prefer subagents** for searches spanning many files, and for work that can run concurrently
- Launch independent subagents in a single message so they run in parallel

### Subagent model choice

Pick each subagent's model for its task. The ladder is Sonnet, then Opus, then Fable; choose only from these three.

- **Sonnet** — searches, doc and config lookups, file or log summaries, test runs, and edits you have fully specified. Use it from any session.
- **Session model** — implementation, code review, debugging. A Fable session sends these to Opus.
- **One step up** (Sonnet to Opus, Opus to Fable) — the hardest work in the session, such as design or a stubborn root cause, or a retry after a failed attempt. Stay at most one step above the session model.
- **Fable** — in a Fable session, reserve it for design, architecture, and calls where a wrong answer is costly.

Apply this to Agent tool spawns and to each workflow `agent()` stage; it overrides the workflow default of omitting `model`. A fork always runs on the session model, so spawn a fresh agent to change model, and fork only when the task needs the conversation so far. When the model differs from the session model, name it in the spawn description.

## Skills

- Use `utilities:date` skill for date/datetime calculations

## Python Scripts

- Inline dependencies with `uv` (PEP 723); no separate requirements.txt
- Run with `uv`: `uv run script.py`
- Executable scripts: use shebang `#!/usr/bin/env -S uv run --script` and `chmod +x`
