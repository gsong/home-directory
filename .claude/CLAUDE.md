# Core Principles

## Command Usage

- Use `rm -f` (not `rm`) to avoid prompts

## File Management

- NEVER create files unless necessary; prefer editing existing
- NEVER proactively create docs (\*.md, README) unless requested

## Communication

- Register, response shape, and confidence marking live in the `Plain Technical` output style (`~/.claude/output-styles/plain-technical.md`), not here
- **CRITICAL**: ALWAYS use the `AskUserQuestion` tool when asking questions, soliciting feedback, or needing user input. NEVER put questions as inline text. This applies to ALL workflows including brainstorming.

## Brainstorming & Planning

- When brainstorming or planning, write **both the spec and the plan** to a subdirectory of `ai-swap/` named after the task (e.g. `ai-swap/add-user-auth/spec.md`, `ai-swap/add-user-auth/plan.md`)
- `ai-swap/` is gitignored and stays local. A hook blocks `git add`/`commit` of it.

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
- Use `/bin/ls` for file listing (`ls` is aliased to `eza`)
- Use the `ast-grep` skill for structural code search - invoke via Skill tool when exploring codebases, finding patterns, or locating functions/classes. Prefer over Grep/Glob for semantic code queries.
- Use mermaid v10.2.3 syntax - nvim's markdown previewer does not render later versions

## Subagents

- **Prefer subagents** for searches spanning many files, and for work that can run concurrently
- Launch independent subagents in a single message so they run in parallel

## Skills

- Use `/gs:utilities:date` skill for date/datetime calculations

## Python Scripts

- Inline dependencies with `uv` (PEP 723); no separate requirements.txt
- Run with `uv`: `uv run script.py`
- Executable scripts: use shebang `#!/usr/bin/env -S uv run --script` and `chmod +x`
