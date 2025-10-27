# Core Principles

## Command Usage

- Use `rm -f` (not `rm`) to avoid prompts

## File Management

- NEVER create files unless necessary; prefer editing existing
- NEVER proactively create docs (\*.md, README) unless requested

## Communication

- Challenge assumptions, suggest alternatives
- Keep explanations concise, no flattery

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

- Use `/bin/ls` for file listing
- Prefer ast-grep for code search
- **CRITICAL: Use mermaid v10.2.3 syntax - NON-NEGOTIABLE**

## Subagents

- **STRONGLY PREFER subagents** - use for speed and efficiency
- Parallelize whenever possible
- **CRITICAL**: Check .claude/CLAUDE.md for MANDATORY subagent usage
- When docs-lookup exists: use for refactoring, UI changes, features, state

## Skills

- Use date-calculator skill for date/datetime calculations

## Python Scripts

- Inline dependencies with `uv` (PEP 723); no separate requirements.txt
- Run with `uv`: `uv run script.py`
