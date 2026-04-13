# Core Principles

## Command Usage

- Use `rm -f` (not `rm`) to avoid prompts
- Disable sandbox (`dangerouslyDisableSandbox: true`) for `git` and `gh` commands

## File Management

- NEVER create files unless necessary; prefer editing existing
- NEVER proactively create docs (\*.md, README) unless requested

## Communication

- Challenge assumptions, suggest alternatives
- Keep explanations concise, no flattery
- **CRITICAL**: ALWAYS use the `AskUserQuestion` tool when asking questions, soliciting feedback, or needing user input. NEVER put questions as inline text. This applies to ALL workflows including brainstorming.

## Brainstorming & Planning

- When using the superpowers brainstorming skill, write **both the spec and the plan** to an appropriately named subdirectory under `ai-swap/` (e.g., `ai-swap/add-user-auth/spec.md`, `ai-swap/add-user-auth/plan.md`). Name the subdirectory after the specific task being brainstormed.
- **CRITICAL**: NEVER commit `ai-swap/` to git. It is gitignored and must stay local only.

## Code Reviews

- **CRITICAL**: NEVER post PR comments (via `gh` or any other tool) unless explicitly instructed to do so. Review output should stay local in the conversation.

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

- Use `/opt/homebrew/bin/mise` for mise commands (`/opt/homebrew/bin` is not on the Bash tool PATH). Use `eval "$(/opt/homebrew/bin/mise env)"` to refresh PATH after installing new tools.
- Use `/bin/ls` for file listing
- **CRITICAL: Use `ast-grep` skill for structural code search** - invoke via Skill tool when exploring codebases, finding patterns, locating functions/classes, or understanding code structure. Prefer over Grep/Glob for semantic code queries.
- **CRITICAL: Use mermaid v10.2.3 syntax - NON-NEGOTIABLE**

## Subagents

- **STRONGLY PREFER subagents** - use for speed and efficiency
- Parallelize whenever possible
- **CRITICAL**: Check .claude/CLAUDE.md for MANDATORY subagent usage
- When docs-lookup skill exists: use before code changes (hook auto-prompts this)

## Skills

- Use `/gs:utilities:date` skill for date/datetime calculations

## Python Scripts

- Inline dependencies with `uv` (PEP 723); no separate requirements.txt
- Run with `uv`: `uv run script.py`
- Executable scripts: use shebang `#!/usr/bin/env -S uv run --script` and `chmod +x`
